def test_prerender_post_contains_real_content(client, register_user):
    headers = register_user("Автор")
    post = client.post(
        "/api/posts", json={"type": "lost", "title": "Пропала Бела", "body": "Белая собака"}, headers=headers
    ).json()

    r = client.get(f"/api/prerender/posts/{post['id']}")
    assert r.status_code == 200
    assert "Пропала Бела" in r.text
    assert "Белая собака" in r.text
    assert "og:title" in r.text
    assert "og:image" in r.text


def test_prerender_post_escapes_xss(client, register_user):
    headers = register_user("Автор")
    post = client.post(
        "/api/posts",
        json={"type": "general", "title": "<script>alert(1)</script>", "body": 'Текст с "кавычками" & <b>тегами</b>'},
        headers=headers,
    ).json()

    r = client.get(f"/api/prerender/posts/{post['id']}")
    assert "<script>alert(1)</script>" not in r.text
    assert "&lt;script&gt;" in r.text
    assert "&quot;кавычками&quot;" in r.text
    assert "&amp;" in r.text


def test_prerender_post_not_found(client):
    r = client.get("/api/prerender/posts/does-not-exist")
    assert r.status_code == 404


def test_prerender_listing_contains_real_content(client, register_user):
    headers = register_user("Продавец")
    listing = client.post(
        "/api/marketplace", json={"type": "sell", "title": "Клетка для кошки", "price": 1500}, headers=headers
    ).json()

    r = client.get(f"/api/prerender/marketplace/{listing['id']}")
    assert r.status_code == 200
    assert "Клетка для кошки" in r.text
    assert "1500" in r.text


def test_prerender_listing_escapes_xss(client, register_user):
    headers = register_user("Продавец")
    listing = client.post(
        "/api/marketplace",
        json={"type": "sell", "title": "<script>alert(1)</script>", "price": 100},
        headers=headers,
    ).json()

    r = client.get(f"/api/prerender/marketplace/{listing['id']}")
    assert "<script>alert(1)</script>" not in r.text


def test_prerender_listing_not_found(client):
    r = client.get("/api/prerender/marketplace/does-not-exist")
    assert r.status_code == 404


def test_prerender_event_contains_real_content(client, register_user):
    headers = register_user("Организатор")
    event = client.post(
        "/api/events",
        json={"type": "walk", "title": "Прогулка в парке", "starts_at": "2026-09-01T10:00:00Z", "location": "Ташмайдан"},
        headers=headers,
    ).json()

    r = client.get(f"/api/prerender/events/{event['id']}")
    assert r.status_code == 200
    assert "Прогулка в парке" in r.text
    assert "Ташмайдан" in r.text


def test_prerender_event_not_found(client):
    r = client.get("/api/prerender/events/does-not-exist")
    assert r.status_code == 404


def test_prerender_home_lists_posts(client, register_user):
    headers = register_user("Автор")
    client.post("/api/posts", json={"type": "general", "title": "Уникальный Заголовок Теста", "body": "Тело"}, headers=headers)

    r = client.get("/api/prerender")
    assert r.status_code == 200
    assert "Уникальный Заголовок Теста" in r.text


def test_prerender_endpoints_are_public(client):
    """Пререндер для ботов не должен требовать авторизации вообще."""
    r = client.get("/api/prerender")
    assert r.status_code == 200
