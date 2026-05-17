from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class NotebookSave(Base):
    """User saved (bookmarked) published notebook for later viewing."""

    __tablename__ = "notebook_saves"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="notebook_saves")
    notebook = relationship("Notebook", back_populates="notebook_saves")

    __table_args__ = (
        UniqueConstraint("user_id", "notebook_id", name="uq_user_notebook_save"),
    )
