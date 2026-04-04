from sqlalchemy import Column, Integer, String, BigInteger, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Dataset(Base):
    """
    Dataset model for CSV file uploads.

    NOTE-03: User can upload datasets (CSV files)
    STOR-01: Datasets stored in MinIO
    STOR-02: Dataset files have cryptographically secure URLs with expiration
    SEC-03: Dataset access restricted to notebook owner and viewers
    FORK-02: Dataset forking matches notebook model structure
    """
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    content_type = Column(String(100), nullable=False)
    s3_key = Column(String(500), nullable=False, unique=True)
    row_count = Column(Integer, nullable=True)

    # Fork lineage tracking (FORK-02: matches notebook model structure)
    parent_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True, index=True)
    root_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="datasets")

    # Self-referential relationships for fork lineage
    parent = relationship("Dataset", remote_side=[id], foreign_keys=[parent_id], backref="forks")
    root = relationship("Dataset", remote_side=[id], foreign_keys=[root_id])

    __table_args__ = (
        Index('ix_datasets_user_id', 'user_id'),
        Index('ix_datasets_created_at', 'created_at'),
        Index('ix_datasets_parent_id', 'parent_id'),
        Index('ix_datasets_root_id', 'root_id'),
    )
