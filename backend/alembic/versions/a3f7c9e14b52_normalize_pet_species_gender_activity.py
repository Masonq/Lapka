"""normalize pet species/gender/activity_level to language-neutral values

Revision ID: a3f7c9e14b52
Revises: fe5c22fdd046
Create Date: 2026-08-10 19:00:00.000000

Раньше species/gender/activity_level хранились как русский текст напрямую
("Собака", "Мальчик", "Спокойный") — работало, пока интерфейс был только
русский. После сербской локализации это стало проблемой: значение,
хранимое в базе, используется и для СРАВНЕНИЯ (выбор цвета аватарки,
фильтрация в форме создания питомца), и для ОТОБРАЖЕНИЯ — при сербском
интерфейсе пользователь видел русский текст напрямую там, где перевод
не был подключён (сравнения), и переведённый текст только там, где
специально добавлен dataLabels.js (отображение).

Перевожу ВСЕ существующие записи на языконезависимые значения
(dog/cat/other, male/female, calm/medium/active) — отображение остаётся
переведённым через dataLabels.js (тот же принцип, что уже был, просто
ключи меняются с русских слов на нейтральные), а сравнения в коде теперь
корректны на любом языке интерфейса, не только русском.

Только ТОЧНЫЕ совпадения ожидаемых старых значений конвертируются —
что угодно другое (опечатки, ручные правки в БД, значения от будущих
версий фронтенда) остаётся нетронутым, чтобы не потерять данные
непредвиденным преобразованием.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a3f7c9e14b52"
down_revision: Union[str, None] = "fe5c22fdd046"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPECIES_MAP = {"Собака": "dog", "Кошка": "cat", "Другое": "other"}
GENDER_MAP = {"Мальчик": "male", "Девочка": "female"}
ACTIVITY_MAP = {"Спокойный": "calm", "Средний": "medium", "Активный": "active"}


def upgrade() -> None:
    conn = op.get_bind()
    pets_table = sa.table(
        "pets",
        sa.column("id", sa.String),
        sa.column("species", sa.String),
        sa.column("gender", sa.String),
        sa.column("activity_level", sa.String),
    )
    for old, new in SPECIES_MAP.items():
        conn.execute(pets_table.update().where(pets_table.c.species == old).values(species=new))
    for old, new in GENDER_MAP.items():
        conn.execute(pets_table.update().where(pets_table.c.gender == old).values(gender=new))
    for old, new in ACTIVITY_MAP.items():
        conn.execute(
            pets_table.update().where(pets_table.c.activity_level == old).values(activity_level=new)
        )


def downgrade() -> None:
    conn = op.get_bind()
    pets_table = sa.table(
        "pets",
        sa.column("id", sa.String),
        sa.column("species", sa.String),
        sa.column("gender", sa.String),
        sa.column("activity_level", sa.String),
    )
    for old, new in SPECIES_MAP.items():
        conn.execute(pets_table.update().where(pets_table.c.species == new).values(species=old))
    for old, new in GENDER_MAP.items():
        conn.execute(pets_table.update().where(pets_table.c.gender == new).values(gender=old))
    for old, new in ACTIVITY_MAP.items():
        conn.execute(
            pets_table.update().where(pets_table.c.activity_level == new).values(activity_level=old)
        )
