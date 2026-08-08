def test_register_and_login(client):
    r = client.post(
        "/api/auth/register",
        json={"display_name": "Ана", "email": "ana@example.com", "password": "password123"},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()

    r = client.post(
        "/api/auth/login",
        json={"email": "ana@example.com", "password": "password123"},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_register_duplicate_email_rejected(client):
    payload = {"display_name": "Ана", "email": "dup@example.com", "password": "password123"}
    r1 = client.post("/api/auth/register", json=payload)
    assert r1.status_code == 200

    r2 = client.post("/api/auth/register", json=payload)
    assert r2.status_code == 400


def test_login_wrong_password_rejected(client):
    client.post(
        "/api/auth/register",
        json={"display_name": "Ана", "email": "wrong@example.com", "password": "password123"},
    )
    r = client.post(
        "/api/auth/login",
        json={"email": "wrong@example.com", "password": "not-the-password"},
    )
    assert r.status_code == 401


def test_protected_endpoint_requires_token(client):
    r = client.post("/api/posts", json={"type": "general", "title": "Тест", "body": "текст"})
    assert r.status_code == 401


def test_protected_endpoint_rejects_garbage_token(client):
    r = client.post(
        "/api/posts",
        json={"type": "general", "title": "Тест", "body": "текст"},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert r.status_code == 401
