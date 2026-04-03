from sqlalchemy import Column, Integer, String, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class NotebookCell(Base):
    __tablename__ = "notebook_cells"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False, index=True)
    cell_type = Column(String(50), nullable=False)  # "code" or "markdown"
    content = Column(Text, nullable=False)
    order_index = Column(Integer, nullable=False)  # For cell ordering
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    notebook = relationship("Notebook", back_populates="cells")

    __table_args__ = (
        Index('ix_notebook_cells_id', 'id'),
        Index('ix_notebook_cells_notebook_id', 'notebook_id'),
    )
