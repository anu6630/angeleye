"""add_notebook_saves

Revision ID: 20260510_1200
Revises: 20260508_0100
Create Date: 2026-05-10 12:00:00.000000+00:00

User bookmark table for published notebooks (Saved / Facebook-style).
"""
from alembic import op
import sqlalchemy as sa


revision = "20260510_1200"
down_revision = "20260508_0100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notebook_saves",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("notebook_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["notebook_id"], ["notebooks.id"], name="fk_notebook_saves_notebook_id", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_notebook_saves_user_id", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "notebook_id", name="uq_user_notebook_save"),
    )
    op.create_index("ix_notebook_saves_id", "notebook_saves", ["id"], unique=False)
    op.create_index("ix_notebook_saves_user_id", "notebook_saves", ["user_id"], unique=False)
    op.create_index("ix_notebook_saves_notebook_id", "notebook_saves", ["notebook_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_notebook_saves_notebook_id", table_name="notebook_saves")
    op.drop_index("ix_notebook_saves_user_id", table_name="notebook_saves")
    op.drop_index("ix_notebook_saves_id", table_name="notebook_saves")
    op.drop_table("notebook_saves")
