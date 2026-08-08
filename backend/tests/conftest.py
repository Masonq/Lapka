import os
import sys
import uuid

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


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
