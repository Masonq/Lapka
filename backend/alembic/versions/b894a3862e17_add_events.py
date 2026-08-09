"""add events

Revision ID: b894a3862e17
Revises: 0da2a13e52a5
Create Date: 2026-08-08 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b894a3862e17'
down_revision: Union[str, Sequence[str], None] = '0da2a13e52a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'events',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('organizer_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.String(length=2000), nullable=True),
        sa.Column('location', sa.String(length=200), nullable=True),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('pet_id', sa.UUID(as_uuid=False), nullable=True),
        sa.Column('community_id', sa.UUID(as_uuid=False), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['community_id'], ['communities.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organizer_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pet_id'], ['pets.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'event_participants',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('event_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('user_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id', 'user_id', name='uq_event_participant'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('event_participants')
    op.drop_table('events')
