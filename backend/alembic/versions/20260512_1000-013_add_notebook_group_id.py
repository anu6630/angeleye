"""add_notebook_group_id

Revision ID: 20260512_1000
Revises: 20260511_1400
Create Date: 2026-05-12 10:00:00.000000+00:00

Optional group targeting for published notebooks.
"""
from alembic import op
import sqlalchemy as sa


revision = "20260512_1000"
down_revision = "20260511_1400"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "notebooks",
        sa.Column("group_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_notebooks_group_id",
        "notebooks",
        "groups",
        ["group_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_notebooks_group_id", "notebooks", ["group_id"], unique=False)
    op.create_index(
        "ix_notebooks_group_published_created",
        "notebooks",
        ["group_id", "is_published", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_notebooks_group_published_created", table_name="notebooks")
    op.drop_index("ix_notebooks_group_id", table_name="notebooks")
    op.drop_constraint("fk_notebooks_group_id", "notebooks", type_="foreignkey")
    op.drop_column("notebooks", "group_id")
