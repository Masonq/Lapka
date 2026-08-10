"""add has_completed_onboarding

Revision ID: e5d070208f59
Revises: 82321150352c
Create Date: 2026-08-10 01:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5d070208f59'
down_revision: Union[str, Sequence[str], None] = '82321150352c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # batch_alter_table — SQLite не умеет добавлять колонку к уже существующей таблице
    # обычным ALTER без copy-and-move приёма; работает одинаково корректно на SQLite и Postgres
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('has_completed_onboarding', sa.Boolean(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('has_completed_onboarding')
