"""add pet gender city activity_level

Revision ID: d41fc520d930
Revises: b3e19320fc5b
Create Date: 2026-08-08 21:06:17.022347

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd41fc520d930'
down_revision: Union[str, Sequence[str], None] = 'b3e19320fc5b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('pets', sa.Column('gender', sa.String(length=20), nullable=True))
    op.add_column('pets', sa.Column('city', sa.String(length=80), nullable=True))
    op.add_column('pets', sa.Column('activity_level', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('pets', 'activity_level')
    op.drop_column('pets', 'city')
    op.drop_column('pets', 'gender')
