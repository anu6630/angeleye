from __future__ import annotations

import io
import logging
import time
from datetime import datetime, timezone
from typing import Iterator, Optional, Tuple

from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.group import Group
from app.services.group_service import GroupService
from app.services.group_urls import build_group_banner_url, build_group_icon_url
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

ALLOWED_FORMATS: dict[str, str] = {
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG",
    "image/webp": "WEBP",
}
MAX_BYTES = 10 * 1024 * 1024
ICON_SIZE_PX = 256
BANNER_MAX_W = 1600
BANNER_H = 400


class GroupAssetService:
    def __init__(self, db: Session, storage: Optional[StorageService] = None):
        self.db = db
        self.storage = storage or StorageService()
        self.group_service = GroupService(db)

    def _group_admin(self, slug: str, user_id: int) -> Group:
        g = self.group_service.get_group_visible(slug, user_id)
        if not g:
            raise HTTPException(status_code=404, detail="Group not found")
        if not self.group_service.is_admin(g.id, user_id):
            raise HTTPException(status_code=403, detail="Forbidden")
        return g

    @staticmethod
    def _validate(file: UploadFile) -> bytes:
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="File is required")
        ct = (file.content_type or "").lower()
        if ct not in ALLOWED_FORMATS:
            raise HTTPException(
                status_code=400,
                detail="Unsupported image format. Use PNG, JPEG, or WEBP.",
            )
        raw = file.file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Empty file")
        if len(raw) > MAX_BYTES:
            raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")
        return raw

    @staticmethod
    def _open(raw: bytes) -> Image.Image:
        try:
            img = Image.open(io.BytesIO(raw))
            img.load()
        except (UnidentifiedImageError, OSError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid image: {exc}")
        return ImageOps.exif_transpose(img)

    @staticmethod
    def _to_rgb(img: Image.Image) -> Image.Image:
        if img.mode in ("RGB",):
            return img
        if img.mode in ("RGBA", "LA"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            return background
        return img.convert("RGB")

    @staticmethod
    def _encode_webp(img: Image.Image, quality: int) -> bytes:
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=quality, method=4)
        return buf.getvalue()

    def _delete_keys(self, group: Group, *, icon: bool, banner: bool) -> None:
        if icon and group.icon_s3_key:
            try:
                self.storage.delete_object(settings.GROUP_ASSETS_BUCKET, group.icon_s3_key)
            except Exception as exc:
                logger.warning("delete icon %s: %s", group.icon_s3_key, exc)
        if banner and group.banner_s3_key:
            try:
                self.storage.delete_object(settings.GROUP_ASSETS_BUCKET, group.banner_s3_key)
            except Exception as exc:
                logger.warning("delete banner %s: %s", group.banner_s3_key, exc)

    def upload_icon(self, slug: str, user_id: int, file: UploadFile) -> str:
        g = self._group_admin(slug, user_id)
        raw = self._validate(file)
        img = self._to_rgb(self._open(raw))
        w, h = img.size
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        img = img.crop((left, top, left + side, top + side))
        img = img.resize((ICON_SIZE_PX, ICON_SIZE_PX), Image.Resampling.LANCZOS)
        out = self._encode_webp(img, 86)
        ts = int(time.time())
        key = f"groups/{g.id}/icon_{ts}.webp"
        try:
            self.storage.upload_fileobj(
                io.BytesIO(out),
                settings.GROUP_ASSETS_BUCKET,
                key,
                content_type="image/webp",
            )
        except Exception as exc:
            logger.error("upload group icon failed: %s", exc)
            raise HTTPException(status_code=500, detail="Failed to store icon")
        self._delete_keys(g, icon=True, banner=False)
        g.icon_s3_key = key
        g.icon_uploaded_at = datetime.now(timezone.utc)
        g.icon_url = build_group_icon_url(g.slug, g)
        self.db.commit()
        return g.icon_url or ""

    def upload_banner(self, slug: str, user_id: int, file: UploadFile) -> str:
        g = self._group_admin(slug, user_id)
        raw = self._validate(file)
        img = self._to_rgb(self._open(raw))
        img = ImageOps.fit(
            img,
            (BANNER_MAX_W, BANNER_H),
            method=Image.Resampling.LANCZOS,
        )
        out = self._encode_webp(img, 82)
        ts = int(time.time())
        key = f"groups/{g.id}/banner_{ts}.webp"
        try:
            self.storage.upload_fileobj(
                io.BytesIO(out),
                settings.GROUP_ASSETS_BUCKET,
                key,
                content_type="image/webp",
            )
        except Exception as exc:
            logger.error("upload group banner failed: %s", exc)
            raise HTTPException(status_code=500, detail="Failed to store banner")
        self._delete_keys(g, icon=False, banner=True)
        g.banner_s3_key = key
        g.banner_uploaded_at = datetime.now(timezone.utc)
        g.banner_url = build_group_banner_url(g.slug, g)
        self.db.commit()
        return g.banner_url or ""

    def delete_icon(self, slug: str, user_id: int) -> None:
        g = self._group_admin(slug, user_id)
        self._delete_keys(g, icon=True, banner=False)
        g.icon_s3_key = None
        g.icon_uploaded_at = None
        g.icon_url = None
        self.db.commit()

    def delete_banner(self, slug: str, user_id: int) -> None:
        g = self._group_admin(slug, user_id)
        self._delete_keys(g, icon=False, banner=True)
        g.banner_s3_key = None
        g.banner_uploaded_at = None
        g.banner_url = None
        self.db.commit()

    def stream_icon(self, slug: str, viewer_id: Optional[int]) -> Tuple[Iterator[bytes], str]:
        gs = GroupService(self.db)
        g = gs._get_group_by_slug(slug)
        if not g or not gs.can_view_group(g, viewer_id):
            raise HTTPException(status_code=404, detail="Not found")
        if not g.icon_s3_key:
            raise HTTPException(status_code=404, detail="Not found")
        try:
            obj = self.storage.s3_client.get_object(
                Bucket=settings.GROUP_ASSETS_BUCKET, Key=g.icon_s3_key
            )
        except Exception as exc:
            logger.warning("group icon missing: %s", exc)
            raise HTTPException(status_code=404, detail="Not found")
        return obj["Body"], "image/webp"

    def stream_banner(self, slug: str, viewer_id: Optional[int]) -> Tuple[Iterator[bytes], str]:
        gs = GroupService(self.db)
        g = gs._get_group_by_slug(slug)
        if not g or not gs.can_view_group(g, viewer_id):
            raise HTTPException(status_code=404, detail="Not found")
        if not g.banner_s3_key:
            raise HTTPException(status_code=404, detail="Not found")
        try:
            obj = self.storage.s3_client.get_object(
                Bucket=settings.GROUP_ASSETS_BUCKET, Key=g.banner_s3_key
            )
        except Exception as exc:
            logger.warning("group banner missing: %s", exc)
            raise HTTPException(status_code=404, detail="Not found")
        return obj["Body"], "image/webp"
