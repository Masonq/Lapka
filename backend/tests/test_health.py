def test_add_and_list_health_record(client, register_user):
    headers = register_user()
    pet = client.post("/api/pets", json={"name": "Бела", "species": "Собака"}, headers=headers).json()

    r = client.post(
        f"/api/pets/{pet['id']}/health",
        json={"category": "vaccination", "title": "Rabies", "date": "2026-03-01T00:00:00Z", "next_due_date": "2027-03-01T00:00:00Z"},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["title"] == "Rabies"

    r = client.get(f"/api/pets/{pet['id']}/health", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_health_records_private_to_owner(client, register_user):
    headers_owner = register_user()
    headers_stranger = register_user()
    pet = client.post("/api/pets", json={"name": "Бела", "species": "Собака"}, headers=headers_owner).json()
    client.post(
        f"/api/pets/{pet['id']}/health",
        json={"category": "weight", "title": "Взвешивание", "value": 12.5, "date": "2026-03-01T00:00:00Z"},
        headers=headers_owner,
    )

    r = client.get(f"/api/pets/{pet['id']}/health", headers=headers_stranger)
    assert r.status_code == 403


def test_health_requires_auth(client, register_user):
    headers = register_user()
    pet = client.post("/api/pets", json={"name": "Бела", "species": "Собака"}, headers=headers).json()
    r = client.get(f"/api/pets/{pet['id']}/health")
    assert r.status_code == 401


def test_health_record_unknown_category_rejected(client, register_user):
    headers = register_user()
    pet = client.post("/api/pets", json={"name": "Бела", "species": "Собака"}, headers=headers).json()
    r = client.post(
        f"/api/pets/{pet['id']}/health",
        json={"category": "surgery", "title": "Тест", "date": "2026-03-01T00:00:00Z"},
        headers=headers,
    )
    assert r.status_code == 400


def test_health_for_nonexistent_pet_404(client, register_user):
    headers = register_user()
    r = client.get("/api/pets/does-not-exist/health", headers=headers)
    assert r.status_code == 404


def test_delete_health_record(client, register_user):
    headers = register_user()
    pet = client.post("/api/pets", json={"name": "Бела", "species": "Собака"}, headers=headers).json()
    record = client.post(
        f"/api/pets/{pet['id']}/health",
        json={"category": "medication", "title": "Витамины", "date": "2026-03-01T00:00:00Z"},
        headers=headers,
    ).json()

    r = client.delete(f"/api/pets/{pet['id']}/health/{record['id']}", headers=headers)
    assert r.status_code == 200

    r = client.get(f"/api/pets/{pet['id']}/health", headers=headers)
    assert r.json() == []


def test_delete_health_record_only_by_owner(client, register_user):
    headers_owner = register_user()
    headers_stranger = register_user()
    pet = client.post("/api/pets", json={"name": "Бела", "species": "Собака"}, headers=headers_owner).json()
    record = client.post(
        f"/api/pets/{pet['id']}/health",
        json={"category": "vaccination", "title": "Rabies", "date": "2026-03-01T00:00:00Z"},
        headers=headers_owner,
    ).json()

    r = client.delete(f"/api/pets/{pet['id']}/health/{record['id']}", headers=headers_stranger)
    assert r.status_code == 403


def test_health_record_rate_limit(client, register_user):
    headers = register_user()
    pet = client.post("/api/pets", json={"name": "Бела", "species": "Собака"}, headers=headers).json()

    statuses = []
    for i in range(21):
        r = client.post(
            f"/api/pets/{pet['id']}/health",
            json={"category": "weight", "title": f"Взвешивание {i}", "value": 12.0, "date": "2026-03-01T00:00:00Z"},
            headers=headers,
        )
        statuses.append(r.status_code)
    assert statuses.count(429) == 1
    assert statuses[-1] == 429


def test_health_records_sorted_newest_first(client, register_user):
    headers = register_user()
    pet = client.post("/api/pets", json={"name": "Бела", "species": "Собака"}, headers=headers).json()

    client.post(
        f"/api/pets/{pet['id']}/health",
        json={"category": "weight", "title": "Январь", "value": 10.0, "date": "2026-01-01T00:00:00Z"},
        headers=headers,
    )
    client.post(
        f"/api/pets/{pet['id']}/health",
        json={"category": "weight", "title": "Март", "value": 11.0, "date": "2026-03-01T00:00:00Z"},
        headers=headers,
    )

    r = client.get(f"/api/pets/{pet['id']}/health", headers=headers)
    titles = [rec["title"] for rec in r.json()]
    assert titles == ["Март", "Январь"]


def test_health_owner_only_error_translated_to_serbian(client, register_user):
    headers_owner = register_user("Владелец")
    headers_other = register_user("Другой")
    pet = client.post("/api/pets", json={"name": "Рекс", "species": "Собака"}, headers=headers_owner).json()

    r = client.get(f"/api/pets/{pet['id']}/health", headers={**headers_other, "X-Lang": "sr"})
    assert r.status_code == 403
    assert r.json()["detail"] == "Zdravlje ljubimca vidi samo vlasnik"
