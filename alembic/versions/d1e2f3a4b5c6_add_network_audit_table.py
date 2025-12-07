"""Add extension_network_audit table for request logging

Revision ID: d1e2f3a4b5c6
Revises: c9f3e8a7b2d1
Create Date: 2025-12-07 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'c9f3e8a7b2d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('extension_network_audit',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('extension_id', sa.String(), nullable=False),
        sa.Column('extension_name', sa.String(), nullable=False),
        sa.Column('target_url', sa.String(), nullable=False),
        sa.Column('method', sa.String(), nullable=False),
        sa.Column('request_headers', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('request_body_hash', sa.String(), nullable=True),
        sa.Column('request_body_size', sa.Integer(), nullable=True),
        sa.Column('response_status', sa.Integer(), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.Column('response_headers', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('response_body_excerpt', sa.Text(), nullable=True),
        sa.Column('response_body_size', sa.Integer(), nullable=True),
        sa.Column('allowed', sa.Boolean(), nullable=False),
        sa.Column('blocked_reason', sa.String(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['extension_id'], ['extensions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_network_audit_ext_created', 'extension_network_audit', ['extension_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_extension_network_audit_extension_id'), 'extension_network_audit', ['extension_id'], unique=False)
    op.create_index(op.f('ix_extension_network_audit_extension_name'), 'extension_network_audit', ['extension_name'], unique=False)
    op.create_index(op.f('ix_extension_network_audit_created_at'), 'extension_network_audit', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_extension_network_audit_created_at'), table_name='extension_network_audit')
    op.drop_index(op.f('ix_extension_network_audit_extension_name'), table_name='extension_network_audit')
    op.drop_index(op.f('ix_extension_network_audit_extension_id'), table_name='extension_network_audit')
    op.drop_index('ix_network_audit_ext_created', table_name='extension_network_audit')
    op.drop_table('extension_network_audit')
