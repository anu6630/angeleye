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

    __table_args__ = (
        Index('ix_notebooks_user_id', 'user_id'),
        Index('ix_notebooks_is_published', 'is_published'),
        Index('ix_notebooks_created_at', 'created_at'),
        Index('ix_notebooks_parent_id', 'parent_id'),
        Index('ix_notebooks_root_id', 'root_id'),
        Index('ix_notebooks_is_archived', 'is_archived'),
    )
