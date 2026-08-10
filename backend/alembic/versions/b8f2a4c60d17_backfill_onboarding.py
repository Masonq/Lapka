"""backfill has_completed_onboarding null values

Revision ID: b8f2a4c60d17
Revises: a1c3f0e91b22
Create Date: 2026-08-10 02:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8f2a4c60d17'
down_revision: Union[str, Sequence[str], None] = 'a1c3f0e91b22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Миграция e5d070208f59 добавила has_completed_onboarding без server_default —
    у пользователей, зарегистрированных ДО неё, колонка осталась NULL. Схема
    MeOut.has_completed_onboarding требует bool (не Optional), и /auth/me падал
    с ошибкой валидации для любого такого пользователя (реальный баг, из-за
    которого профиль показывал заглушку 'Ты в Lapki' без аватара).

    Заодно нашёл и чиню ту же болезнь у service_providers.is_verified (миграция
    642fb65a00e3, тоже без server_default) — проверил эмпирически: даже
    `is_verified: bool = False` в Pydantic НЕ спасает от None, default
    применяется только когда атрибут отсутствует целиком, а не когда он
    присутствует со значением None. GET /services падал бы для любого
    исполнителя, зарегистрированного до той миграции.
    """
    users = sa.table('users', sa.column('has_completed_onboarding', sa.Boolean))
    op.execute(users.update().where(users.c.has_completed_onboarding.is_(None)).values(has_completed_onboarding=False))

    providers = sa.table('service_providers', sa.column('is_verified', sa.Boolean))
    op.execute(providers.update().where(providers.c.is_verified.is_(None)).values(is_verified=False))


def downgrade() -> None:
    """Upgrade schema."""
    # Откат не имеет смысла — NULL и False неразличимы содержательно, ничего не теряем
    pass
