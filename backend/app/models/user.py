from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # OAuth fields
    google_oauth_id = Column(String(255), unique=True, nullable=True, index=True)
    facebook_oauth_id = Column(String(255), unique=True, nullable=True, index=True)

    # Password authentication (nullable for OAuth-only users)
    password_hash = Column(String(255), nullable=True)

    # E2EE Public Key registry
    public_key = Column(Text, nullable=True)

    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notebooks = relationship("Notebook", back_populates="user", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    datasets = relationship("Dataset", back_populates="user", cascade="all, delete-orphan")

    # Social relationships (DISC-01: follow system for social graph)
    followers = relationship("Follow", foreign_keys="Follow.following_id", back_populates="following")
    following = relationship("Follow", foreign_keys="Follow.follower_id", back_populates="follower")
    feed_events = relationship("FeedEvent", back_populates="user", cascade="all, delete-orphan")
    notebook_saves = relationship("NotebookSave", back_populates="user", cascade="all, delete-orphan")

    groups_created = relationship(
        "Group", foreign_keys="Group.created_by_user_id", back_populates="creator"
    )
    group_memberships = relationship("GroupMembership", back_populates="user")
    group_invites_sent = relationship(
        "GroupInvite", foreign_keys="GroupInvite.inviter_user_id", back_populates="inviter"
    )
    group_invites_received = relationship(
        "GroupInvite", foreign_keys="GroupInvite.invitee_user_id", back_populates="invitee"
    )
    group_admin_requests_proposed = relationship(
        "GroupAdminPromotionRequest",
        foreign_keys="GroupAdminPromotionRequest.proposer_user_id",
        back_populates="proposer",
    )
    group_admin_requests_received = relationship(
        "GroupAdminPromotionRequest",
        foreign_keys="GroupAdminPromotionRequest.candidate_user_id",
        back_populates="candidate",
    )

    friend_requests_sent = relationship(
        "FriendRequest", foreign_keys="FriendRequest.requester_id", back_populates="requester"
    )
    friend_requests_received = relationship(
        "FriendRequest", foreign_keys="FriendRequest.addressee_id", back_populates="addressee"
    )
    friendships_low = relationship(
        "Friendship", foreign_keys="Friendship.user_low_id", back_populates="user_low"
    )
    friendships_high = relationship(
        "Friendship", foreign_keys="Friendship.user_high_id", back_populates="user_high"
    )
    conversation_participations = relationship("ConversationParticipant", back_populates="user")
    messages_sent = relationship("Message", back_populates="sender")
    message_reactions = relationship("MessageReaction", back_populates="user")

    __table_args__ = (
        Index('ix_users_email_lower', func.lower(email)),
        Index('ix_users_username_lower', func.lower(username)),
    )
