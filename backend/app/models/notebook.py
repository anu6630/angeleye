from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Notebook(Base):
    __tablename__ = "notebooks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    is_published = Column(Boolean, default=False, nullable=False, index=True)

    # Pre-rendered output (STOR-03: outputs stored in S3/MinIO, VIEW-03: served via CDN)
    output_s3_key = Column(String(500), nullable=True)  # S3 key of latest output
    output_version = Column(String(50), nullable=True)  # Version timestamp
    output_url = Column(Text, nullable=True)  # Public CDN URL
    compiled_at = Column(DateTime(timezone=True), nullable=True)  # Last compilation time

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="notebooks")
    cells = relationship("NotebookCell", back_populates="notebook", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="notebook", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="notebook", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_notebooks_user_id', 'user_id'),
        Index('ix_notebooks_is_published', 'is_published'),
        Index('ix_notebooks_created_at', 'created_at'),
    )
