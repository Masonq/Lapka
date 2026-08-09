def test_block_and_unblock_user(client, register_user_with_id):
    headers_a, id_a = register_user_with_id()
    headers_b, id_b = register_user_with_id()

    r = client.post(f"/api/blocks/{id_b}", headers=headers_a)
    assert r.status_code == 200

    r = client.get("/api/blocks", headers=headers_a)
    assert r.status_code == 200
    blocked = r.json()
    assert len(blocked) == 1
    assert blocked[0]["user"]["id"] == id_b

    r = client.delete(f"/api/blocks/{id_b}", headers=headers_a)
    assert r.status_code == 200

    r = client.get("/api/blocks", headers=headers_a)
    assert r.json() == []


def test_cannot_block_self(client, register_user_with_id):
    headers, own_id = register_user_with_id()
    r = client.post(f"/api/blocks/{own_id}", headers=headers)
    assert r.status_code == 400


def test_block_nonexistent_user_404(client, register_user):
    headers = register_user()
    r = client.post("/api/blocks/does-not-exist", headers=headers)
    assert r.status_code == 404


def test_block_requires_auth(client, register_user_with_id):
    _, user_id = register_user_with_id()
    r = client.post(f"/api/blocks/{user_id}")
    assert r.status_code == 401


def test_block_twice_does_not_duplicate(client, register_user_with_id):
    headers_a, id_a = register_user_with_id()
    headers_b, id_b = register_user_with_id()

    client.post(f"/api/blocks/{id_b}", headers=headers_a)
    client.post(f"/api/blocks/{id_b}", headers=headers_a)

    r = client.get("/api/blocks", headers=headers_a)
    assert len(r.json()) == 1


def test_blocked_user_cannot_message_blocker(client, register_user_with_id):
    headers_a, id_a = register_user_with_id()
    headers_b, id_b = register_user_with_id()

    client.post(f"/api/blocks/{id_b}", headers=headers_a)

    r = client.post(f"/api/messages/{id_a}", json={"body": "Привет"}, headers=headers_b)
    assert r.status_code == 403


def test_blocker_cannot_message_blocked_either(client, register_user_with_id):
    """Блокировка должна работать в обе стороны — не должно получиться случайно
    написать тому, кого сам заблокировал."""
    headers_a, id_a = register_user_with_id()
    headers_b, id_b = register_user_with_id()

    client.post(f"/api/blocks/{id_b}", headers=headers_a)

    r = client.post(f"/api/messages/{id_b}", json={"body": "Привет"}, headers=headers_a)
    assert r.status_code == 403


def test_messaging_works_normally_without_block(client, register_user_with_id):
    headers_a, id_a = register_user_with_id()
    headers_b, id_b = register_user_with_id()

    r = client.post(f"/api/messages/{id_b}", json={"body": "Привет"}, headers=headers_a)
    assert r.status_code == 200


def test_block_removes_existing_follow_relationship(client, register_user_with_id):
    headers_a, id_a = register_user_with_id()
    headers_b, id_b = register_user_with_id()

    client.post(f"/api/follows/{id_b}", headers=headers_a)
    r = client.get(f"/api/follows/{id_b}/followers")
    assert len(r.json()) == 1

    client.post(f"/api/blocks/{id_b}", headers=headers_a)

    r = client.get(f"/api/follows/{id_b}/followers")
    assert r.json() == []


def test_cannot_follow_blocked_user(client, register_user_with_id):
    headers_a, id_a = register_user_with_id()
    headers_b, id_b = register_user_with_id()

    client.post(f"/api/blocks/{id_b}", headers=headers_a)

    r = client.post(f"/api/follows/{id_b}", headers=headers_a)
    assert r.status_code == 403


def test_blocked_user_cannot_follow_blocker(client, register_user_with_id):
    headers_a, id_a = register_user_with_id()
    headers_b, id_b = register_user_with_id()

    client.post(f"/api/blocks/{id_b}", headers=headers_a)

    r = client.post(f"/api/follows/{id_a}", headers=headers_b)
    assert r.status_code == 403
