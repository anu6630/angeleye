"""add notebook output fields

Revision ID: 20260404_1002
Revises: 20260404_1001
Create Date: 2026-04-04

"""
from alembic import op
import sqlalchemy as sa


revision = '20260404_1002'
down_revision = '20260404_1001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('notebooks', sa.Column('output_s3_key', sa.String(length=500), nullable=True))
    op.add_column('notebooks', sa.Column('output_version', sa.String(length=50), nullable=True))
    op.add_column('notebooks', sa.Column('output_url', sa.Text(), nullable=True))
    op.add_column('notebooks', sa.Column('compiled_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('notebooks', 'compiled_at')
    op.drop_column('notebooks', 'output_url')
    op.drop_column('notebooks', 'output_version')
    op.drop_column('notebooks', 'output_s3_key')
