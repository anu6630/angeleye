"""add_avatar_to_profiles

Revision ID: 20260508_0100
Revises: 20260508_0001
Create Date: 2026-05-08 01:00:00.000000+00:00
"""
from alembic import op
import sqlalchemy as sa


revision = "20260508_0100"
down_revision = "20260508_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("avatar_s3_key", sa.String(length=500), nullable=True))
    op.add_column("profiles", sa.Column("avatar_thumbnail_s3_key", sa.String(length=500), nullable=True))
    op.add_column("profiles", sa.Column("avatar_uploaded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("profiles", sa.Column("avatar_content_type", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "avatar_content_type")
    op.drop_column("profiles", "avatar_uploaded_at")
    op.drop_column("profiles", "avatar_thumbnail_s3_key")
    op.drop_column("profiles", "avatar_s3_key")
