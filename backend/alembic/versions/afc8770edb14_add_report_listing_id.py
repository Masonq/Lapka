"""add report listing_id

Revision ID: afc8770edb14
Revises: f758328b5fbf
Create Date: 2026-08-09 13:00:48.305991

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'afc8770edb14'
down_revision: Union[str, Sequence[str], None] = 'f758328b5fbf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # batch_alter_table — SQLite не умеет добавлять именованный FK к уже существующей
    # таблице через обычный ALTER (нужен приём copy-and-move). Работает одинаково
    # корректно и на SQLite, и на Postgres
    with op.batch_alter_table('reports') as batch_op:
        batch_op.add_column(sa.Column('listing_id', sa.UUID(as_uuid=False), nullable=True))
        batch_op.create_foreign_key(
            'fk_reports_listing_id', 'listings', ['listing_id'], ['id'], ondelete='SET NULL'
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('reports') as batch_op:
        batch_op.drop_constraint('fk_reports_listing_id', type_='foreignkey')
        batch_op.drop_column('listing_id')
