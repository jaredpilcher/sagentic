"""Add extension_data table for persistent extension storage

Revision ID: c9f3e8a7b2d1
Revises: b8e4f2a1c3d5
Create Date: 2025-12-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c9f3e8a7b2d1'
down_revision: Union[str, None] = 'b8e4f2a1c3d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('extension_data',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('extension_id', sa.String(), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['extension_id'], ['extensions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_extension_data_ext_key', 'extension_data', ['extension_id', 'key'], unique=True)
    op.create_index(op.f('ix_extension_data_extension_id'), 'extension_data', ['extension_id'], unique=False)
    op.create_index(op.f('ix_extension_data_key'), 'extension_data', ['key'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_extension_data_key'), table_name='extension_data')
    op.drop_index(op.f('ix_extension_data_extension_id'), table_name='extension_data')
    op.drop_index('ix_extension_data_ext_key', table_name='extension_data')
    op.drop_table('extension_data')
