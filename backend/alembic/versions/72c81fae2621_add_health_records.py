"""add health_records

Revision ID: 72c81fae2621
Revises: b894a3862e17
Create Date: 2026-08-08 23:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72c81fae2621'
down_revision: Union[str, Sequence[str], None] = 'b894a3862e17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'health_records',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('pet_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('category', sa.String(length=30), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('value', sa.Float(), nullable=True),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('next_due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.String(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['pet_id'], ['pets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('health_records')
