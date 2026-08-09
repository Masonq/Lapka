"""add service provider is_verified

Revision ID: 642fb65a00e3
Revises: f4e24f79bbf1
Create Date: 2026-08-09 18:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '642fb65a00e3'
down_revision: Union[str, Sequence[str], None] = 'f4e24f79bbf1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # batch_alter_table — SQLite не умеет добавлять колонку к уже существующей таблице
    # обычным ALTER без copy-and-move приёма; работает одинаково корректно и на SQLite,
    # и на Postgres
    with op.batch_alter_table('service_providers') as batch_op:
        batch_op.add_column(sa.Column('is_verified', sa.Boolean(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('service_providers') as batch_op:
        batch_op.drop_column('is_verified')
