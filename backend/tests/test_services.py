def test_become_provider_and_list(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/services",
        json={"service_type": "sitter", "description": "Выгул собак в Дорчоле", "price_from": 800},
        headers=headers,
    )
    assert r.status_code == 200

    r = client.get("/api/services")
    assert len(r.json()) == 1
    assert r.json()[0]["service_type"] == "sitter"


def test_cannot_become_provider_twice(client, register_user):
    headers = register_user()
    payload = {"service_type": "sitter", "description": "Выгул собак"}
    client.post("/api/services", json=payload, headers=headers)
    r = client.post("/api/services", json=payload, headers=headers)
    assert r.status_code == 400


def test_cannot_review_self(client, register_user):
    headers = register_user()
    provider = client.post(
        "/api/services", json={"service_type": "vet", "description": "Ветеринар"}, headers=headers
    ).json()

    r = client.post(f"/api/services/{provider['id']}/reviews", json={"rating": 5}, headers=headers)
    assert r.status_code == 400


def test_cannot_review_same_provider_twice(client, register_user):
    headers_provider = register_user()
    headers_reviewer = register_user()

    provider = client.post(
        "/api/services", json={"service_type": "trainer", "description": "Кинолог"}, headers=headers_provider
    ).json()

    r1 = client.post(f"/api/services/{provider['id']}/reviews", json={"rating": 5}, headers=headers_reviewer)
    assert r1.status_code == 200

    r2 = client.post(f"/api/services/{provider['id']}/reviews", json={"rating": 1}, headers=headers_reviewer)
    assert r2.status_code == 400


def test_rating_average_computed_correctly(client, register_user):
    headers_provider = register_user()
    provider = client.post(
        "/api/services", json={"service_type": "groomer", "description": "Грумер"}, headers=headers_provider
    ).json()

    for rating in (5, 3):
        headers_reviewer = register_user()
        client.post(f"/api/services/{provider['id']}/reviews", json={"rating": rating}, headers=headers_reviewer)

    r = client.get("/api/services")
    updated = next(p for p in r.json() if p["id"] == provider["id"])
    assert updated["rating_count"] == 2
    assert updated["rating_avg"] == 4.0
