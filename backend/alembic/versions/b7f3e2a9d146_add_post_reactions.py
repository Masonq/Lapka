"""add post_reactions

Revision ID: b7f3e2a9d146
Revises: a3f7c9e14b52
Create Date: 2026-08-11 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b7f3e2a9d146"
down_revision: Union[str, None] = "a3f7c9e14b52"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "post_reactions",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("post_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("emoji", sa.String(length=8), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("post_id", "user_id", name="uq_post_reaction_user"),
    )
    op.create_index(op.f("ix_post_reactions_post_id"), "post_reactions", ["post_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_post_reactions_post_id"), table_name="post_reactions")
    op.drop_table("post_reactions")
