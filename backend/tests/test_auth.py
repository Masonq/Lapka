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


def test_change_password(client):
    email = "change-pass-test@example.com"
    r = client.post(
        "/api/auth/register",
        json={"display_name": "Тест", "email": email, "password": "original-pass"},
    )
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = client.patch(
        "/api/auth/password",
        json={"current_password": "original-pass", "new_password": "new-password-123"},
        headers=headers,
    )
    assert r.status_code == 200

    # старый пароль больше не работает
    r = client.post("/api/auth/login", json={"email": email, "password": "original-pass"})
    assert r.status_code == 401

    # новый — работает
    r = client.post("/api/auth/login", json={"email": email, "password": "new-password-123"})
    assert r.status_code == 200


def test_change_password_wrong_current_rejected(client, register_user):
    headers = register_user(password="original-pass")
    r = client.patch(
        "/api/auth/password",
        json={"current_password": "wrong-current", "new_password": "new-password-123"},
        headers=headers,
    )
    assert r.status_code == 401


def test_change_password_requires_auth(client):
    r = client.patch("/api/auth/password", json={"current_password": "x", "new_password": "new-password-123"})
    assert r.status_code == 401


def test_delete_account_requires_correct_password(client, register_user):
    headers = register_user(password="original-pass")
    r = client.request("DELETE", "/api/auth/me", json={"password": "wrong"}, headers=headers)
    assert r.status_code == 401


def test_delete_account_removes_user_and_cascades(client, register_user):
    headers = register_user(password="original-pass")
    client.post("/api/pets", json={"name": "Бела", "species": "Собака"}, headers=headers)
    post = client.post(
        "/api/posts", json={"type": "general", "title": "Тест", "body": "текст"}, headers=headers
    ).json()

    r = client.request("DELETE", "/api/auth/me", json={"password": "original-pass"}, headers=headers)
    assert r.status_code == 200

    # токен теперь недействителен — пользователя больше нет
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 401

    # пост удалённого автора тоже пропал (каскад)
    r = client.get(f"/api/posts/{post['id']}")
    assert r.status_code == 404


def test_delete_account_requires_auth(client):
    r = client.request("DELETE", "/api/auth/me", json={})
    assert r.status_code == 401


def test_onboarding_defaults_to_false(client, register_user):
    headers = register_user()
    r = client.get("/api/auth/me", headers=headers)
    assert r.json()["has_completed_onboarding"] is False


def test_complete_onboarding(client, register_user):
    headers = register_user()
    r = client.patch("/api/auth/onboarding-complete", headers=headers)
    assert r.status_code == 200
    assert r.json()["has_completed_onboarding"] is True

    r = client.get("/api/auth/me", headers=headers)
    assert r.json()["has_completed_onboarding"] is True


def test_complete_onboarding_idempotent(client, register_user):
    headers = register_user()
    client.patch("/api/auth/onboarding-complete", headers=headers)
    r = client.patch("/api/auth/onboarding-complete", headers=headers)
    assert r.status_code == 200
    assert r.json()["has_completed_onboarding"] is True


def test_complete_onboarding_requires_auth(client):
    r = client.patch("/api/auth/onboarding-complete")
    assert r.status_code == 401
