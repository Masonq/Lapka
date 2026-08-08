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


def test_login_rate_limited_after_repeated_attempts(client):
    client.post(
        "/api/auth/register",
        json={"display_name": "Ана", "email": "bruteforce@example.com", "password": "correct-password"},
    )

    statuses = []
    for _ in range(11):
        r = client.post(
            "/api/auth/login",
            json={"email": "bruteforce@example.com", "password": "wrong-guess"},
        )
        statuses.append(r.status_code)

    assert statuses.count(401) == 10  # 10 попыток входа разрешено за окно
    assert statuses[-1] == 429  # 11-я — заблокирована


def test_register_rate_limited_after_repeated_attempts(client):
    statuses = []
    for i in range(6):
        r = client.post(
            "/api/auth/register",
            json={"display_name": "Тест", "email": f"mass{i}@example.com", "password": "password123"},
        )
        statuses.append(r.status_code)

    assert statuses == [200, 200, 200, 200, 200, 429]


def test_client_ip_prefers_x_forwarded_for(client):
    # Разные X-Forwarded-For должны считаться разными клиентами для rate limiting —
    # иначе все пользователи за одним nginx делили бы общий лимит
    for i in range(10):
        client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "wrong"},
            headers={"X-Forwarded-For": "10.0.0.1"},
        )

    # 11-я попытка с того же IP — должна быть заблокирована
    r_blocked = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "wrong"},
        headers={"X-Forwarded-For": "10.0.0.1"},
    )
    assert r_blocked.status_code == 429

    # Тот же запрос, но с другого IP — должен пройти как обычная неудачная попытка входа
    r_other_ip = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "wrong"},
        headers={"X-Forwarded-For": "10.0.0.2"},
    )
    assert r_other_ip.status_code == 401
