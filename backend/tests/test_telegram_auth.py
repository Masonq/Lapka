def test_telegram_auth_without_bot_token_rejected(client):
    # В тестовом окружении TELEGRAM_BOT_TOKEN не задан — любая подпись должна отклоняться,
    # а не молча приниматься
    r = client.post(
        "/api/auth/telegram",
        json={
            "id": 123456789,
            "first_name": "Ана",
            "last_name": "Петрович",
            "auth_date": 1700000000,
            "hash": "fake-hash",
        },
    )
    assert r.status_code == 401


def test_telegram_auth_with_valid_signature_succeeds(tmp_path, monkeypatch):
    """Настоящий положительный сценарий — не просто что подпись без токена
    отклоняется, а что ПРАВИЛЬНО подписанные данные реально авторизуют.
    TELEGRAM_BOT_TOKEN нужно выставить ДО импорта app.main (модуль читает
    его на уровне импорта), поэтому не переиспользую общую фикстуру client —
    она к этому моменту уже успела бы импортировать модуль со старым
    значением. Повторяю ту же настройку вручную, добавив нужную переменную
    до реимпорта."""
    import hashlib
    import hmac
    import sys
    import time

    bot_token = "test-bot-token-for-signature-verification"

    db_path = tmp_path / "test.db"
    upload_dir = tmp_path / "uploads"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("UPLOAD_DIR", str(upload_dir))
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    monkeypatch.setenv("AUTO_CREATE_SCHEMA", "true")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", bot_token)

    for mod in list(sys.modules):
        if mod.startswith("app."):
            del sys.modules[mod]

    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as test_client:
        # Тот же алгоритм, что и в verify_telegram_auth — считаю подпись сама,
        # как это делал бы реальный Telegram Login Widget на стороне сервера Telegram
        data = {
            "id": 987654321,
            "first_name": "Мария",
            "last_name": "Йованович",
            "username": "maria_test",
            "auth_date": int(time.time()),
        }
        pairs = sorted(f"{k}={v}" for k, v in data.items() if v is not None)
        check_string = "\n".join(pairs)
        secret_key = hashlib.sha256(bot_token.encode()).digest()
        computed_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()

        r = test_client.post("/api/auth/telegram", json={**data, "hash": computed_hash})
        assert r.status_code == 200
        assert "access_token" in r.json()

        # Повторный вход тем же telegram_id должен найти уже созданный аккаунт,
        # не плодить дубликаты
        pairs2 = sorted(f"{k}={v}" for k, v in data.items() if v is not None)
        check_string2 = "\n".join(pairs2)
        computed_hash2 = hmac.new(secret_key, check_string2.encode(), hashlib.sha256).hexdigest()
        r2 = test_client.post("/api/auth/telegram", json={**data, "hash": computed_hash2})
        assert r2.status_code == 200

        me1 = test_client.get("/api/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
        me2 = test_client.get("/api/auth/me", headers={"Authorization": f"Bearer {r2.json()['access_token']}"})
        assert me1.json()["id"] == me2.json()["id"]


def test_telegram_auth_with_tampered_signature_rejected(tmp_path, monkeypatch):
    """Кто-то подменил данные (например, first_name) после подписи — подпись
    больше не сойдётся, запрос должен отклониться, а не тихо пройти."""
    import hashlib
    import hmac
    import sys
    import time

    bot_token = "test-bot-token-for-signature-verification"

    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    monkeypatch.setenv("AUTO_CREATE_SCHEMA", "true")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", bot_token)

    for mod in list(sys.modules):
        if mod.startswith("app."):
            del sys.modules[mod]

    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as test_client:
        data = {"id": 111222333, "first_name": "Настоящее Имя", "auth_date": int(time.time())}
        pairs = sorted(f"{k}={v}" for k, v in data.items() if v is not None)
        check_string = "\n".join(pairs)
        secret_key = hashlib.sha256(bot_token.encode()).digest()
        computed_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()

        tampered = {**data, "first_name": "Подменённое Имя", "hash": computed_hash}
        r = test_client.post("/api/auth/telegram", json=tampered)
        assert r.status_code == 401
