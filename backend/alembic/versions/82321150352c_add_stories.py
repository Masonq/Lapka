"""add stories

Revision ID: 82321150352c
Revises: 642fb65a00e3
Create Date: 2026-08-09 23:19:19.709633

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '82321150352c'
down_revision: Union[str, Sequence[str], None] = '642fb65a00e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'stories',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('author_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('photo_url', sa.String(length=500), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('stories')
