from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    avatar_s3_key = Column(String(500), nullable=True)
    avatar_thumbnail_s3_key = Column(String(500), nullable=True)
    avatar_uploaded_at = Column(DateTime(timezone=True), nullable=True)
    avatar_content_type = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="profile")
