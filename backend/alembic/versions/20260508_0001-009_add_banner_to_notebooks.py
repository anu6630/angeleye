"""add_banner_to_notebooks

Revision ID: 20260508_0001
Revises: 20260502_0001
Create Date: 2026-05-08 00:01:00.000000+00:00

Adds photo banner columns to notebooks table:
- banner_s3_key: S3 key of the full-resolution banner image
- banner_thumbnail_s3_key: S3 key of the low-resolution thumbnail
- banner_uploaded_at: Timestamp of last banner upload (used for cache busting)
- banner_content_type: MIME type of the stored banner image
"""
from alembic import op
import sqlalchemy as sa


revision = '20260508_0001'
down_revision = '20260502_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('notebooks', sa.Column('banner_s3_key', sa.String(length=500), nullable=True))
    op.add_column('notebooks', sa.Column('banner_thumbnail_s3_key', sa.String(length=500), nullable=True))
    op.add_column('notebooks', sa.Column('banner_uploaded_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('notebooks', sa.Column('banner_content_type', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('notebooks', 'banner_content_type')
    op.drop_column('notebooks', 'banner_uploaded_at')
    op.drop_column('notebooks', 'banner_thumbnail_s3_key')
    op.drop_column('notebooks', 'banner_s3_key')
