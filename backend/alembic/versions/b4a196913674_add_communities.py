"""add communities

Revision ID: b4a196913674
Revises: 6dea3a6e6677
Create Date: 2026-08-08 22:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4a196913674'
down_revision: Union[str, Sequence[str], None] = '6dea3a6e6677'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'communities',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=1000), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('city', sa.String(length=80), nullable=True),
        sa.Column('created_by', sa.UUID(as_uuid=False), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'community_members',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('community_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('user_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=True),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['community_id'], ['communities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('community_id', 'user_id', name='uq_community_member'),
    )

    # batch_alter_table — не просто стиль: SQLite не умеет добавлять именованный FK
    # к уже существующей таблице через обычный ALTER (нужен приём copy-and-move).
    # Батч работает одинаково корректно и на SQLite, и на Postgres — обычный
    # create_foreign_key() здесь уронил бы применение миграции на SQLite
    # (проверено: NotImplementedError при реальном прогоне)
    with op.batch_alter_table('posts') as batch_op:
        batch_op.add_column(sa.Column('community_id', sa.UUID(as_uuid=False), nullable=True))
        batch_op.create_foreign_key(
            'fk_posts_community_id', 'communities', ['community_id'], ['id'], ondelete='SET NULL'
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('posts') as batch_op:
        batch_op.drop_constraint('fk_posts_community_id', type_='foreignkey')
        batch_op.drop_column('community_id')
    op.drop_table('community_members')
    op.drop_table('communities')
