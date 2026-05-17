"""Conversation / messaging service tests (SQLite, Redis mocked)."""

from unittest.mock import patch

import pytest
from app.models.user import User
from app.services.friend_service import FriendService
from app.services.conversation_service import ConversationService


def _user(db, email: str, username: str) -> User:
    u = User(email=email, username=username, is_active=True, is_verified=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _make_friends(db, svc: FriendService, a: User, b: User):
    r = svc.send_request(a.id, b.id)
    svc.accept_request(r.id, b.id)


@patch("app.services.conversation_service.chat_realtime.broadcast_to_participants")
def test_get_or_create_direct(mock_pub, db_session):
    a = _user(db_session, "a@x.com", "usera")
    b = _user(db_session, "b@x.com", "userb")
    fs = FriendService(db_session)
    _make_friends(db_session, fs, a, b)
    cs = ConversationService(db_session)
    c1 = cs.get_or_create_direct(a.id, b.id)
    c2 = cs.get_or_create_direct(b.id, a.id)
    assert c1.id == c2.id


@patch("app.services.conversation_service.chat_realtime.broadcast_to_participants")
def test_message_requires_friendship(mock_pub, db_session):
    a = _user(db_session, "a@x.com", "usera")
    b = _user(db_session, "b@x.com", "userb")
    fs = FriendService(db_session)
    _make_friends(db_session, fs, a, b)
    cs = ConversationService(db_session)
    conv = cs.get_or_create_direct(a.id, b.id)
    msg = cs.create_message(conv.id, a.id, "hi", None, None, None, None, None)
    assert msg.body == "hi"
    fs.remove_friendship(a.id, b.id)
    with pytest.raises(ValueError, match="Messaging is only available"):
        cs.create_message(conv.id, a.id, "nope", None, None, None, None, None)
