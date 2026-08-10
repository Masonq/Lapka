def _read_code(email, purpose="register"):
    """Достаёт последний неиспользованный код подтверждения напрямую из БД —
    в тестах нет настоящей почты, письмо никуда физически не уходит."""
    from app.core.db import SessionLocal
    from app.models.models import EmailVerificationCode

    db = SessionLocal()
    try:
        record = (
            db.query(EmailVerificationCode)
            .filter(EmailVerificationCode.email == email, EmailVerificationCode.purpose == purpose)
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
        )
        return record.code if record else None
    finally:
        db.close()


def test_register_and_login(client):
    r = client.post(
        "/api/auth/register/request-code",
        json={"display_name": "Ана", "email": "ana@example.com", "password": "password123"},
    )
    assert r.status_code == 200
    code = _read_code("ana@example.com")

    r = client.post("/api/auth/register/verify-code", json={"email": "ana@example.com", "code": code})
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
    client.post("/api/auth/register/request-code", json=payload)
    code = _read_code("dup@example.com")
    r1 = client.post("/api/auth/register/verify-code", json={"email": "dup@example.com", "code": code})
    assert r1.status_code == 200

    r2 = client.post("/api/auth/register/request-code", json=payload)
    assert r2.status_code == 400


def test_login_wrong_password_rejected(client):
    client.post(
        "/api/auth/register/request-code",
        json={"display_name": "Ана", "email": "wrong@example.com", "password": "password123"},
    )
    code = _read_code("wrong@example.com")
    client.post("/api/auth/register/verify-code", json={"email": "wrong@example.com", "code": code})
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
        "/api/auth/register/request-code",
        json={"display_name": "Ана", "email": "bruteforce@example.com", "password": "correct-password"},
    )
    code = _read_code("bruteforce@example.com")
    client.post("/api/auth/register/verify-code", json={"email": "bruteforce@example.com", "code": code})

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
            "/api/auth/register/request-code",
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
        "/api/auth/register/request-code",
        json={"display_name": "Тест", "email": email, "password": "original-pass"},
    )
    code = _read_code(email)
    r = client.post("/api/auth/register/verify-code", json={"email": email, "code": code})
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = client.post("/api/auth/password/request-code", json={"current_password": "original-pass"}, headers=headers)
    assert r.status_code == 200
    change_code = _read_code(email, purpose="change_password")

    r = client.patch(
        "/api/auth/password",
        json={"current_password": "original-pass", "new_password": "new-password-123", "code": change_code},
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
        json={"current_password": "wrong-current", "new_password": "new-password-123", "code": "000000"},
        headers=headers,
    )
    assert r.status_code == 401


def test_change_password_requires_auth(client):
    r = client.patch(
        "/api/auth/password", json={"current_password": "x", "new_password": "new-password-123", "code": "000000"}
    )
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


def test_registration_sends_welcome_notification(client):
    r = client.post(
        "/api/auth/register/request-code",
        json={"display_name": "Новый Пользователь", "email": "welcome-test@example.com", "password": "password123"},
    )
    code = _read_code("welcome-test@example.com")
    r = client.post("/api/auth/register/verify-code", json={"email": "welcome-test@example.com", "code": code})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.get("/api/notifications", headers=headers)
    assert r.status_code == 200
    notifications = r.json()
    assert len(notifications) == 1
    assert notifications[0]["type"] == "welcome"
    assert notifications[0]["actor"]["display_name"] == "Команда Lapki"
    assert notifications[0]["actor"]["is_staff"] is True


def test_system_account_reused_not_duplicated(client, register_user):
    """Второй регистрирующийся не должен создавать второй системный аккаунт."""
    register_user("Первый")
    headers2 = register_user("Второй")

    r = client.get("/api/notifications", headers=headers2)
    actor_id = r.json()[0]["actor"]["id"]

    from app.core.db import SessionLocal
    from app.models.models import User

    db = SessionLocal()
    system_accounts = db.query(User).filter(User.email == "team@lapki.info").count()
    db.close()
    assert system_accounts == 1


def test_register_wrong_code_rejected(client):
    client.post(
        "/api/auth/register/request-code",
        json={"display_name": "Тест", "email": "wrongcode@example.com", "password": "password123"},
    )
    r = client.post("/api/auth/register/verify-code", json={"email": "wrongcode@example.com", "code": "000000"})
    assert r.status_code == 400


def test_register_code_max_attempts_locks_out(client):
    client.post(
        "/api/auth/register/request-code",
        json={"display_name": "Тест", "email": "bruteforcecode@example.com", "password": "password123"},
    )
    statuses = []
    for _ in range(6):
        r = client.post(
            "/api/auth/register/verify-code", json={"email": "bruteforcecode@example.com", "code": "000000"}
        )
        statuses.append(r.status_code)
    # первые 5 попыток — обычная "неверный код" (400), 6-я — заблокирована по числу попыток (429)
    assert statuses[:5] == [400, 400, 400, 400, 400]
    assert statuses[5] == 429


def test_register_code_cannot_be_reused(client):
    client.post(
        "/api/auth/register/request-code",
        json={"display_name": "Тест", "email": "reuse@example.com", "password": "password123"},
    )
    code = _read_code("reuse@example.com")
    r1 = client.post("/api/auth/register/verify-code", json={"email": "reuse@example.com", "code": code})
    assert r1.status_code == 200

    r2 = client.post("/api/auth/register/verify-code", json={"email": "reuse@example.com", "code": code})
    assert r2.status_code == 400


def test_register_requesting_new_code_invalidates_old_one(client):
    email = "refresh-code@example.com"
    client.post(
        "/api/auth/register/request-code",
        json={"display_name": "Тест", "email": email, "password": "password123"},
    )
    old_code = _read_code(email)

    client.post(
        "/api/auth/register/request-code",
        json={"display_name": "Тест", "email": email, "password": "password123"},
    )
    new_code = _read_code(email)
    assert old_code != new_code

    # старый код больше не проходит
    r = client.post("/api/auth/register/verify-code", json={"email": email, "code": old_code})
    assert r.status_code == 400

    # новый — проходит
    r = client.post("/api/auth/register/verify-code", json={"email": email, "code": new_code})
    assert r.status_code == 200


def test_password_change_wrong_code_rejected(client, register_user):
    headers = register_user(password="original-pass")
    r = client.get("/api/auth/me", headers=headers)
    # достаём email пользователя, чтобы запросить код
    from app.core.db import SessionLocal
    from app.models.models import User

    db = SessionLocal()
    user_email = db.query(User).filter(User.id == r.json()["id"]).first().email
    db.close()

    client.post("/api/auth/password/request-code", json={"current_password": "original-pass"}, headers=headers)

    r = client.patch(
        "/api/auth/password",
        json={"current_password": "original-pass", "new_password": "new-pass-123", "code": "000000"},
        headers=headers,
    )
    assert r.status_code == 400


def test_password_change_requires_requesting_code_first(client, register_user):
    """Без предварительного запроса кода смена пароля не проходит — ни один код не 'валиден по умолчанию'."""
    headers = register_user(password="original-pass")
    r = client.patch(
        "/api/auth/password",
        json={"current_password": "original-pass", "new_password": "new-pass-123", "code": "123456"},
        headers=headers,
    )
    assert r.status_code == 400


def test_password_request_code_wrong_current_password_rejected(client, register_user):
    headers = register_user(password="original-pass")
    r = client.post("/api/auth/password/request-code", json={"current_password": "wrong"}, headers=headers)
    assert r.status_code == 401


def test_forgot_password_sends_code_for_existing_email(client, register_user):
    register_user()
    # register_user использует случайный email — достаю его через отдельную регистрацию
    # с известным email, чтобы не парсить внутренности фикстуры
    client.post(
        "/api/auth/register/request-code",
        json={"display_name": "Забыл Пароль", "email": "forgot-test@example.com", "password": "original-pass"},
    )
    code = _read_code("forgot-test@example.com")
    client.post("/api/auth/register/verify-code", json={"email": "forgot-test@example.com", "code": code})

    r = client.post("/api/auth/password/forgot", json={"email": "forgot-test@example.com"})
    assert r.status_code == 200

    reset_code = _read_code("forgot-test@example.com", purpose="password_reset")
    assert reset_code is not None


def test_forgot_password_same_response_for_nonexistent_email(client):
    """Ответ не должен отличаться в зависимости от того, существует ли
    аккаунт — иначе можно перебором узнавать зарегистрированные email."""
    r1 = client.post("/api/auth/password/forgot", json={"email": "nobody-here@example.com"})
    r2_email = "forgot-existing-2@example.com"
    client.post(
        "/api/auth/register/request-code",
        json={"display_name": "Тест", "email": r2_email, "password": "password123"},
    )
    code = _read_code(r2_email)
    client.post("/api/auth/register/verify-code", json={"email": r2_email, "code": code})
    r2 = client.post("/api/auth/password/forgot", json={"email": r2_email})

    assert r1.status_code == r2.status_code == 200
    assert r1.json() == r2.json()


def test_forgot_password_nonexistent_email_does_not_create_code(client):
    client.post("/api/auth/password/forgot", json={"email": "definitely-nobody@example.com"})
    code = _read_code("definitely-nobody@example.com", purpose="password_reset")
    assert code is None


def test_reset_password_with_valid_code_changes_password(client):
    email = "reset-flow@example.com"
    client.post(
        "/api/auth/register/request-code",
        json={"display_name": "Тест", "email": email, "password": "old-password"},
    )
    code = _read_code(email)
    client.post("/api/auth/register/verify-code", json={"email": email, "code": code})

    client.post("/api/auth/password/forgot", json={"email": email})
    reset_code = _read_code(email, purpose="password_reset")

    r = client.post(
        "/api/auth/password/reset",
        json={"email": email, "code": reset_code, "new_password": "brand-new-password"},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()  # сразу авторизует, не нужно логиниться отдельно

    # старый пароль больше не работает
    r = client.post("/api/auth/login", json={"email": email, "password": "old-password"})
    assert r.status_code == 401

    # новый — работает, БЕЗ необходимости знать старый пароль вообще
    r = client.post("/api/auth/login", json={"email": email, "password": "brand-new-password"})
    assert r.status_code == 200


def test_reset_password_wrong_code_rejected(client):
    email = "reset-wrong-code@example.com"
    client.post(
        "/api/auth/register/request-code",
        json={"display_name": "Тест", "email": email, "password": "password123"},
    )
    code = _read_code(email)
    client.post("/api/auth/register/verify-code", json={"email": email, "code": code})
    client.post("/api/auth/password/forgot", json={"email": email})

    r = client.post(
        "/api/auth/password/reset",
        json={"email": email, "code": "000000", "new_password": "new-password-123"},
    )
    assert r.status_code == 400


def test_reset_password_without_requesting_code_first_rejected(client, register_user):
    """Прямая попытка сбросить пароль без предварительного запроса кода —
    не должно быть 'кода по умолчанию', который всегда сработает."""
    register_user()
    r = client.post(
        "/api/auth/password/reset",
        json={"email": "never-requested@example.com", "code": "123456", "new_password": "new-password-123"},
    )
    assert r.status_code == 400


def test_login_error_translated_to_serbian_with_lang_header(client):
    """Настоящая проверка перевода — не просто что заголовок принимается,
    а что ТЕКСТ ОШИБКИ реально меняется в зависимости от X-Lang."""
    email = "translate-login-test@example.com"
    client.post(
        "/api/auth/register/request-code",
        json={"display_name": "Тест", "email": email, "password": "correct-password"},
    )
    code = _read_code(email)
    client.post("/api/auth/register/verify-code", json={"email": email, "code": code})

    r_ru = client.post("/api/auth/login", json={"email": email, "password": "wrong"})
    assert r_ru.json()["detail"] == "Неверный email или пароль"

    r_sr = client.post("/api/auth/login", json={"email": email, "password": "wrong"}, headers={"X-Lang": "sr"})
    assert r_sr.json()["detail"] == "Netačan email ili lozinka"

    assert r_ru.json()["detail"] != r_sr.json()["detail"]


def test_unsupported_lang_header_falls_back_to_russian(client):
    """X-Lang с мусорным/неподдерживаемым значением не должен ронять запрос —
    тихо откатывается на русский по умолчанию."""
    r = client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "x"},
        headers={"X-Lang": "fr"},
    )
    assert r.status_code == 401
    assert r.json()["detail"] == "Неверный email или пароль"


def test_missing_lang_header_defaults_to_russian(client):
    r = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "x"})
    assert r.json()["detail"] == "Неверный email или пароль"


def test_register_code_error_translated_to_serbian(client):
    """Проверяю перевод и в общей _verify_code, не только в login —
    разные эндпоинты используют один и тот же helper."""
    r = client.post(
        "/api/auth/register/verify-code",
        json={"email": "never-requested-any-code@example.com", "code": "123456"},
        headers={"X-Lang": "sr"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "Kod nije zatražen ili je već iskorišćen — zatraži novi"
