from __future__ import annotations

import io
import logging
import time
from datetime import datetime, timezone
from typing import Iterator, Optional, Tuple, Dict

from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.profile import Profile
from app.models.user import User
from app.models.notebook import Notebook
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

ALLOWED_FORMATS: dict[str, str] = {
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG",
    "image/webp": "WEBP",
}
MAX_BANNER_SIZE_BYTES = 10 * 1024 * 1024
BANNER_WIDTH_PX = 1500
BANNER_HEIGHT_PX = 500  # 3:1 aspect ratio for profiles
BANNER_THUMB_WIDTH_PX = 600
BANNER_THUMB_HEIGHT_PX = 200

# Notebook banner constants
NB_BANNER_WIDTH_PX = 2400
NB_BANNER_THUMB_WIDTH_PX = 800
NB_BANNER_THUMB_HEIGHT_PX = 450

class BannerService:
    def __init__(self, db: Session, storage: Optional[StorageService] = None):
        self.db = db
        self.storage = storage or StorageService()

    @staticmethod
    def _validate_upload(file: UploadFile) -> bytes:
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="Banner file is required")
        content_type = (file.content_type or "").lower()
        if content_type not in ALLOWED_FORMATS:
            raise HTTPException(status_code=400, detail="Unsupported image format. Use PNG, JPEG, or WEBP.")
        raw = file.file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Empty file")
        if len(raw) > MAX_BANNER_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Banner exceeds 10 MB limit")
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
    def _crop_banner(img: Image.Image, crop_x: Optional[int], crop_y: Optional[int], crop_width: Optional[int], crop_height: Optional[int], aspect: float = 3.0) -> Image.Image:
        width, height = img.size
        
        # Default to center crop if not provided
        if crop_width is None or crop_height is None:
            target_ratio = aspect
            current_ratio = width / height
            
            if current_ratio > target_ratio:
                # Wider than target
                crop_height = height
                crop_width = int(height * target_ratio)
            else:
                # Taller than target
                crop_width = width
                crop_height = int(width / target_ratio)
        
        if crop_x is None:
            crop_x = (width - crop_width) // 2
        if crop_y is None:
            crop_y = (height - crop_height) // 2

        # Clamp values
        crop_x = max(0, min(crop_x, width - crop_width))
        crop_y = max(0, min(crop_y, height - crop_height))
        
        return img.crop((crop_x, crop_y, crop_x + crop_width, crop_y + crop_height))

    @staticmethod
    def _encode_banner(cropped: Image.Image, width: int, height: int, quality: int) -> bytes:
        out = cropped.resize((width, height), Image.LANCZOS)
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

    def upload_profile_banner(
        self,
        user_id: int,
        file: UploadFile,
        crop_x: Optional[int] = None,
        crop_y: Optional[int] = None,
        crop_width: Optional[int] = None,
        crop_height: Optional[int] = None,
    ) -> str:
        """Upload profile banner"""
        user, profile = self._get_user_profile(user_id)
        raw = self._validate_upload(file)
        img = self._open_image(raw)
        cropped = self._crop_banner(img, crop_x, crop_y, crop_width, crop_height, aspect=3.0)

        full_bytes = self._encode_banner(cropped, BANNER_WIDTH_PX, BANNER_HEIGHT_PX, quality=86)
        thumb_bytes = self._encode_banner(cropped, BANNER_THUMB_WIDTH_PX, BANNER_THUMB_HEIGHT_PX, quality=78)

        ts = int(time.time())
        prefix = f"banners/{user_id}"
        full_key = f"{prefix}/full_{ts}.webp"
        thumb_key = f"{prefix}/thumb_{ts}.webp"

        try:
            self.storage.upload_fileobj(io.BytesIO(full_bytes), settings.AVATARS_BUCKET, full_key, content_type="image/webp")
            self.storage.upload_fileobj(io.BytesIO(thumb_bytes), settings.AVATARS_BUCKET, thumb_key, content_type="image/webp")
        except Exception as exc:
            logger.error(f"Failed to upload profile banner: {exc}")
            raise HTTPException(status_code=500, detail="Failed to store banner")

        # Delete old
        for key in (profile.banner_s3_key, profile.banner_thumbnail_s3_key):
            if key:
                try: self.storage.delete_object(settings.AVATARS_BUCKET, key)
                except: pass

        profile.banner_s3_key = full_key
        profile.banner_thumbnail_s3_key = thumb_key
        profile.banner_uploaded_at = datetime.now(timezone.utc)
        profile.banner_content_type = "image/webp"
        profile.banner_url = build_banner_url(user.username, profile)
        self.db.commit()
        return profile.banner_url or ""

    def upload_notebook_banner(self, notebook_id: int, user_id: int, file: UploadFile) -> Tuple[Notebook, str, str]:
        """Upload notebook banner"""
        notebook = self.db.query(Notebook).filter(Notebook.id == notebook_id).first()
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")
        if notebook.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not owner")

        raw = self._validate_upload(file)
        img = self._open_image(raw)
        cropped = self._crop_banner(img, None, None, None, None, aspect=16/9)
        
        full_bytes = self._encode_banner(cropped, NB_BANNER_WIDTH_PX, int(NB_BANNER_WIDTH_PX * (9/16)), quality=86)
        thumb_bytes = self._encode_banner(cropped, NB_BANNER_THUMB_WIDTH_PX, NB_BANNER_THUMB_HEIGHT_PX, quality=78)

        ts = int(time.time())
        prefix = f"notebooks/{notebook_id}/banners"
        full_key = f"{prefix}/full_{ts}.webp"
        thumb_key = f"{prefix}/thumb_{ts}.webp"

        try:
            self.storage.upload_fileobj(io.BytesIO(full_bytes), settings.BANNERS_BUCKET, full_key, content_type="image/webp")
            self.storage.upload_fileobj(io.BytesIO(thumb_bytes), settings.BANNERS_BUCKET, thumb_key, content_type="image/webp")
        except Exception as exc:
            logger.error(f"Failed to upload notebook banner: {exc}")
            raise HTTPException(status_code=500, detail="Failed to store notebook banner")

        # Delete old
        for key in (notebook.banner_s3_key, notebook.banner_thumbnail_s3_key):
            if key:
                try: 
                    # Try both buckets for deletion to be safe during transition
                    self.storage.delete_object(settings.BANNERS_BUCKET, key)
                    self.storage.delete_object(settings.NOTEBOOKS_BUCKET, key)
                except: pass

        notebook.banner_s3_key = full_key
        notebook.banner_thumbnail_s3_key = thumb_key
        notebook.banner_uploaded_at = datetime.now(timezone.utc)
        notebook.banner_content_type = "image/webp"
        
        # We don't have a direct URL for notebooks yet, but we provide it in the response
        banner_url, banner_thumb_url = build_banner_urls(notebook_id, notebook)
        self.db.commit()
        return notebook, banner_url or "", banner_thumb_url or ""

    def delete_profile_banner(self, user_id: int) -> None:
        """Delete profile banner"""
        user, profile = self._get_user_profile(user_id)
        for key in (profile.banner_s3_key, profile.banner_thumbnail_s3_key):
            if key:
                try: self.storage.delete_object(settings.AVATARS_BUCKET, key)
                except: pass
        profile.banner_s3_key = None
        profile.banner_thumbnail_s3_key = None
        profile.banner_uploaded_at = None
        profile.banner_url = None
        self.db.commit()

    def delete_notebook_banner(self, notebook_id: int, user_id: int) -> None:
        """Delete notebook banner"""
        notebook = self.db.query(Notebook).filter(Notebook.id == notebook_id).first()
        if not notebook or notebook.user_id != user_id: return
        for key in (notebook.banner_s3_key, notebook.banner_thumbnail_s3_key):
            if key:
                try:
                    self.storage.delete_object(settings.BANNERS_BUCKET, key)
                    self.storage.delete_object(settings.NOTEBOOKS_BUCKET, key)
                except: pass
        notebook.banner_s3_key = None
        notebook.banner_thumbnail_s3_key = None
        notebook.banner_uploaded_at = None
        self.db.commit()

    def stream_banner(self, username_or_id: str | int, type_or_user: str = "full", thumbnail: bool = False) -> Tuple[Iterator[bytes], str]:
        """Stream banner"""
        if isinstance(username_or_id, int) or (isinstance(username_or_id, str) and username_or_id.isdigit()):
            # Notebook
            nb_id = int(username_or_id)
            notebook = self.db.query(Notebook).filter(Notebook.id == nb_id).first()
            if not notebook: raise HTTPException(status_code=404)
            is_thumb = (type_or_user == "thumb" or thumbnail)
            key = notebook.banner_thumbnail_s3_key if is_thumb else notebook.banner_s3_key
            bucket = settings.BANNERS_BUCKET
        else:
            # Profile
            user = self.db.query(User).filter(User.username == username_or_id).first()
            if not user or not user.profile: raise HTTPException(status_code=404)
            is_thumb = (thumbnail or type_or_user == "thumb")
            key = user.profile.banner_thumbnail_s3_key if is_thumb else user.profile.banner_s3_key
            bucket = settings.AVATARS_BUCKET
            
        if not key: raise HTTPException(status_code=404)
        
        # Try primary bucket first, fall back to secondary for backward compatibility
        try:
            obj = self.storage.s3_client.get_object(Bucket=bucket, Key=key)
        except Exception as e:
            # If it's a notebook banner, it might be in the other bucket (migration artifact)
            if bucket in (settings.BANNERS_BUCKET, settings.NOTEBOOKS_BUCKET):
                alt_bucket = settings.BANNERS_BUCKET if bucket == settings.NOTEBOOKS_BUCKET else settings.NOTEBOOKS_BUCKET
                try:
                    obj = self.storage.s3_client.get_object(Bucket=alt_bucket, Key=key)
                except Exception:
                    raise e
            else:
                raise e
                
        return obj["Body"], "image/webp"

def _banner_version(profile_or_nb: Profile | Notebook) -> Optional[int]:
    if not profile_or_nb or not profile_or_nb.banner_uploaded_at:
        return None
    try:
        return int(profile_or_nb.banner_uploaded_at.timestamp())
    except Exception:
        return None

def build_banner_url(username: str, profile: Optional[Profile]) -> Optional[str]:
    if not profile or not profile.banner_s3_key: return profile.banner_url if profile else None
    version = _banner_version(profile)
    suffix = f"?v={version}" if version else ""
    return f"{settings.BACKEND_URL.rstrip('/')}/api/v1/profiles/{username}/banner{suffix}"

def build_banner_urls(notebook_id_or_obj: int | Notebook, notebook: Optional[Notebook] = None) -> Tuple[Optional[str], Optional[str]]:
    if isinstance(notebook_id_or_obj, Notebook):
        nb = notebook_id_or_obj
        nb_id = nb.id
    else:
        nb_id = notebook_id_or_obj
        nb = notebook

    if not nb or not nb.banner_s3_key:
        return None, None
    
    version = _banner_version(nb)
    suffix = f"?v={version}" if version else ""
    base = f"{settings.BACKEND_URL.rstrip('/')}/api/v1/notebooks/{nb_id}/banner"
    return f"{base}{suffix}", f"{base}/thumb{suffix}"
