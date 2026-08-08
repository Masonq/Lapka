"""add messages

Revision ID: 0da2a13e52a5
Revises: b4a196913674
Create Date: 2026-08-08 22:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0da2a13e52a5'
down_revision: Union[str, Sequence[str], None] = 'b4a196913674'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'messages',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('sender_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('recipient_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('body', sa.String(length=2000), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('messages')
