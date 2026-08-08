def test_create_and_list_own_pets(client, register_user):
    headers = register_user()
    r = client.post(
        "/api/pets",
        json={"name": "Бела", "species": "Собака", "breed": "Вест-хайленд-терьер", "age_years": 3},
        headers=headers,
    )
    assert r.status_code == 200

    r = client.get("/api/pets/mine", headers=headers)
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "Бела"


def test_blank_pet_name_rejected(client, register_user):
    headers = register_user()
    r = client.post("/api/pets", json={"name": "   ", "species": "Собака"}, headers=headers)
    assert r.status_code == 400


def test_pets_are_private_per_owner(client, register_user):
    headers_a = register_user()
    headers_b = register_user()

    client.post("/api/pets", json={"name": "Бела", "species": "Собака"}, headers=headers_a)

    r = client.get("/api/pets/mine", headers=headers_b)
    assert r.json() == []


def test_delete_pet_only_by_owner(client, register_user):
    headers_owner = register_user()
    headers_other = register_user()

    pet = client.post("/api/pets", json={"name": "Мурка", "species": "Кошка"}, headers=headers_owner).json()

    r = client.delete(f"/api/pets/{pet['id']}", headers=headers_other)
    assert r.status_code == 403

    r = client.delete(f"/api/pets/{pet['id']}", headers=headers_owner)
    assert r.status_code == 200


def test_pet_rate_limit(client, register_user):
    headers = register_user()
    statuses = []
    for i in range(11):
        r = client.post("/api/pets", json={"name": f"Питомец {i}", "species": "Собака"}, headers=headers)
        statuses.append(r.status_code)

    assert statuses.count(429) == 1
    assert statuses[-1] == 429
