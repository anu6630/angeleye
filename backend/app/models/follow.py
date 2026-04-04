from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Follow(Base):
    """
    Follow model for user-to-user relationships.

    DISC-01: Users can follow other users to see their content in feed
    DISC-02: One-way follow relationship (Twitter/Instagram style)
    """
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following = relationship("User", foreign_keys=[following_id], back_populates="followers")

    __table_args__ = (
        UniqueConstraint('follower_id', 'following_id', name='uq_follow'),
        Index('ix_follows_id', 'id'),
        Index('ix_follows_follower_id', 'follower_id'),
        Index('ix_follows_following_id', 'following_id'),
    )
