from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    slug: Optional[str] = Field(None, max_length=80, description="URL slug; generated from name if omitted")
    description: Optional[str] = None
    visibility: str = Field("public", description="public or private")
    join_policy: str = Field("open", description="open or invite_only")


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = None
    visibility: Optional[str] = None
    join_policy: Optional[str] = None


class InviteCreate(BaseModel):
    invitee_user_id: int = Field(..., ge=1)


class AdminPromotionCreate(BaseModel):
    candidate_user_id: int = Field(..., ge=1)


class GroupPublic(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    visibility: str
    join_policy: str
    icon_url: Optional[str]
    banner_url: Optional[str]
    member_count: int
    created_at: Optional[str]
    is_member: bool
    is_admin: bool
    can_join: bool

    class Config:
        from_attributes = True


class UserBrief(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None


class InvitePendingItem(BaseModel):
    id: int
    group: Dict[str, Any]
    inviter: UserBrief
    created_at: Optional[str]


class AdminPromoPendingItem(BaseModel):
    id: int
    group: Dict[str, Any]
    proposer: UserBrief
    created_at: Optional[str]


class MeGroupsResponse(BaseModel):
    groups: List[Dict[str, Any]]
    pending_invites: List[Dict[str, Any]]
    pending_admin_promotions: List[Dict[str, Any]]


class GroupListResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int
    limit: int
    offset: int


class GroupPresenceResponse(BaseModel):
    online_user_count: int
