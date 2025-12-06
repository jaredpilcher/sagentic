"""Add extensions table

Revision ID: b8e4f2a1c3d5
Revises: 419b959712f7
Create Date: 2025-12-06 23:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b8e4f2a1c3d5'
down_revision: Union[str, None] = '419b959712f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('extensions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('version', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('manifest', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('install_path', sa.String(), nullable=False),
        sa.Column('has_backend', sa.Boolean(), nullable=True),
        sa.Column('has_frontend', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_extensions_name'), 'extensions', ['name'], unique=True)
    op.create_index(op.f('ix_extensions_status'), 'extensions', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_extensions_status'), table_name='extensions')
    op.drop_index(op.f('ix_extensions_name'), table_name='extensions')
    op.drop_table('extensions')
