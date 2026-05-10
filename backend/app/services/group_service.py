from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.group import Group, GroupAdminPromotionRequest, GroupInvite, GroupMembership
from app.models.user import User
from app.services.group_urls import build_group_banner_url, build_group_icon_url

VISIBILITY_PUBLIC = "public"
VISIBILITY_PRIVATE = "private"
JOIN_OPEN = "open"
JOIN_INVITE_ONLY = "invite_only"
ROLE_MEMBER = "member"
ROLE_ADMIN = "admin"

INVITE_PENDING = "pending"
INVITE_ACCEPTED = "accepted"
INVITE_REJECTED = "rejected"
INVITE_CANCELLED = "cancelled"

PROMO_PENDING = "pending"
PROMO_ACCEPTED = "accepted"
PROMO_REJECTED = "rejected"

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def slugify_name(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")[:80]
    return s or "group"


class GroupService:
    def __init__(self, db: Session):
        self.db = db

    def _get_group_by_slug(self, slug: str) -> Optional[Group]:
        return self.db.query(Group).filter(Group.slug == slug).first()

    def get_membership(self, group_id: int, user_id: int) -> Optional[GroupMembership]:
        return (
            self.db.query(GroupMembership)
            .filter(
                GroupMembership.group_id == group_id,
                GroupMembership.user_id == user_id,
            )
            .first()
        )

    def is_member(self, group_id: int, user_id: int) -> bool:
        return self.get_membership(group_id, user_id) is not None

    def is_admin(self, group_id: int, user_id: int) -> bool:
        m = self.get_membership(group_id, user_id)
        return m is not None and m.role == ROLE_ADMIN

    def can_view_group(self, group: Group, viewer_id: Optional[int]) -> bool:
        if group.visibility == VISIBILITY_PUBLIC:
            return True
        if viewer_id is None:
            return False
        return self.is_member(group.id, viewer_id)

    def get_group_visible(self, slug: str, viewer_id: Optional[int]) -> Optional[Group]:
        g = self._get_group_by_slug(slug)
        if not g:
            return None
        if not self.can_view_group(g, viewer_id):
            return None
        return g

    def member_count(self, group_id: int) -> int:
        return (
            self.db.query(func.count(GroupMembership.id))
            .filter(GroupMembership.group_id == group_id)
            .scalar()
            or 0
        )

    def admin_count(self, group_id: int) -> int:
        return (
            self.db.query(func.count(GroupMembership.id))
            .filter(
                GroupMembership.group_id == group_id,
                GroupMembership.role == ROLE_ADMIN,
            )
            .scalar()
            or 0
        )

    def list_public_groups(self, limit: int = 50, offset: int = 0) -> Tuple[List[Group], int]:
        q = self.db.query(Group).filter(Group.visibility == VISIBILITY_PUBLIC)
        total = q.count()
        rows = (
            q.order_by(Group.created_at.desc())
            .offset(offset)
            .limit(min(limit, 100))
            .all()
        )
        return rows, total

    def create_group(
        self,
        user_id: int,
        name: str,
        slug: str,
        description: Optional[str],
        visibility: str,
        join_policy: str,
    ) -> Group:
        if visibility not in (VISIBILITY_PUBLIC, VISIBILITY_PRIVATE):
            raise ValueError("Invalid visibility")
        if join_policy not in (JOIN_OPEN, JOIN_INVITE_ONLY):
            raise ValueError("Invalid join_policy")
        if not name or len(name) > 120:
            raise ValueError("Invalid name")
        if not slug or len(slug) > 80 or not SLUG_RE.match(slug):
            raise ValueError("Invalid slug")
        if self._get_group_by_slug(slug):
            raise ValueError("Slug already taken")

        g = Group(
            name=name.strip(),
            slug=slug,
            description=description.strip() if description else None,
            visibility=visibility,
            join_policy=join_policy,
            created_by_user_id=user_id,
        )
        self.db.add(g)
        self.db.flush()
        self.db.add(
            GroupMembership(group_id=g.id, user_id=user_id, role=ROLE_ADMIN)
        )
        self.db.commit()
        self.db.refresh(g)
        return g

    def update_group(
        self,
        slug: str,
        user_id: int,
        *,
        name: Optional[str] = None,
        description: Optional[str] = None,
        visibility: Optional[str] = None,
        join_policy: Optional[str] = None,
    ) -> Group:
        g = self.get_group_visible(slug, user_id)
        if not g:
            raise ValueError("Group not found")
        if not self.is_admin(g.id, user_id):
            raise ValueError("Forbidden")

        if not any(
            x is not None
            for x in (name, description, visibility, join_policy)
        ):
            self.db.refresh(g)
            return g

        if name is not None:
            if not name.strip() or len(name) > 120:
                raise ValueError("Invalid name")
            g.name = name.strip()
        if description is not None:
            g.description = description.strip() if description.strip() else None
        if visibility is not None:
            if visibility not in (VISIBILITY_PUBLIC, VISIBILITY_PRIVATE):
                raise ValueError("Invalid visibility")
            g.visibility = visibility
        if join_policy is not None:
            if join_policy not in (JOIN_OPEN, JOIN_INVITE_ONLY):
                raise ValueError("Invalid join_policy")
            g.join_policy = join_policy

        self.db.commit()
        self.db.refresh(g)
        return g

    def join_group(self, slug: str, user_id: int) -> GroupMembership:
        g = self.get_group_visible(slug, user_id)
        if not g:
            raise ValueError("Group not found")
        if g.join_policy == JOIN_INVITE_ONLY:
            raise ValueError("This group is invite only")
        if self.is_member(g.id, user_id):
            raise ValueError("Already a member")

        m = GroupMembership(group_id=g.id, user_id=user_id, role=ROLE_MEMBER)
        self.db.add(m)
        self.db.commit()
        self.db.refresh(m)
        return m

    def leave_group(self, slug: str, user_id: int) -> None:
        g = self._get_group_by_slug(slug)
        if not g:
            raise ValueError("Group not found")
        m = self.get_membership(g.id, user_id)
        if not m:
            raise ValueError("Not a member")
        if m.role == ROLE_ADMIN and self.admin_count(g.id) <= 1:
            raise ValueError("Cannot leave: you are the only admin")
        self.db.delete(m)
        self.db.commit()

    def create_invite(self, slug: str, inviter_id: int, invitee_id: int) -> GroupInvite:
        if inviter_id == invitee_id:
            raise ValueError("Cannot invite yourself")
        g = self.get_group_visible(slug, inviter_id)
        if not g:
            raise ValueError("Group not found")
        if not self.is_member(g.id, inviter_id):
            raise ValueError("Forbidden")

        target = self.db.query(User).filter(User.id == invitee_id).first()
        if not target:
            raise ValueError("User not found")
        if self.is_member(g.id, invitee_id):
            raise ValueError("User is already a member")

        existing_pending = (
            self.db.query(GroupInvite)
            .filter(
                GroupInvite.group_id == g.id,
                GroupInvite.invitee_user_id == invitee_id,
                GroupInvite.status == INVITE_PENDING,
            )
            .first()
        )
        if existing_pending:
            raise ValueError("Invite already pending")

        inv = GroupInvite(
            group_id=g.id,
            inviter_user_id=inviter_id,
            invitee_user_id=invitee_id,
            status=INVITE_PENDING,
        )
        self.db.add(inv)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise ValueError("Could not create invite")
        self.db.refresh(inv)
        return inv

    def accept_invite(self, slug: str, invite_id: int, user_id: int) -> GroupMembership:
        g = self._get_group_by_slug(slug)
        if not g:
            raise ValueError("Group not found")
        inv = (
            self.db.query(GroupInvite)
            .filter(
                GroupInvite.id == invite_id,
                GroupInvite.group_id == g.id,
            )
            .first()
        )
        if not inv:
            raise ValueError("Invite not found")
        if inv.invitee_user_id != user_id:
            raise ValueError("Forbidden")
        if inv.status != INVITE_PENDING:
            raise ValueError("Invite is no longer pending")

        inv.status = INVITE_ACCEPTED
        if not self.is_member(g.id, user_id):
            self.db.add(GroupMembership(group_id=g.id, user_id=user_id, role=ROLE_MEMBER))
        self.db.commit()

        m = self.get_membership(g.id, user_id)
        if not m:
            raise ValueError("Membership failed")
        return m

    def reject_invite(self, slug: str, invite_id: int, user_id: int) -> None:
        g = self._get_group_by_slug(slug)
        if not g:
            raise ValueError("Group not found")
        inv = (
            self.db.query(GroupInvite)
            .filter(
                GroupInvite.id == invite_id,
                GroupInvite.group_id == g.id,
            )
            .first()
        )
        if not inv:
            raise ValueError("Invite not found")
        if inv.invitee_user_id != user_id:
            raise ValueError("Forbidden")
        if inv.status != INVITE_PENDING:
            raise ValueError("Invite is no longer pending")
        inv.status = INVITE_REJECTED
        self.db.commit()

    def create_admin_promotion_request(
        self, slug: str, proposer_id: int, candidate_id: int
    ) -> GroupAdminPromotionRequest:
        if proposer_id == candidate_id:
            raise ValueError("Invalid candidate")
        g = self.get_group_visible(slug, proposer_id)
        if not g:
            raise ValueError("Group not found")
        if not self.is_admin(g.id, proposer_id):
            raise ValueError("Forbidden")

        cand = self.get_membership(g.id, candidate_id)
        if not cand or cand.role != ROLE_MEMBER:
            raise ValueError("Candidate must be a non-admin member")

        existing = (
            self.db.query(GroupAdminPromotionRequest)
            .filter(
                GroupAdminPromotionRequest.group_id == g.id,
                GroupAdminPromotionRequest.candidate_user_id == candidate_id,
                GroupAdminPromotionRequest.status == PROMO_PENDING,
            )
            .first()
        )
        if existing:
            raise ValueError("Request already pending")

        row = GroupAdminPromotionRequest(
            group_id=g.id,
            proposer_user_id=proposer_id,
            candidate_user_id=candidate_id,
            status=PROMO_PENDING,
        )
        self.db.add(row)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise ValueError("Could not create request")
        self.db.refresh(row)
        return row

    def accept_admin_promotion(self, slug: str, request_id: int, user_id: int) -> GroupMembership:
        g = self._get_group_by_slug(slug)
        if not g:
            raise ValueError("Group not found")
        row = (
            self.db.query(GroupAdminPromotionRequest)
            .filter(
                GroupAdminPromotionRequest.id == request_id,
                GroupAdminPromotionRequest.group_id == g.id,
            )
            .first()
        )
        if not row:
            raise ValueError("Request not found")
        if row.candidate_user_id != user_id:
            raise ValueError("Forbidden")
        if row.status != PROMO_PENDING:
            raise ValueError("Request is no longer pending")

        m = self.get_membership(g.id, user_id)
        if not m:
            raise ValueError("Not a member")
        m.role = ROLE_ADMIN
        row.status = PROMO_ACCEPTED
        self.db.commit()
        self.db.refresh(m)
        return m

    def reject_admin_promotion(self, slug: str, request_id: int, user_id: int) -> None:
        g = self._get_group_by_slug(slug)
        if not g:
            raise ValueError("Group not found")
        row = (
            self.db.query(GroupAdminPromotionRequest)
            .filter(
                GroupAdminPromotionRequest.id == request_id,
                GroupAdminPromotionRequest.group_id == g.id,
            )
            .first()
        )
        if not row:
            raise ValueError("Request not found")
        if row.candidate_user_id != user_id:
            raise ValueError("Forbidden")
        if row.status != PROMO_PENDING:
            raise ValueError("Request is no longer pending")
        row.status = PROMO_REJECTED
        self.db.commit()

    def get_me_summary(self, user_id: int) -> Dict[str, Any]:
        memberships = (
            self.db.query(GroupMembership)
            .options(joinedload(GroupMembership.group))
            .filter(GroupMembership.user_id == user_id)
            .all()
        )

        pending_invites = (
            self.db.query(GroupInvite)
            .options(
                joinedload(GroupInvite.group),
                joinedload(GroupInvite.inviter).joinedload(User.profile),
            )
            .filter(
                GroupInvite.invitee_user_id == user_id,
                GroupInvite.status == INVITE_PENDING,
            )
            .order_by(GroupInvite.created_at.desc())
            .all()
        )

        pending_promos = (
            self.db.query(GroupAdminPromotionRequest)
            .options(
                joinedload(GroupAdminPromotionRequest.group),
                joinedload(GroupAdminPromotionRequest.proposer).joinedload(User.profile),
            )
            .filter(
                GroupAdminPromotionRequest.candidate_user_id == user_id,
                GroupAdminPromotionRequest.status == PROMO_PENDING,
            )
            .order_by(GroupAdminPromotionRequest.created_at.desc())
            .all()
        )

        return {
            "memberships": memberships,
            "pending_invites": pending_invites,
            "pending_admin_promotions": pending_promos,
        }

    def can_self_join(self, g: Group, viewer_id: Optional[int]) -> bool:
        if not viewer_id:
            return False
        if self.is_member(g.id, viewer_id):
            return False
        if g.join_policy == JOIN_INVITE_ONLY:
            return False
        if not self.can_view_group(g, viewer_id):
            return False
        return True

    def serialize_group(self, g: Group, viewer_id: Optional[int]) -> Dict[str, Any]:
        m = self.get_membership(g.id, viewer_id) if viewer_id else None
        icon_url = build_group_icon_url(g.slug, g)
        banner_url = build_group_banner_url(g.slug, g)
        return {
            "id": g.id,
            "name": g.name,
            "slug": g.slug,
            "description": g.description,
            "visibility": g.visibility,
            "join_policy": g.join_policy,
            "icon_url": icon_url,
            "banner_url": banner_url,
            "member_count": self.member_count(g.id),
            "created_at": g.created_at.isoformat() if g.created_at else None,
            "is_member": m is not None,
            "is_admin": m is not None and m.role == ROLE_ADMIN,
            "can_join": self.can_self_join(g, viewer_id),
        }
