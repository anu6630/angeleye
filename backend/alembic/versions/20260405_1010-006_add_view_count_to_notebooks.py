"""add view_count to notebooks

Revision ID: 006_add_view_count
Revises: 005_add_fork_and_follow_tables
Create Date: 2026-04-05 10:10:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006_add_view_count'
down_revision = '005_add_fork_and_follow_tables'
branch_labels = None
depends_on = None


def upgrade():
    """Add view_count column to notebooks table"""
    op.add_column('notebooks', sa.Column('view_count', sa.Integer(), nullable=True, server_default='0'))


def downgrade():
    """Remove view_count column from notebooks table"""
    op.drop_column('notebooks', 'view_count')
