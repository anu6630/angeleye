from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional, Tuple

from app.models.friend import FriendRequest, Friendship
from app.models.user import User


class FriendService:
    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REJECTED = "rejected"
    STATUS_CANCELLED = "cancelled"

    def __init__(self, db: Session):
        self.db = db

    def _ordered_pair(self, a: int, b: int) -> Tuple[int, int]:
        return (a, b) if a < b else (b, a)

    def are_friends(self, user_a_id: int, user_b_id: int) -> bool:
        if user_a_id == user_b_id:
            return False
        low, high = self._ordered_pair(user_a_id, user_b_id)
        return (
            self.db.query(Friendship.id)
            .filter(Friendship.user_low_id == low, Friendship.user_high_id == high)
            .first()
            is not None
        )

    def list_friend_ids(self, user_id: int) -> List[int]:
        rows = (
            self.db.query(Friendship)
            .filter(or_(Friendship.user_low_id == user_id, Friendship.user_high_id == user_id))
            .all()
        )
        out: List[int] = []
        for f in rows:
            other = f.user_high_id if f.user_low_id == user_id else f.user_low_id
            out.append(other)
        return out

    def list_friends(self, user_id: int) -> List[User]:
        ids = self.list_friend_ids(user_id)
        if not ids:
            return []
        from sqlalchemy.orm import joinedload
        return (
            self.db.query(User)
            .options(joinedload(User.profile))
            .filter(User.id.in_(ids))
            .order_by(User.username)
            .all()
        )

    def send_request(self, requester_id: int, addressee_id: int) -> FriendRequest:
        if requester_id == addressee_id:
            raise ValueError("Cannot send a friend request to yourself")

        addressee = self.db.query(User).filter(User.id == addressee_id).first()
        if not addressee:
            raise ValueError("User not found")

        if self.are_friends(requester_id, addressee_id):
            raise ValueError("Already friends")

        reverse_pending = (
            self.db.query(FriendRequest)
            .filter(
                FriendRequest.requester_id == addressee_id,
                FriendRequest.addressee_id == requester_id,
                FriendRequest.status == self.STATUS_PENDING,
            )
            .first()
        )
        if reverse_pending:
            raise ValueError("This user already sent you a request; check incoming requests")

        existing_pending = (
            self.db.query(FriendRequest)
            .filter(
                FriendRequest.requester_id == requester_id,
                FriendRequest.addressee_id == addressee_id,
                FriendRequest.status == self.STATUS_PENDING,
            )
            .first()
        )
        if existing_pending:
            raise ValueError("Friend request already pending")

        req = FriendRequest(
            requester_id=requester_id,
            addressee_id=addressee_id,
            status=self.STATUS_PENDING,
        )
        self.db.add(req)
        self.db.commit()
        self.db.refresh(req)
        return req

    def list_requests(self, user_id: int, direction: str) -> List[FriendRequest]:
        from sqlalchemy.orm import joinedload
        q = (
            self.db.query(FriendRequest)
            .options(
                joinedload(FriendRequest.requester).joinedload(User.profile),
                joinedload(FriendRequest.addressee).joinedload(User.profile)
            )
            .filter(FriendRequest.status == self.STATUS_PENDING)
        )
        if direction == "incoming":
            q = q.filter(FriendRequest.addressee_id == user_id)
        elif direction == "outgoing":
            q = q.filter(FriendRequest.requester_id == user_id)
        else:
            raise ValueError("direction must be incoming or outgoing")
        return q.order_by(FriendRequest.created_at.desc()).all()

    def get_request(self, request_id: int) -> Optional[FriendRequest]:
        return self.db.query(FriendRequest).filter(FriendRequest.id == request_id).first()

    def accept_request(self, request_id: int, acting_user_id: int) -> Friendship:
        req = self.get_request(request_id)
        if not req:
            raise ValueError("Request not found")
        if req.status != self.STATUS_PENDING:
            raise ValueError("Request is not pending")
        if req.addressee_id != acting_user_id:
            raise ValueError("Only the addressee can accept this request")

        low, high = self._ordered_pair(req.requester_id, req.addressee_id)
        existing = (
            self.db.query(Friendship)
            .filter(Friendship.user_low_id == low, Friendship.user_high_id == high)
            .first()
        )
        if existing:
            req.status = self.STATUS_ACCEPTED
            self.db.commit()
            return existing

        friendship = Friendship(user_low_id=low, user_high_id=high)
        self.db.add(friendship)
        req.status = self.STATUS_ACCEPTED
        self.db.commit()
        self.db.refresh(friendship)
        return friendship

    def reject_request(self, request_id: int, acting_user_id: int) -> None:
        req = self.get_request(request_id)
        if not req:
            raise ValueError("Request not found")
        if req.status != self.STATUS_PENDING:
            raise ValueError("Request is not pending")
        if req.addressee_id != acting_user_id:
            raise ValueError("Only the addressee can reject this request")
        req.status = self.STATUS_REJECTED
        self.db.commit()

    def cancel_request(self, request_id: int, acting_user_id: int) -> None:
        req = self.get_request(request_id)
        if not req:
            raise ValueError("Request not found")
        if req.status != self.STATUS_PENDING:
            raise ValueError("Request is not pending")
        if req.requester_id != acting_user_id:
            raise ValueError("Only the requester can cancel this request")
        req.status = self.STATUS_CANCELLED
        self.db.commit()

    def remove_friendship(self, user_id: int, other_user_id: int) -> bool:
        if user_id == other_user_id:
            raise ValueError("Invalid target user")
        low, high = self._ordered_pair(user_id, other_user_id)
        row = (
            self.db.query(Friendship)
            .filter(Friendship.user_low_id == low, Friendship.user_high_id == high)
            .first()
        )
        if not row:
            return False
        self.db.delete(row)
        self.db.commit()
        return True

    def relationship_state(self, viewer_id: int, other_user_id: int) -> str:
        """none | friends | pending_out | pending_in"""
        if viewer_id == other_user_id:
            return "self"
        if self.are_friends(viewer_id, other_user_id):
            return "friends"
        out_pending = (
            self.db.query(FriendRequest.id)
            .filter(
                FriendRequest.requester_id == viewer_id,
                FriendRequest.addressee_id == other_user_id,
                FriendRequest.status == self.STATUS_PENDING,
            )
            .first()
        )
        if out_pending:
            return "pending_out"
        in_pending = (
            self.db.query(FriendRequest.id)
            .filter(
                FriendRequest.requester_id == other_user_id,
                FriendRequest.addressee_id == viewer_id,
                FriendRequest.status == self.STATUS_PENDING,
            )
            .first()
        )
        if in_pending:
            return "pending_in"
        return "none"
