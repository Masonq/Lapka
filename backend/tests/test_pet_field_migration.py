"""Тест миграции a3f7c9e14b52 — перевод species/gender/activity_level
питомцев на языконезависимые значения. Отдельный от общих API-тестов,
потому что работает напрямую с Alembic (upgrade/downgrade), а не через
HTTP-эндпоинты — миграция данных на проде оценивалась как более рискованная
часть работы, поэтому проверяется отдельно и тщательнее обычного."""
import uuid

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text


@pytest.fixture
def migration_db(tmp_path, monkeypatch):
    db_path = tmp_path / "migration_test.db"
    db_url = f"sqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", db_url)

    # app.core.db читает DATABASE_URL один раз на уровне модуля — если он уже
    # был импортирован раньше (другим тестом) с иным значением, alembic/env.py
    # унаследует то старое значение вместо только что выставленного monkeypatch
    import sys
    for mod in list(sys.modules):
        if mod.startswith("app."):
            del sys.modules[mod]

    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", db_url)

    # Накатываю всё ДО новой миграции — предыдущее состояние схемы,
    # где species/gender/activity_level ещё русский текст
    command.upgrade(cfg, "fe5c22fdd046")

    engine = create_engine(db_url)
    with engine.begin() as conn:
        user_id = str(uuid.uuid4())
        conn.execute(
            text(
                "INSERT INTO users (id, display_name, email, password_hash, auth_provider, city, created_at) "
                "VALUES (:id, 'Тест', 'migration-test@example.com', 'hash', 'EMAIL', 'Белград', datetime('now'))"
            ),
            {"id": user_id},
        )

        pets = [
            ("regular-dog", "Обычная собака", "Собака", "Мальчик", "Активный"),
            ("regular-cat", "Обычная кошка", "Кошка", "Девочка", "Спокойный"),
            ("other-species", "Другое животное", "Другое", None, "Средний"),
            ("unexpected", "Неожиданное значение", "Хомяк", "Оно", "Бешеный"),
            ("nulls", "Пустые поля", "Собака", None, None),
        ]
        for pet_id, name, species, gender, activity in pets:
            conn.execute(
                text(
                    "INSERT INTO pets (id, owner_id, name, species, gender, activity_level, created_at) "
                    "VALUES (:id, :owner_id, :name, :species, :gender, :activity, datetime('now'))"
                ),
                {"id": pet_id, "owner_id": user_id, "name": name, "species": species,
                 "gender": gender, "activity": activity},
            )

    yield cfg, engine
    engine.dispose()


def _fetch(engine, pet_id):
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT species, gender, activity_level FROM pets WHERE id = :id"), {"id": pet_id}
        ).first()
    return dict(row._mapping)


def test_upgrade_converts_known_russian_values_to_neutral(migration_db):
    cfg, engine = migration_db
    command.upgrade(cfg, "a3f7c9e14b52")

    assert _fetch(engine, "regular-dog") == {"species": "dog", "gender": "male", "activity_level": "active"}
    assert _fetch(engine, "regular-cat") == {"species": "cat", "gender": "female", "activity_level": "calm"}
    assert _fetch(engine, "other-species") == {"species": "other", "gender": None, "activity_level": "medium"}


def test_upgrade_leaves_unexpected_values_untouched(migration_db):
    """Значения, не входящие в карту (опечатки, ручные правки в БД,
    animal species вроде 'Хомяк') не должны теряться или превращаться
    в мусор — миграция трогает только точные совпадения."""
    cfg, engine = migration_db
    command.upgrade(cfg, "a3f7c9e14b52")

    assert _fetch(engine, "unexpected") == {"species": "Хомяк", "gender": "Оно", "activity_level": "Бешеный"}


def test_upgrade_leaves_nulls_as_nulls(migration_db):
    cfg, engine = migration_db
    command.upgrade(cfg, "a3f7c9e14b52")

    result = _fetch(engine, "nulls")
    assert result["species"] == "dog"
    assert result["gender"] is None
    assert result["activity_level"] is None


def test_downgrade_reverts_to_original_russian_values(migration_db):
    """Настоящая проверка обратимости — не просто что downgrade не падает
    с ошибкой, а что данные после отката ПОБАЙТОВО совпадают с исходными."""
    cfg, engine = migration_db

    before = {pid: _fetch(engine, pid) for pid in ["regular-dog", "regular-cat", "other-species", "unexpected", "nulls"]}

    command.upgrade(cfg, "a3f7c9e14b52")
    command.downgrade(cfg, "fe5c22fdd046")

    after = {pid: _fetch(engine, pid) for pid in ["regular-dog", "regular-cat", "other-species", "unexpected", "nulls"]}

    assert before == after
