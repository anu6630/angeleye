"""Friend service state machine tests (SQLite)."""

import pytest
from app.models.user import User
from app.models.friend import FriendRequest, Friendship
from app.services.friend_service import FriendService


def _user(db, email: str, username: str) -> User:
    u = User(email=email, username=username, is_active=True, is_verified=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def test_send_accept_friendship(db_session):
    a = _user(db_session, "a@x.com", "usera")
    b = _user(db_session, "b@x.com", "userb")
    svc = FriendService(db_session)
    r = svc.send_request(a.id, b.id)
    assert r.status == "pending"
    svc.accept_request(r.id, b.id)
    assert svc.are_friends(a.id, b.id)
    row = db_session.query(Friendship).one()
    assert row.user_low_id == a.id and row.user_high_id == b.id


def test_cannot_duplicate_pending(db_session):
    a = _user(db_session, "a@x.com", "usera")
    b = _user(db_session, "b@x.com", "userb")
    svc = FriendService(db_session)
    svc.send_request(a.id, b.id)
    with pytest.raises(ValueError, match="already pending"):
        svc.send_request(a.id, b.id)


def test_reverse_pending_blocked(db_session):
    a = _user(db_session, "a@x.com", "usera")
    b = _user(db_session, "b@x.com", "userb")
    svc = FriendService(db_session)
    svc.send_request(a.id, b.id)
    with pytest.raises(ValueError, match="already sent you"):
        svc.send_request(b.id, a.id)


def test_remove_friendship(db_session):
    a = _user(db_session, "a@x.com", "usera")
    b = _user(db_session, "b@x.com", "userb")
    svc = FriendService(db_session)
    r = svc.send_request(a.id, b.id)
    svc.accept_request(r.id, b.id)
    assert svc.remove_friendship(a.id, b.id) is True
    assert not svc.are_friends(a.id, b.id)
