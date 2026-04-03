from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Self-referential relationship for threaded replies
    parent = relationship("Comment", remote_side=[id], backref="replies")

    # Relationships
    user = relationship("User", back_populates="comments")
    notebook = relationship("Notebook", back_populates="comments")

    __table_args__ = (
        Index('ix_comments_id', 'id'),
        Index('ix_comments_notebook_id', 'notebook_id'),
        Index('ix_comments_user_id', 'user_id'),
        Index('ix_comments_parent_id', 'parent_id'),
        Index('ix_comments_created_at', 'created_at'),
    )
