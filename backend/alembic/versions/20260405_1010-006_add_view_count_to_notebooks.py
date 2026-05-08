"""add view_count to notebooks

Revision ID: 20260405_1010
Revises: 20260405_1005
Create Date: 2026-04-05 10:10:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260405_1010'
down_revision = '20260405_1005'
branch_labels = None
depends_on = None


def upgrade():
    """Add view_count column to notebooks table"""
    op.add_column('notebooks', sa.Column('view_count', sa.Integer(), nullable=True, server_default='0'))


def downgrade():
    """Remove view_count column from notebooks table"""
    op.drop_column('notebooks', 'view_count')
