"""add conversations and messages

Revision ID: 20260513_1600
Revises: 20260513_1500
Create Date: 2026-05-13 16:00:00.000000+00:00

Direct message threads, messages, reactions.
"""
from alembic import op
import sqlalchemy as sa


revision = "20260513_1600"
down_revision = "20260513_1500"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "conversations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("direct_user_low_id", sa.Integer(), nullable=True),
        sa.Column("direct_user_high_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["direct_user_high_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["direct_user_low_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_conversations_direct_user_high_id"), "conversations", ["direct_user_high_id"], unique=False)
    op.create_index(op.f("ix_conversations_direct_user_low_id"), "conversations", ["direct_user_low_id"], unique=False)
    op.create_index(op.f("ix_conversations_id"), "conversations", ["id"], unique=False)
    op.create_index(op.f("ix_conversations_type"), "conversations", ["type"], unique=False)
    op.create_index(
        "uq_conversations_direct_pair",
        "conversations",
        ["direct_user_low_id", "direct_user_high_id"],
        unique=True,
        postgresql_where=sa.text("type = 'direct' AND direct_user_low_id IS NOT NULL"),
    )

    op.create_table(
        "conversation_participants",
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("conversation_id", "user_id"),
    )

    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("quoted_message_id", sa.Integer(), nullable=True),
        sa.Column("attachment_key", sa.String(length=512), nullable=True),
        sa.Column("attachment_mime", sa.String(length=128), nullable=True),
        sa.Column("attachment_size", sa.BigInteger(), nullable=True),
        sa.Column("attachment_filename", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["quoted_message_id"], ["messages.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_messages_conversation_id"), "messages", ["conversation_id"], unique=False)
    op.create_index(op.f("ix_messages_created_at"), "messages", ["created_at"], unique=False)
    op.create_index(op.f("ix_messages_id"), "messages", ["id"], unique=False)
    op.create_index(op.f("ix_messages_quoted_message_id"), "messages", ["quoted_message_id"], unique=False)
    op.create_index(op.f("ix_messages_sender_id"), "messages", ["sender_id"], unique=False)
    op.create_index("ix_messages_conversation_id_id", "messages", ["conversation_id", "id"], unique=False)

    op.create_table(
        "message_reactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("message_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("emoji", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "user_id", "emoji", name="uq_message_reaction_user_emoji"),
    )
    op.create_index(op.f("ix_message_reactions_id"), "message_reactions", ["id"], unique=False)
    op.create_index(op.f("ix_message_reactions_message_id"), "message_reactions", ["message_id"], unique=False)
    op.create_index(op.f("ix_message_reactions_user_id"), "message_reactions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_message_reactions_user_id"), table_name="message_reactions")
    op.drop_index(op.f("ix_message_reactions_message_id"), table_name="message_reactions")
    op.drop_index(op.f("ix_message_reactions_id"), table_name="message_reactions")
    op.drop_table("message_reactions")
    op.drop_index("ix_messages_conversation_id_id", table_name="messages")
    op.drop_index(op.f("ix_messages_sender_id"), table_name="messages")
    op.drop_index(op.f("ix_messages_quoted_message_id"), table_name="messages")
    op.drop_index(op.f("ix_messages_id"), table_name="messages")
    op.drop_index(op.f("ix_messages_created_at"), table_name="messages")
    op.drop_index(op.f("ix_messages_conversation_id"), table_name="messages")
    op.drop_table("messages")
    op.drop_table("conversation_participants")
    op.drop_index("uq_conversations_direct_pair", table_name="conversations", postgresql_where=sa.text("type = 'direct' AND direct_user_low_id IS NOT NULL"))
    op.drop_index(op.f("ix_conversations_type"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_id"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_direct_user_low_id"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_direct_user_high_id"), table_name="conversations")
    op.drop_table("conversations")
