"""add datasets table

Revision ID: 003
Revises: 002
Create Date: 2026-04-04

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'datasets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('content_type', sa.String(length=100), nullable=False),
        sa.Column('s3_key', sa.String(length=500), nullable=False),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('s3_key')
    )
    op.create_index('ix_datasets_id', 'datasets', ['id'], unique=False)
    op.create_index('ix_datasets_user_id', 'datasets', ['user_id'], unique=False)
    op.create_index('ix_datasets_created_at', 'datasets', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_datasets_created_at', table_name='datasets')
    op.drop_index('ix_datasets_user_id', table_name='datasets')
    op.drop_index('ix_datasets_id', table_name='datasets')
    op.drop_table('datasets')
