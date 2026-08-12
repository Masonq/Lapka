"""add is_banned and ban_reason to users

Revision ID: bbe63e7e844a
Revises: b7f3e2a9d146
Create Date: 2026-08-12 02:17:56.086311

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bbe63e7e844a'
down_revision: Union[str, Sequence[str], None] = 'b7f3e2a9d146'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("users", sa.Column("is_banned", sa.Boolean(), nullable=True, server_default=sa.false()))
    op.add_column("users", sa.Column("ban_reason", sa.String(length=300), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "ban_reason")
    op.drop_column("users", "is_banned")
