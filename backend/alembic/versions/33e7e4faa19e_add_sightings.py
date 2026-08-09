"""add sightings

Revision ID: 33e7e4faa19e
Revises: afc8770edb14
Create Date: 2026-08-09 13:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '33e7e4faa19e'
down_revision: Union[str, Sequence[str], None] = 'afc8770edb14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'sightings',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('post_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('reporter_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('location', sa.String(length=200), nullable=False),
        sa.Column('note', sa.String(length=1000), nullable=True),
        sa.Column('seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('sightings')
