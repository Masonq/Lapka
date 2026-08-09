def test_create_sell_listing(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/marketplace",
        json={"type": "sell", "title": "Клетка для кота", "price": 3000, "category": "аксессуары"},
        headers=headers,
    )
    assert r.status_code == 200
    listing = r.json()
    assert listing["title"] == "Клетка для кота"
    assert listing["price"] == 3000
    assert listing["is_sold"] is False


def test_sell_without_price_rejected(client, register_user):
    headers = register_user()
    r = client.post("/api/marketplace", json={"type": "sell", "title": "Тест"}, headers=headers)
    assert r.status_code == 400


def test_wanted_and_give_away_do_not_require_price(client, register_user):
    headers = register_user()
    r = client.post("/api/marketplace", json={"type": "wanted", "title": "Ищу переноску"}, headers=headers)
    assert r.status_code == 200

    r = client.post("/api/marketplace", json={"type": "give_away", "title": "Отдам корм"}, headers=headers)
    assert r.status_code == 200


def test_unknown_listing_type_rejected(client, register_user):
    headers = register_user()
    r = client.post("/api/marketplace", json={"type": "auction", "title": "Тест"}, headers=headers)
    assert r.status_code == 400


def test_create_listing_requires_auth(client):
    r = client.post("/api/marketplace", json={"type": "wanted", "title": "Тест"})
    assert r.status_code == 401


def test_listing_rate_limit(client, register_user):
    headers = register_user()
    statuses = []
    for i in range(11):
        r = client.post("/api/marketplace", json={"type": "wanted", "title": f"Объявление {i}"}, headers=headers)
        statuses.append(r.status_code)
    assert statuses.count(429) == 1
    assert statuses[-1] == 429


def test_list_listings_hides_sold_by_default(client, register_user):
    headers = register_user()
    listing = client.post(
        "/api/marketplace", json={"type": "sell", "title": "Проданное", "price": 100}, headers=headers
    ).json()
    client.patch(f"/api/marketplace/{listing['id']}/mark-sold", headers=headers)

    r = client.get("/api/marketplace")
    assert r.json() == []

    r = client.get("/api/marketplace", params={"include_sold": True})
    assert len(r.json()) == 1


def test_list_listings_filter_by_type_category_city(client, register_user):
    headers = register_user()
    client.post(
        "/api/marketplace",
        json={"type": "sell", "title": "Корм премиум", "price": 500, "category": "корм", "city": "Белград"},
        headers=headers,
    )
    client.post(
        "/api/marketplace",
        json={"type": "wanted", "title": "Ищу игрушку", "category": "игрушки", "city": "Нови-Сад"},
        headers=headers,
    )

    r = client.get("/api/marketplace", params={"type": "sell"})
    assert [l["title"] for l in r.json()] == ["Корм премиум"]

    r = client.get("/api/marketplace", params={"category": "игрушки"})
    assert [l["title"] for l in r.json()] == ["Ищу игрушку"]

    r = client.get("/api/marketplace", params={"city": "Белград"})
    assert [l["title"] for l in r.json()] == ["Корм премиум"]


def test_list_listings_search(client, register_user):
    headers = register_user()
    client.post("/api/marketplace", json={"type": "sell", "title": "Поводок кожаный", "price": 1500}, headers=headers)
    client.post("/api/marketplace", json={"type": "sell", "title": "Миска керамическая", "price": 800}, headers=headers)

    r = client.get("/api/marketplace", params={"q": "поводок"})
    assert [l["title"] for l in r.json()] == ["Поводок кожаный"]


def test_mark_sold_only_by_seller(client, register_user):
    headers_seller = register_user()
    headers_other = register_user()
    listing = client.post(
        "/api/marketplace", json={"type": "sell", "title": "Тест", "price": 100}, headers=headers_seller
    ).json()

    r = client.patch(f"/api/marketplace/{listing['id']}/mark-sold", headers=headers_other)
    assert r.status_code == 403

    r = client.patch(f"/api/marketplace/{listing['id']}/mark-sold", headers=headers_seller)
    assert r.status_code == 200
    assert r.json()["is_sold"] is True


def test_delete_listing_only_by_seller(client, register_user):
    headers_seller = register_user()
    headers_other = register_user()
    listing = client.post(
        "/api/marketplace", json={"type": "give_away", "title": "Тест"}, headers=headers_seller
    ).json()

    r = client.delete(f"/api/marketplace/{listing['id']}", headers=headers_other)
    assert r.status_code == 403

    r = client.delete(f"/api/marketplace/{listing['id']}", headers=headers_seller)
    assert r.status_code == 200

    r = client.get(f"/api/marketplace/{listing['id']}")
    assert r.status_code == 404


def test_save_and_unsave_listing(client, register_user):
    headers_seller = register_user()
    headers_buyer = register_user()
    listing = client.post(
        "/api/marketplace", json={"type": "sell", "title": "Тест", "price": 100}, headers=headers_seller
    ).json()

    r = client.post(f"/api/marketplace/{listing['id']}/save", headers=headers_buyer)
    assert r.status_code == 200

    r = client.get(f"/api/marketplace/{listing['id']}", headers=headers_buyer)
    assert r.json()["is_saved"] is True

    r = client.get("/api/marketplace/saved", headers=headers_buyer)
    assert len(r.json()) == 1

    r = client.delete(f"/api/marketplace/{listing['id']}/save", headers=headers_buyer)
    assert r.status_code == 200

    r = client.get("/api/marketplace/saved", headers=headers_buyer)
    assert r.json() == []


def test_save_twice_does_not_duplicate(client, register_user):
    headers_seller = register_user()
    headers_buyer = register_user()
    listing = client.post(
        "/api/marketplace", json={"type": "sell", "title": "Тест", "price": 100}, headers=headers_seller
    ).json()

    client.post(f"/api/marketplace/{listing['id']}/save", headers=headers_buyer)
    client.post(f"/api/marketplace/{listing['id']}/save", headers=headers_buyer)

    r = client.get("/api/marketplace/saved", headers=headers_buyer)
    assert len(r.json()) == 1


def test_get_nonexistent_listing_404(client):
    r = client.get("/api/marketplace/does-not-exist")
    assert r.status_code == 404


def test_save_nonexistent_listing_404(client, register_user):
    headers = register_user()
    r = client.post("/api/marketplace/does-not-exist/save", headers=headers)
    assert r.status_code == 404


def test_report_listing(client, register_user):
    headers_seller = register_user()
    headers_reporter = register_user()
    listing = client.post(
        "/api/marketplace", json={"type": "sell", "title": "Подозрительное", "price": 1}, headers=headers_seller
    ).json()

    r = client.post(f"/api/marketplace/{listing['id']}/report", json={"reason": "Похоже на мошенничество"}, headers=headers_reporter)
    assert r.status_code == 200


def test_report_nonexistent_listing_404(client, register_user):
    headers = register_user()
    r = client.post("/api/marketplace/does-not-exist/report", json={"reason": "тест"}, headers=headers)
    assert r.status_code == 404


def test_report_listing_requires_auth(client, register_user):
    headers_seller = register_user()
    listing = client.post(
        "/api/marketplace", json={"type": "sell", "title": "Тест", "price": 100}, headers=headers_seller
    ).json()
    r = client.post(f"/api/marketplace/{listing['id']}/report", json={"reason": "тест"})
    assert r.status_code == 401


def test_admin_sees_listing_reports_in_queue(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    headers_seller = register_user()
    headers_reporter = register_user()
    listing = client.post(
        "/api/marketplace", json={"type": "sell", "title": "Подозрительное объявление", "price": 1}, headers=headers_seller
    ).json()
    client.post(f"/api/marketplace/{listing['id']}/report", json={"reason": "Спам"}, headers=headers_reporter)

    r = client.get("/api/admin/reports", headers=headers_admin)
    assert r.status_code == 200
    reports = r.json()
    assert len(reports) == 1
    assert reports[0]["reason"] == "Спам"
    assert reports[0]["listing"]["title"] == "Подозрительное объявление"
    assert reports[0]["post"] is None


def test_admin_can_delete_any_listing(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    headers_seller = register_user()
    listing = client.post(
        "/api/marketplace", json={"type": "sell", "title": "Плохое объявление", "price": 1}, headers=headers_seller
    ).json()

    r = client.delete(f"/api/admin/listings/{listing['id']}", headers=headers_admin)
    assert r.status_code == 200

    r = client.get(f"/api/marketplace/{listing['id']}")
    assert r.status_code == 404


def test_ordinary_user_cannot_delete_listing_via_admin_endpoint(client, register_user):
    headers_stranger = register_user()
    headers_seller = register_user()
    listing = client.post(
        "/api/marketplace", json={"type": "sell", "title": "Тест", "price": 100}, headers=headers_seller
    ).json()

    r = client.delete(f"/api/admin/listings/{listing['id']}", headers=headers_stranger)
    assert r.status_code == 403


def test_deleting_listing_resolves_its_open_reports(client, register_user, register_admin):
    headers_admin, _ = register_admin()
    headers_seller = register_user()
    headers_reporter = register_user()
    listing = client.post(
        "/api/marketplace", json={"type": "sell", "title": "Тест", "price": 1}, headers=headers_seller
    ).json()
    client.post(f"/api/marketplace/{listing['id']}/report", json={}, headers=headers_reporter)

    client.delete(f"/api/admin/listings/{listing['id']}", headers=headers_admin)

    r = client.get("/api/admin/reports", headers=headers_admin)
    reports = r.json()
    assert len(reports) == 1
    assert reports[0]["is_resolved"] is True
    assert reports[0]["listing"] is None  # объявление удалено, но жалоба осталась для журнала
