from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.notebook import Notebook
from app.models.notebook_save import NotebookSave


class SaveService:
    """Bookmark published notebooks for later viewing (Saved)."""

    def __init__(self, db: Session):
        self.db = db

    def save(self, user_id: int, notebook_id: int) -> NotebookSave:
        notebook = (
            self.db.query(Notebook)
            .filter(Notebook.id == notebook_id)
            .first()
        )
        if not notebook:
            raise ValueError("Notebook not found")
        if not notebook.is_published or notebook.is_archived:
            raise ValueError("Notebook is not available to save")

        existing = (
            self.db.query(NotebookSave)
            .filter(
                NotebookSave.user_id == user_id,
                NotebookSave.notebook_id == notebook_id,
            )
            .first()
        )
        if existing:
            raise ValueError("Already saved")

        row = NotebookSave(user_id=user_id, notebook_id=notebook_id)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def unsave(self, user_id: int, notebook_id: int) -> None:
        row = (
            self.db.query(NotebookSave)
            .filter(
                NotebookSave.user_id == user_id,
                NotebookSave.notebook_id == notebook_id,
            )
            .first()
        )
        if not row:
            raise ValueError("Not saved")
        self.db.delete(row)
        self.db.commit()

    def get_save_counts(self, notebook_ids: List[int]) -> Dict[int, int]:
        """How many users saved each notebook (public aggregate)."""
        if not notebook_ids:
            return {}
        rows = (
            self.db.query(NotebookSave.notebook_id, func.count(NotebookSave.id))
            .filter(NotebookSave.notebook_id.in_(notebook_ids))
            .group_by(NotebookSave.notebook_id)
            .all()
        )
        return {int(nid): int(cnt) for nid, cnt in rows}

    def get_saved_notebook_ids(self, user_id: int, notebook_ids: List[int]) -> Set[int]:
        if not notebook_ids:
            return set()
        rows = (
            self.db.query(NotebookSave.notebook_id)
            .filter(
                NotebookSave.user_id == user_id,
                NotebookSave.notebook_id.in_(notebook_ids),
            )
            .all()
        )
        return {r[0] for r in rows}

    def is_saved(self, user_id: int, notebook_id: int) -> bool:
        return (
            self.db.query(NotebookSave.id)
            .filter(
                NotebookSave.user_id == user_id,
                NotebookSave.notebook_id == notebook_id,
            )
            .first()
            is not None
        )

    def list_saved(
        self,
        user_id: int,
        limit: int = 50,
        cursor: Optional[str] = None,
    ) -> Tuple[List[Notebook], Optional[str], bool]:
        limit = min(max(limit, 1), 100)

        q = (
            self.db.query(NotebookSave)
            .join(Notebook, Notebook.id == NotebookSave.notebook_id)
            .options(joinedload(NotebookSave.notebook).joinedload(Notebook.user))
            .filter(NotebookSave.user_id == user_id)
            .filter(Notebook.is_published.is_(True))
            .filter(Notebook.is_archived.is_(False))
        )

        if cursor:
            try:
                cursor_time = datetime.fromisoformat(cursor.replace("Z", "+00:00"))
                if cursor_time.tzinfo is None:
                    cursor_time = cursor_time.replace(tzinfo=timezone.utc)
                q = q.filter(NotebookSave.created_at < cursor_time)
            except ValueError:
                pass

        q = q.order_by(NotebookSave.created_at.desc(), NotebookSave.id.desc())

        rows = q.limit(limit + 1).all()
        has_more = len(rows) > limit
        rows = rows[:limit]

        notebooks: List[Notebook] = []
        for save_row in rows:
            nb = save_row.notebook
            if nb is not None:
                notebooks.append(nb)

        next_cursor: Optional[str] = None
        if has_more and rows:
            next_cursor = rows[-1].created_at.isoformat()

        return notebooks, next_cursor, has_more
