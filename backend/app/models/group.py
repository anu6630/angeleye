from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    slug = Column(String(80), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    visibility = Column(String(20), nullable=False, server_default="public")
    join_policy = Column(String(20), nullable=False, server_default="open")
    created_by_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    icon_url = Column(String(500), nullable=True)
    icon_s3_key = Column(String(500), nullable=True)
    icon_uploaded_at = Column(DateTime(timezone=True), nullable=True)
    banner_url = Column(String(500), nullable=True)
    banner_s3_key = Column(String(500), nullable=True)
    banner_uploaded_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    creator = relationship("User", foreign_keys=[created_by_user_id], back_populates="groups_created")
    memberships = relationship(
        "GroupMembership", back_populates="group", cascade="all, delete-orphan"
    )
    invites = relationship("GroupInvite", back_populates="group", cascade="all, delete-orphan")
    admin_promotion_requests = relationship(
        "GroupAdminPromotionRequest", back_populates="group", cascade="all, delete-orphan"
    )
    notebooks = relationship("Notebook", back_populates="group")


class GroupMembership(Base):
    __tablename__ = "group_memberships"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False, server_default="member")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    group = relationship("Group", back_populates="memberships")
    user = relationship("User", back_populates="group_memberships")

    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_membership"),
    )


class GroupInvite(Base):
    __tablename__ = "group_invites"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    inviter_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    invitee_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), nullable=False, server_default="pending")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    group = relationship("Group", back_populates="invites")
    inviter = relationship("User", foreign_keys=[inviter_user_id], back_populates="group_invites_sent")
    invitee = relationship("User", foreign_keys=[invitee_user_id], back_populates="group_invites_received")

    __table_args__ = (
        Index(
            "ix_group_invites_pending_unique",
            "group_id",
            "invitee_user_id",
            unique=True,
            postgresql_where=text("status = 'pending'"),
        ),
    )


class GroupAdminPromotionRequest(Base):
    __tablename__ = "group_admin_promotion_requests"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    proposer_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), nullable=False, server_default="pending")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    group = relationship("Group", back_populates="admin_promotion_requests")
    proposer = relationship(
        "User", foreign_keys=[proposer_user_id], back_populates="group_admin_requests_proposed"
    )
    candidate = relationship(
        "User", foreign_keys=[candidate_user_id], back_populates="group_admin_requests_received"
    )

    __table_args__ = (
        Index(
            "ix_group_admin_promo_pending_unique",
            "group_id",
            "candidate_user_id",
            unique=True,
            postgresql_where=text("status = 'pending'"),
        ),
    )
