"""add blocks

Revision ID: f4e24f79bbf1
Revises: 33e7e4faa19e
Create Date: 2026-08-09 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4e24f79bbf1'
down_revision: Union[str, Sequence[str], None] = '33e7e4faa19e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'blocks',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('blocker_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('blocked_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['blocked_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['blocker_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('blocker_id', 'blocked_id', name='uq_blocker_blocked'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('blocks')
