import os

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg2://lapabg:lapabg@localhost:5432/lapabg"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


if engine.dialect.name == "sqlite":
    # SQLite (используется в тестах и для локальной разработки без Docker) сворачивает
    # регистр в LOWER()/ILIKE только для ASCII — кириллица и другие не-латинские алфавиты
    # не сворачиваются. В проде на PostgreSQL это решено через локаль кластера при initdb
    # (см. docker-compose.yml), но здесь регистрируем Python-реализацию LOWER(), которая
    # корректно работает с любым Unicode, чтобы поиск вёл себя одинаково в тестах и в проде.
    @event.listens_for(engine, "connect")
    def _register_unicode_lower(dbapi_connection, connection_record):
        dbapi_connection.create_function("lower", 1, lambda s: s.lower() if s is not None else None)

    # SQLite по умолчанию НЕ проверяет внешние ключи, даже если они объявлены в моделях —
    # без этой строки тесты пропускали бы нарушения FK, которые Postgres в проде бы поймал
    # (так и было: удаление поста, сохранённого другим пользователем, падало 500-й на
    # реальной базе, а тесты на SQLite этого не видели, пока не включили эту проверку)
    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, connection_record):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
