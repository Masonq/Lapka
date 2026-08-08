import base64
import json
import os
import sys
import uuid

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def decode_user_id(token: str) -> str:
    """Достаёт user_id (claim 'sub') из JWT без проверки подписи — payload не секретен,
    секретна только подпись. Удобно в тестах, чтобы не тащить отдельный /me эндпоинт."""
    payload_b64 = token.split(".")[1]
    padded = payload_b64 + "=" * (-len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded))
    return payload["sub"]


@pytest.fixture
def client(tmp_path, monkeypatch):
    """Свежий FastAPI TestClient с изолированной SQLite-базой и папкой загрузок на каждый тест.

    Импортируем app только внутри фикстуры (после настройки env), чтобы модуль app.core.db
    подхватил переменные окружения текущего теста, а не то, что было выставлено раньше.
    """
    db_path = tmp_path / "test.db"
    upload_dir = tmp_path / "uploads"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("UPLOAD_DIR", str(upload_dir))
    monkeypatch.setenv("JWT_SECRET", "test-secret")

    # Модули с состоянием (лимитеры, engine) должны переимпортироваться заново на каждый тест,
    # иначе rate-limit тесты будут видеть счётчики от предыдущих тестов
    for mod in list(sys.modules):
        if mod.startswith("app."):
            del sys.modules[mod]

    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def register_user(client):
    """Регистрирует нового пользователя со случайным email и возвращает (user, headers)."""

    def _register(display_name="Тест", password="password123"):
        email = f"{uuid.uuid4().hex[:12]}@example.com"
        r = client.post(
            "/api/auth/register",
            json={"display_name": display_name, "email": email, "password": password},
        )
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _register


@pytest.fixture
def register_user_with_id(client):
    """То же самое, но также возвращает id зарегистрированного пользователя —
    удобно там, где нужно ссылаться на конкретного пользователя (например, подписки)."""

    def _register(display_name="Тест", password="password123"):
        email = f"{uuid.uuid4().hex[:12]}@example.com"
        r = client.post(
            "/api/auth/register",
            json={"display_name": display_name, "email": email, "password": password},
        )
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}, decode_user_id(token)

    return _register
