"""add friends tables

Revision ID: 20260513_1500
Revises: 20260512_1000
Create Date: 2026-05-13 15:00:00.000000+00:00

Friend requests and normalized mutual friendships.
"""
from alembic import op
import sqlalchemy as sa


revision = "20260513_1500"
down_revision = "20260512_1000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "friend_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("requester_id", sa.Integer(), nullable=False),
        sa.Column("addressee_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["addressee_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requester_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_friend_requests_addressee_id"), "friend_requests", ["addressee_id"], unique=False)
    op.create_index(op.f("ix_friend_requests_id"), "friend_requests", ["id"], unique=False)
    op.create_index(op.f("ix_friend_requests_requester_id"), "friend_requests", ["requester_id"], unique=False)
    op.create_index(op.f("ix_friend_requests_status"), "friend_requests", ["status"], unique=False)
    op.create_index("ix_friend_requests_addressee_status", "friend_requests", ["addressee_id", "status"], unique=False)
    op.create_index("ix_friend_requests_requester_status", "friend_requests", ["requester_id", "status"], unique=False)
    op.create_index(
        "ix_friend_requests_pending_pair",
        "friend_requests",
        ["requester_id", "addressee_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )

    op.create_table(
        "friendships",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_low_id", sa.Integer(), nullable=False),
        sa.Column("user_high_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_high_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_low_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_low_id", "user_high_id", name="uq_friendship_pair"),
    )
    op.create_index(op.f("ix_friendships_id"), "friendships", ["id"], unique=False)
    op.create_index(op.f("ix_friendships_user_high_id"), "friendships", ["user_high_id"], unique=False)
    op.create_index(op.f("ix_friendships_user_low_id"), "friendships", ["user_low_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_friendships_user_low_id"), table_name="friendships")
    op.drop_index(op.f("ix_friendships_user_high_id"), table_name="friendships")
    op.drop_index(op.f("ix_friendships_id"), table_name="friendships")
    op.drop_table("friendships")
    op.drop_index("ix_friend_requests_pending_pair", table_name="friend_requests", postgresql_where=sa.text("status = 'pending'"))
    op.drop_index("ix_friend_requests_requester_status", table_name="friend_requests")
    op.drop_index("ix_friend_requests_addressee_status", table_name="friend_requests")
    op.drop_index(op.f("ix_friend_requests_status"), table_name="friend_requests")
    op.drop_index(op.f("ix_friend_requests_requester_id"), table_name="friend_requests")
    op.drop_index(op.f("ix_friend_requests_id"), table_name="friend_requests")
    op.drop_index(op.f("ix_friend_requests_addressee_id"), table_name="friend_requests")
    op.drop_table("friend_requests")
