"""add show_staff_badge to posts

Revision ID: 3627ea487618
Revises: b8f2a4c60d17
Create Date: 2026-08-10 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3627ea487618'
down_revision: Union[str, Sequence[str], None] = 'b8f2a4c60d17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # server_default='1' (не nullable=True без дефолта) — уже наступал на эти грабли
    # с has_completed_onboarding/is_verified, здесь сразу делаю правильно
    with op.batch_alter_table('posts') as batch_op:
        batch_op.add_column(sa.Column('show_staff_badge', sa.Boolean(), nullable=True, server_default='1'))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('posts') as batch_op:
        batch_op.drop_column('show_staff_badge')
