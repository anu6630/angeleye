"""add_groups

Revision ID: 20260511_1400
Revises: 20260510_1200
Create Date: 2026-05-11 14:00:00.000000+00:00

Groups, memberships, invites, admin promotion requests.
"""
from alembic import op
import sqlalchemy as sa


revision = "20260511_1400"
down_revision = "20260510_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "groups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("visibility", sa.String(length=20), server_default="public", nullable=False),
        sa.Column("join_policy", sa.String(length=20), server_default="open", nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("icon_url", sa.String(length=500), nullable=True),
        sa.Column("icon_s3_key", sa.String(length=500), nullable=True),
        sa.Column("icon_uploaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("banner_url", sa.String(length=500), nullable=True),
        sa.Column("banner_s3_key", sa.String(length=500), nullable=True),
        sa.Column("banner_uploaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name="fk_groups_created_by_user_id",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_groups_slug"),
    )
    op.create_index("ix_groups_id", "groups", ["id"], unique=False)
    op.create_index("ix_groups_slug", "groups", ["slug"], unique=False)
    op.create_index("ix_groups_created_by_user_id", "groups", ["created_by_user_id"], unique=False)

    op.create_table(
        "group_memberships",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=20), server_default="member", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], name="fk_group_memberships_group_id", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_group_memberships_user_id", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_id", "user_id", name="uq_group_membership"),
    )
    op.create_index("ix_group_memberships_id", "group_memberships", ["id"], unique=False)
    op.create_index("ix_group_memberships_group_id", "group_memberships", ["group_id"], unique=False)
    op.create_index("ix_group_memberships_user_id", "group_memberships", ["user_id"], unique=False)

    op.create_table(
        "group_invites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("inviter_user_id", sa.Integer(), nullable=False),
        sa.Column("invitee_user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], name="fk_group_invites_group_id", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["inviter_user_id"], ["users.id"], name="fk_group_invites_inviter", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["invitee_user_id"], ["users.id"], name="fk_group_invites_invitee", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_group_invites_id", "group_invites", ["id"], unique=False)
    op.create_index("ix_group_invites_group_id", "group_invites", ["group_id"], unique=False)
    op.create_index("ix_group_invites_inviter_user_id", "group_invites", ["inviter_user_id"], unique=False)
    op.create_index("ix_group_invites_invitee_user_id", "group_invites", ["invitee_user_id"], unique=False)
    op.create_index(
        "ix_group_invites_pending_unique",
        "group_invites",
        ["group_id", "invitee_user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )

    op.create_table(
        "group_admin_promotion_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("proposer_user_id", sa.Integer(), nullable=False),
        sa.Column("candidate_user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["group_id"], ["groups.id"], name="fk_group_admin_promo_group_id", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["proposer_user_id"], ["users.id"], name="fk_group_admin_promo_proposer", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["candidate_user_id"], ["users.id"], name="fk_group_admin_promo_candidate", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_group_admin_promotion_requests_id", "group_admin_promotion_requests", ["id"], unique=False
    )
    op.create_index(
        "ix_group_admin_promotion_requests_group_id",
        "group_admin_promotion_requests",
        ["group_id"],
        unique=False,
    )
    op.create_index(
        "ix_group_admin_promotion_requests_proposer_user_id",
        "group_admin_promotion_requests",
        ["proposer_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_group_admin_promotion_requests_candidate_user_id",
        "group_admin_promotion_requests",
        ["candidate_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_group_admin_promo_pending_unique",
        "group_admin_promotion_requests",
        ["group_id", "candidate_user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )


def downgrade() -> None:
    op.drop_index("ix_group_admin_promo_pending_unique", table_name="group_admin_promotion_requests")
    op.drop_index("ix_group_admin_promotion_requests_candidate_user_id", table_name="group_admin_promotion_requests")
    op.drop_index("ix_group_admin_promotion_requests_proposer_user_id", table_name="group_admin_promotion_requests")
    op.drop_index("ix_group_admin_promotion_requests_group_id", table_name="group_admin_promotion_requests")
    op.drop_index("ix_group_admin_promotion_requests_id", table_name="group_admin_promotion_requests")
    op.drop_table("group_admin_promotion_requests")

    op.drop_index("ix_group_invites_pending_unique", table_name="group_invites")
    op.drop_index("ix_group_invites_invitee_user_id", table_name="group_invites")
    op.drop_index("ix_group_invites_inviter_user_id", table_name="group_invites")
    op.drop_index("ix_group_invites_group_id", table_name="group_invites")
    op.drop_index("ix_group_invites_id", table_name="group_invites")
    op.drop_table("group_invites")

    op.drop_index("ix_group_memberships_user_id", table_name="group_memberships")
    op.drop_index("ix_group_memberships_group_id", table_name="group_memberships")
    op.drop_index("ix_group_memberships_id", table_name="group_memberships")
    op.drop_table("group_memberships")

    op.drop_index("ix_groups_created_by_user_id", table_name="groups")
    op.drop_index("ix_groups_slug", table_name="groups")
    op.drop_index("ix_groups_id", table_name="groups")
    op.drop_table("groups")
