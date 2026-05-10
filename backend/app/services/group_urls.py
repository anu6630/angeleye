from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from app.core.config import settings

if TYPE_CHECKING:
    from app.models.group import Group


def build_group_icon_url(slug: str, group: Group) -> Optional[str]:
    if not group.icon_s3_key:
        return group.icon_url
    version = None
    if group.icon_uploaded_at:
        try:
            version = int(group.icon_uploaded_at.timestamp())
        except Exception:
            version = None
    suffix = f"?v={version}" if version else ""
    base = settings.BACKEND_URL.rstrip("/")
    return f"{base}/api/v1/groups/{slug}/icon{suffix}"


def build_group_banner_url(slug: str, group: Group) -> Optional[str]:
    if not group.banner_s3_key:
        return group.banner_url
    version = None
    if group.banner_uploaded_at:
        try:
            version = int(group.banner_uploaded_at.timestamp())
        except Exception:
            version = None
    suffix = f"?v={version}" if version else ""
    base = settings.BACKEND_URL.rstrip("/")
    return f"{base}/api/v1/groups/{slug}/banner{suffix}"
