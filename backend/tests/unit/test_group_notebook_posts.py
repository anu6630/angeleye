"""Group-scoped notebook posts: visibility and feed listing."""

from app.models.group import GroupMembership
from app.models.notebook import Notebook
from app.models.user import User
from app.services.feed_service import FeedService
from app.services.group_service import (
    GroupService,
    JOIN_OPEN,
    ROLE_MEMBER,
    VISIBILITY_PRIVATE,
    VISIBILITY_PUBLIC,
)
from app.services.notebook_service import NotebookService


def _user(db, username: str) -> User:
    u = User(
        email=f"{username}@example.com",
        username=username,
        is_active=True,
        is_verified=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def test_can_view_public_group_post_anonymous(db_session):
    a = _user(db_session, "alice")
    gs = GroupService(db_session)
    g = gs.create_group(a.id, "G", "gpub", None, VISIBILITY_PUBLIC, JOIN_OPEN)
    nb = Notebook(user_id=a.id, title="N", is_published=True, group_id=g.id)
    db_session.add(nb)
    db_session.commit()
    svc = NotebookService(db_session)
    assert svc.can_view_notebook(nb, None) is True
    assert svc.can_view_notebook(nb, 999) is True


def test_can_view_private_group_post_non_member(db_session):
    a = _user(db_session, "alice")
    b = _user(db_session, "bob")
    gs = GroupService(db_session)
    g = gs.create_group(a.id, "G", "gpriv", None, VISIBILITY_PRIVATE, JOIN_OPEN)
    nb = Notebook(user_id=a.id, title="N", is_published=True, group_id=g.id)
    db_session.add(nb)
    db_session.commit()
    svc = NotebookService(db_session)
    assert svc.can_view_notebook(nb, b.id) is False
    assert svc.can_view_notebook(nb, a.id) is True


def test_can_view_private_group_post_member(db_session):
    a = _user(db_session, "alice")
    b = _user(db_session, "bob")
    gs = GroupService(db_session)
    g = gs.create_group(a.id, "G", "gpriv2", None, VISIBILITY_PRIVATE, JOIN_OPEN)
    db_session.add(
        GroupMembership(group_id=g.id, user_id=b.id, role=ROLE_MEMBER)
    )
    db_session.commit()
    nb = Notebook(user_id=a.id, title="N", is_published=True, group_id=g.id)
    db_session.add(nb)
    db_session.commit()
    svc = NotebookService(db_session)
    assert svc.can_view_notebook(nb, b.id) is True


def test_list_group_feed_only_group_posts(db_session):
    a = _user(db_session, "alice")
    gs = GroupService(db_session)
    g = gs.create_group(a.id, "G", "grpfeed", None, VISIBILITY_PUBLIC, JOIN_OPEN)
    nb_group = Notebook(user_id=a.id, title="In group", is_published=True, group_id=g.id)
    nb_global = Notebook(user_id=a.id, title="Global", is_published=True, group_id=None)
    db_session.add_all([nb_group, nb_global])
    db_session.commit()
    feed = FeedService(db_session).list_group_feed(g.id, a.id, limit=20)
    ids = [x["id"] for x in feed["items"]]
    assert nb_group.id in ids
    assert nb_global.id not in ids


def test_get_notebooks_by_ids_excludes_group_posts(db_session):
    a = _user(db_session, "alice")
    gs = GroupService(db_session)
    g = gs.create_group(a.id, "G", "excl", None, VISIBILITY_PUBLIC, JOIN_OPEN)
    nb_group = Notebook(user_id=a.id, title="G", is_published=True, group_id=g.id)
    nb_global = Notebook(user_id=a.id, title="R", is_published=True, group_id=None)
    db_session.add_all([nb_group, nb_global])
    db_session.commit()
    fs = FeedService(db_session)
    out = fs._get_notebooks_by_ids([nb_group.id, nb_global.id])
    ids = [n.id for n in out]
    assert nb_global.id in ids
    assert nb_group.id not in ids
