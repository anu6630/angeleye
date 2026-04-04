from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Notebook(Base):
    __tablename__ = "notebooks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    is_published = Column(Boolean, default=False, nullable=False, index=True)

    # Fork lineage tracking (FORK-01: parent_id for immediate parent, root_id for ultimate original)
    parent_id = Column(Integer, ForeignKey("notebooks.id", ondelete="SET NULL"), nullable=True, index=True)
    root_id = Column(Integer, ForeignKey("notebooks.id", ondelete="SET NULL"), nullable=True, index=True)

    # Soft delete with archive (FORK-03: is_archived hides from feeds/search but direct URLs work)
    is_archived = Column(Boolean, default=False, nullable=False, index=True)

    # Pre-rendered output (STOR-03: outputs stored in S3/MinIO, VIEW-03: served via CDN)
    output_s3_key = Column(String(500), nullable=True)  # S3 key of latest output
    output_version = Column(String(50), nullable=True)  # Version timestamp
    output_url = Column(Text, nullable=True)  # Public CDN URL
    compiled_at = Column(DateTime(timezone=True), nullable=True)  # Last compilation time

    # View count (DISC-05: View tracking via Redis, batch synced to DB)
    # Per CONTEXT.md D-31: Stored in Redis, synced to DB every 5 minutes
    view_count = Column(Integer, nullable=True, server_default='0')

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="notebooks")
    cells = relationship("NotebookCell", back_populates="notebook", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="notebook", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="notebook", cascade="all, delete-orphan")

    # Self-referential relationships for fork lineage
    parent = relationship("Notebook", remote_side=[id], foreign_keys=[parent_id], backref="forks")
    root = relationship("Notebook", remote_side=[id], foreign_keys=[root_id])
