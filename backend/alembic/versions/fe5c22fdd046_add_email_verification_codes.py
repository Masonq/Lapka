"""add email_verification_codes

Revision ID: fe5c22fdd046
Revises: 3627ea487618
Create Date: 2026-08-10 05:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fe5c22fdd046'
down_revision: Union[str, Sequence[str], None] = '3627ea487618'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'email_verification_codes',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=6), nullable=False),
        sa.Column('purpose', sa.String(length=20), nullable=False),
        sa.Column('payload', sa.Text(), nullable=True),
        sa.Column('user_id', sa.UUID(as_uuid=False), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('used', sa.Boolean(), nullable=True, server_default='0'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_email_verification_codes_email'), 'email_verification_codes', ['email'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_email_verification_codes_email'), table_name='email_verification_codes')
    op.drop_table('email_verification_codes')
