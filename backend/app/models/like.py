from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="likes")
    notebook = relationship("Notebook", back_populates="likes")

    __table_args__ = (
        UniqueConstraint('user_id', 'notebook_id', name='uq_user_notebook_like'),
        Index('ix_likes_id', 'id'),
        Index('ix_likes_user_id', 'user_id'),
        Index('ix_likes_notebook_id', 'notebook_id'),
    )
