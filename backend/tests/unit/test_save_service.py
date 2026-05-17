"""Unit tests for SaveService (saved / bookmarked notebooks)."""
import pytest
from sqlalchemy.orm import Session

from app.services.save_service import SaveService
from app.services.feed_service import FeedService
from tests.test_factories import create_user, create_notebook


class TestSaveServiceSave:
    def test_save_published(self, db_session: Session):
        svc = SaveService(db_session)
        user = create_user(db_session, username="saver")
        author = create_user(db_session, username="author")
        nb = create_notebook(db_session, user_id=author.id, title="Pub", is_published=True)
        row = svc.save(user.id, nb.id)
        assert row.user_id == user.id
        assert row.notebook_id == nb.id

    def test_save_duplicate(self, db_session: Session):
        svc = SaveService(db_session)
        user = create_user(db_session, username="u1")
        author = create_user(db_session, username="a1")
        nb = create_notebook(db_session, user_id=author.id, is_published=True)
        svc.save(user.id, nb.id)
        with pytest.raises(ValueError, match="Already saved"):
            svc.save(user.id, nb.id)

    def test_save_draft_fails(self, db_session: Session):
        svc = SaveService(db_session)
        user = create_user(db_session, username="u2")
        author = create_user(db_session, username="a2")
        nb = create_notebook(db_session, user_id=author.id, is_published=False)
        with pytest.raises(ValueError, match="not available to save"):
            svc.save(user.id, nb.id)

    def test_save_archived_fails(self, db_session: Session):
        svc = SaveService(db_session)
        user = create_user(db_session, username="u3")
        author = create_user(db_session, username="a3")
        nb = create_notebook(
            db_session,
            user_id=author.id,
            is_published=True,
            is_archived=True,
        )
        with pytest.raises(ValueError, match="not available to save"):
            svc.save(user.id, nb.id)

    def test_save_missing_notebook(self, db_session: Session):
        svc = SaveService(db_session)
        user = create_user(db_session, username="u4")
        with pytest.raises(ValueError, match="Notebook not found"):
            svc.save(user.id, 999_999)


class TestSaveServiceUnsave:
    def test_unsave(self, db_session: Session):
        svc = SaveService(db_session)
        user = create_user(db_session, username="u5")
        author = create_user(db_session, username="a5")
        nb = create_notebook(db_session, user_id=author.id, is_published=True)
        svc.save(user.id, nb.id)
        svc.unsave(user.id, nb.id)
        assert not svc.is_saved(user.id, nb.id)

    def test_unsave_not_saved(self, db_session: Session):
        svc = SaveService(db_session)
        user = create_user(db_session, username="u6")
        author = create_user(db_session, username="a6")
        nb = create_notebook(db_session, user_id=author.id, is_published=True)
        with pytest.raises(ValueError, match="Not saved"):
            svc.unsave(user.id, nb.id)


class TestSaveServiceQueries:
    def test_get_save_counts(self, db_session: Session):
        svc = SaveService(db_session)
        u1 = create_user(db_session, username="c1")
        u2 = create_user(db_session, username="c2")
        author = create_user(db_session, username="authc")
        n1 = create_notebook(db_session, user_id=author.id, is_published=True)
        n2 = create_notebook(db_session, user_id=author.id, is_published=True)
        svc.save(u1.id, n1.id)
        svc.save(u2.id, n1.id)
        svc.save(u1.id, n2.id)
        counts = svc.get_save_counts([n1.id, n2.id, 99999])
        assert counts.get(n1.id) == 2
        assert counts.get(n2.id) == 1
        assert 99999 not in counts

    def test_get_saved_notebook_ids(self, db_session: Session):
        svc = SaveService(db_session)
        user = create_user(db_session, username="u7")
        author = create_user(db_session, username="a7")
        n1 = create_notebook(db_session, user_id=author.id, is_published=True)
        n2 = create_notebook(db_session, user_id=author.id, is_published=True)
        svc.save(user.id, n1.id)
        ids = svc.get_saved_notebook_ids(user.id, [n1.id, n2.id, 999])
        assert ids == {n1.id}

    def test_list_saved_order(self, db_session: Session):
        svc = SaveService(db_session)
        user = create_user(db_session, username="u8")
        author = create_user(db_session, username="a8")
        n1 = create_notebook(db_session, user_id=author.id, title="First", is_published=True)
        n2 = create_notebook(db_session, user_id=author.id, title="Second", is_published=True)
        svc.save(user.id, n1.id)
        svc.save(user.id, n2.id)
        notebooks, next_c, has_more = svc.list_saved(user.id, limit=10)
        assert [nb.id for nb in notebooks] == [n2.id, n1.id]
        assert next_c is None
        assert has_more is False


class TestSaveFeedIntegration:
    def test_notebook_to_dict_is_saved(self, db_session: Session):
        viewer = create_user(db_session, username="viewer_is")
        author = create_user(db_session, username="author_is")
        nb = create_notebook(db_session, user_id=author.id, is_published=True)
        SaveService(db_session).save(viewer.id, nb.id)
        feed = FeedService(db_session)
        save_svc = SaveService(db_session)
        saved_ids = save_svc.get_saved_notebook_ids(viewer.id, [nb.id])
        save_counts = save_svc.get_save_counts([nb.id])
        d = feed._notebook_to_dict(nb, viewer.id, saved_ids, save_counts)
        assert d.get("is_saved") is True
        assert d.get("save_count") == 1

    def test_notebook_to_dict_not_saved(self, db_session: Session):
        viewer = create_user(db_session, username="viewer_ns")
        author = create_user(db_session, username="author_ns")
        nb = create_notebook(db_session, user_id=author.id, is_published=True)
        feed = FeedService(db_session)
        save_svc = SaveService(db_session)
        saved_ids = save_svc.get_saved_notebook_ids(viewer.id, [nb.id])
        save_counts = save_svc.get_save_counts([nb.id])
        d = feed._notebook_to_dict(nb, viewer.id, saved_ids, save_counts)
        assert d.get("is_saved") is False
        assert d.get("save_count") == 0
