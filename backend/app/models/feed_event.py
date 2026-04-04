from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class FeedEvent(Base):
    """
    FeedEvent model for tracking user engagement events.

    DISC-02: ML-driven feeds use engagement data for trending algorithm
    FORK-05: Event tracking for A/B tests and personalization
    """
    __tablename__ = "feed_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True)  # 'impression', 'click', 'like', 'comment', 'time_spent'
    bucket_id = Column(String(100), nullable=True, index=True)  # Future A/B tests
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    event_metadata = Column(JSON, nullable=True)  # Future: device, location, referrer (renamed from 'metadata' to avoid SQLAlchemy reserved name)

    # Relationships
    user = relationship("User", back_populates="feed_events")
    notebook = relationship("Notebook")

    __table_args__ = (
        Index('ix_feed_events_id', 'id'),
        Index('ix_feed_events_user_id', 'user_id'),
        Index('ix_feed_events_notebook_id', 'notebook_id'),
        Index('ix_feed_events_event_type', 'event_type'),
        Index('ix_feed_events_bucket_id', 'bucket_id'),
        Index('ix_feed_events_timestamp', 'timestamp'),
        Index('ix_feed_events_user_timestamp', 'user_id', 'timestamp'),
        Index('ix_feed_events_notebook_type', 'notebook_id', 'event_type'),
    )
