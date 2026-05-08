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
from app.models.profile import Profile
from app.models.user import User
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

ALLOWED_FORMATS: dict[str, str] = {
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG",
    "image/webp": "WEBP",
}
MAX_AVATAR_SIZE_BYTES = 10 * 1024 * 1024
AVATAR_SIZE_PX = 512
AVATAR_THUMB_SIZE_PX = 128


class AvatarService:
    def __init__(self, db: Session, storage: Optional[StorageService] = None):
        self.db = db
        self.storage = storage or StorageService()

    @staticmethod
    def _validate_upload(file: UploadFile) -> bytes:
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="Avatar file is required")
        content_type = (file.content_type or "").lower()
        if content_type not in ALLOWED_FORMATS:
            raise HTTPException(status_code=400, detail="Unsupported image format. Use PNG, JPEG, or WEBP.")
        raw = file.file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Empty file")
        if len(raw) > MAX_AVATAR_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Avatar exceeds 10 MB limit")
        return raw

    @staticmethod
    def _open_image(raw: bytes) -> Image.Image:
        try:
            img = Image.open(io.BytesIO(raw))
            img.load()
        except (UnidentifiedImageError, OSError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}")
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB",):
            if img.mode in ("RGBA", "LA"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1])
                img = background
            else:
                img = img.convert("RGB")
        return img

    @staticmethod
    def _crop_square(img: Image.Image, crop_x: Optional[int], crop_y: Optional[int], crop_size: Optional[int]) -> Image.Image:
        width, height = img.size
        max_square = min(width, height)
        if crop_size is None:
            crop_size = max_square
        crop_size = max(1, min(crop_size, max_square))

        if crop_x is None:
            crop_x = (width - crop_size) // 2
        if crop_y is None:
            crop_y = (height - crop_size) // 2

        crop_x = max(0, min(crop_x, width - crop_size))
        crop_y = max(0, min(crop_y, height - crop_size))
        return img.crop((crop_x, crop_y, crop_x + crop_size, crop_y + crop_size))

    @staticmethod
    def _encode_avatar(square: Image.Image, size: int, quality: int) -> bytes:
        out = square.resize((size, size), Image.LANCZOS)
        buf = io.BytesIO()
        out.save(buf, format="WEBP", quality=quality, method=6)
        return buf.getvalue()

    def _get_user_profile(self, user_id: int) -> Tuple[User, Profile]:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        profile = self.db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile:
            profile = Profile(user_id=user_id)
            self.db.add(profile)
            self.db.flush()
        return user, profile

    def _delete_existing_objects(self, profile: Profile) -> None:
        for key in (profile.avatar_s3_key, profile.avatar_thumbnail_s3_key):
            if not key:
                continue
            try:
                self.storage.delete_object(settings.AVATARS_BUCKET, key)
            except Exception as exc:  # pragma: no cover
                logger.warning(f"Failed to delete previous avatar object {key}: {exc}")

    def upload_avatar(
        self,
        user_id: int,
        file: UploadFile,
        crop_x: Optional[int] = None,
        crop_y: Optional[int] = None,
        crop_size: Optional[int] = None,
    ) -> str:
        user, profile = self._get_user_profile(user_id)
        raw = self._validate_upload(file)
        img = self._open_image(raw)
        square = self._crop_square(img, crop_x, crop_y, crop_size)

        full_bytes = self._encode_avatar(square, AVATAR_SIZE_PX, quality=86)
        thumb_bytes = self._encode_avatar(square, AVATAR_THUMB_SIZE_PX, quality=78)

        ts = int(time.time())
        prefix = f"avatars/{user_id}"
        full_key = f"{prefix}/full_{ts}.webp"
        thumb_key = f"{prefix}/thumb_{ts}.webp"

        try:
            self.storage.upload_fileobj(io.BytesIO(full_bytes), settings.AVATARS_BUCKET, full_key, content_type="image/webp")
            self.storage.upload_fileobj(io.BytesIO(thumb_bytes), settings.AVATARS_BUCKET, thumb_key, content_type="image/webp")
        except Exception as exc:
            logger.error(f"Failed to upload avatar objects: {exc}")
            raise HTTPException(status_code=500, detail="Failed to store avatar")

        self._delete_existing_objects(profile)
        profile.avatar_s3_key = full_key
        profile.avatar_thumbnail_s3_key = thumb_key
        profile.avatar_uploaded_at = datetime.now(timezone.utc)
        profile.avatar_content_type = "image/webp"
        profile.avatar_url = build_avatar_url(user.username, profile)
        self.db.commit()
        return profile.avatar_url or ""

    def delete_avatar(self, user_id: int) -> None:
        user, profile = self._get_user_profile(user_id)
        if not profile.avatar_s3_key and not profile.avatar_thumbnail_s3_key:
            profile.avatar_url = None
            self.db.commit()
            return
        self._delete_existing_objects(profile)
        profile.avatar_s3_key = None
        profile.avatar_thumbnail_s3_key = None
        profile.avatar_uploaded_at = None
        profile.avatar_content_type = None
        profile.avatar_url = None
        self.db.commit()

    def stream_avatar(self, username: str, thumbnail: bool = False) -> Tuple[Iterator[bytes], str]:
        user = self.db.query(User).filter(User.username == username).first()
        if not user or not user.profile:
            raise HTTPException(status_code=404, detail="Avatar not found")
        profile = user.profile
        key = profile.avatar_thumbnail_s3_key if thumbnail else profile.avatar_s3_key
        if not key:
            raise HTTPException(status_code=404, detail="Avatar not found")
        try:
            obj = self.storage.s3_client.get_object(Bucket=settings.AVATARS_BUCKET, Key=key)
        except Exception as exc:
            logger.warning(f"Avatar object {key} missing: {exc}")
            raise HTTPException(status_code=404, detail="Avatar not found")
        return obj["Body"], "image/webp"


def _avatar_version(profile: Optional[Profile]) -> Optional[int]:
    if not profile or not profile.avatar_uploaded_at:
        return None
    try:
        return int(profile.avatar_uploaded_at.timestamp())
    except Exception:
        return None


def build_avatar_url(username: str, profile: Optional[Profile]) -> Optional[str]:
    if not profile or not profile.avatar_s3_key:
        return profile.avatar_url if profile else None
    version = _avatar_version(profile)
    suffix = f"?v={version}" if version else ""
    base = settings.BACKEND_URL.rstrip("/")
    return f"{base}/api/v1/profiles/{username}/avatar{suffix}"
