"""Unit tests for GroupService."""
import pytest

from app.models.user import User
from app.services.group_service import (
    GroupService,
    JOIN_INVITE_ONLY,
    JOIN_OPEN,
    ROLE_ADMIN,
    ROLE_MEMBER,
    VISIBILITY_PRIVATE,
    VISIBILITY_PUBLIC,
)


def _user(db, username: str, email: str) -> User:
    u = User(
        email=email,
        username=username,
        is_active=True,
        is_verified=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def test_create_group_creator_is_admin(db_session):
    a = _user(db_session, "alice", "alice@example.com")
    svc = GroupService(db_session)
    g = svc.create_group(
        a.id,
        "My Group",
        "my-group",
        "desc",
        VISIBILITY_PUBLIC,
        JOIN_OPEN,
    )
    assert g.slug == "my-group"
    assert svc.is_admin(g.id, a.id)
    assert svc.is_member(g.id, a.id)


def test_private_group_hidden_from_non_member(db_session):
    a = _user(db_session, "alice", "alice@example.com")
    b = _user(db_session, "bob", "bob@example.com")
    svc = GroupService(db_session)
    g = svc.create_group(
        a.id,
        "Secret",
        "secret",
        None,
        VISIBILITY_PRIVATE,
        JOIN_OPEN,
    )
    assert svc.get_group_visible("secret", b.id) is None
    assert svc.get_group_visible("secret", a.id) is not None


def test_open_join(db_session):
    a = _user(db_session, "alice", "alice@example.com")
    b = _user(db_session, "bob", "bob@example.com")
    svc = GroupService(db_session)
    g = svc.create_group(a.id, "G", "g", None, VISIBILITY_PUBLIC, JOIN_OPEN)
    svc.join_group("g", b.id)
    assert svc.is_member(g.id, b.id)
    m = svc.get_membership(g.id, b.id)
    assert m.role == ROLE_MEMBER


def test_invite_only_blocks_join(db_session):
    a = _user(db_session, "alice", "alice@example.com")
    b = _user(db_session, "bob", "bob@example.com")
    svc = GroupService(db_session)
    svc.create_group(a.id, "G", "g", None, VISIBILITY_PUBLIC, JOIN_INVITE_ONLY)
    with pytest.raises(ValueError, match="invite only"):
        svc.join_group("g", b.id)


def test_invite_flow(db_session):
    a = _user(db_session, "alice", "alice@example.com")
    b = _user(db_session, "bob", "bob@example.com")
    svc = GroupService(db_session)
    g = svc.create_group(a.id, "G", "g", None, VISIBILITY_PUBLIC, JOIN_INVITE_ONLY)
    inv = svc.create_invite("g", a.id, b.id)
    svc.accept_invite("g", inv.id, b.id)
    assert svc.is_member(g.id, b.id)


def test_admin_promotion_accept(db_session):
    a = _user(db_session, "alice", "alice@example.com")
    b = _user(db_session, "bob", "bob@example.com")
    svc = GroupService(db_session)
    g = svc.create_group(a.id, "G", "g", None, VISIBILITY_PUBLIC, JOIN_OPEN)
    svc.join_group("g", b.id)
    req = svc.create_admin_promotion_request("g", a.id, b.id)
    svc.accept_admin_promotion("g", req.id, b.id)
    assert svc.is_admin(g.id, b.id)


def test_slugify_name():
    from app.services.group_service import slugify_name

    assert slugify_name("Hello World!") == "hello-world"
    assert slugify_name("___") == "group"
