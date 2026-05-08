"""
BannerService — handles per-notebook hero banner upload, resize, storage, and delivery.

- Stores both a full-resolution banner (long-side capped at 2400px, WebP q=82) and a
  16:9 cover thumbnail (800x450, WebP q=70) in MinIO/S3.
- Validates ownership, MIME type (PNG/JPG/JPEG/WEBP only) and file size (<= 10 MB).
- Uses Pillow for image decoding, EXIF rotation, resizing, and re-encoding.
"""
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
from app.models.notebook import Notebook
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

# Allowed MIME types and Pillow format mapping
ALLOWED_FORMATS: dict[str, str] = {
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG",
    "image/webp": "WEBP",
}

MAX_BANNER_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
FULL_LONG_SIDE_PX = 2400
THUMB_WIDTH_PX = 800
THUMB_HEIGHT_PX = 450  # 16:9


class BannerService:
    """Owns the lifecycle of notebook photo banners."""

    def __init__(self, db: Session, storage: Optional[StorageService] = None):
        self.db = db
        self.storage = storage or StorageService()

    # ──────────────────────────────────────────── helpers
    def _get_owned_notebook(self, notebook_id: int, user_id: int) -> Notebook:
        notebook = self.db.query(Notebook).filter(Notebook.id == notebook_id).first()
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")
        if notebook.user_id != user_id:
            raise HTTPException(status_code=403, detail="You do not own this notebook")
        return notebook

    @staticmethod
    def _validate_upload(file: UploadFile) -> bytes:
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="Banner file is required")

        content_type = (file.content_type or "").lower()
        if content_type not in ALLOWED_FORMATS:
            raise HTTPException(
                status_code=400,
                detail="Unsupported banner format. Use PNG, JPEG, or WEBP.",
            )

        # Read fully (banners are small). FastAPI streams to a SpooledTemporaryFile
        # so this is bounded by the 10 MB limit below.
        raw = file.file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Empty file")
        if len(raw) > MAX_BANNER_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"Banner exceeds {MAX_BANNER_SIZE_BYTES // (1024 * 1024)} MB limit",
            )

        return raw

    @staticmethod
    def _open_and_normalise(raw: bytes) -> Image.Image:
        try:
            img = Image.open(io.BytesIO(raw))
            img.load()
        except (UnidentifiedImageError, OSError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}")

        # Apply EXIF orientation so portrait/rotated photos look correct.
        img = ImageOps.exif_transpose(img)

        # Convert to RGB so WebP encoding is consistent (drops alpha; PNG transparency
        # is rare for banners and not worth the file-size cost).
        if img.mode not in ("RGB",):
            if img.mode in ("RGBA", "LA"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1])
                img = background
            else:
                img = img.convert("RGB")
        return img

    @staticmethod
    def _build_full(img: Image.Image) -> bytes:
        copy = img.copy()
        long_side = max(copy.size)
        if long_side > FULL_LONG_SIDE_PX:
            ratio = FULL_LONG_SIDE_PX / float(long_side)
            new_size = (max(1, int(copy.width * ratio)), max(1, int(copy.height * ratio)))
            copy = copy.resize(new_size, Image.LANCZOS)

        buf = io.BytesIO()
        copy.save(buf, format="WEBP", quality=82, method=6)
        return buf.getvalue()

    @staticmethod
    def _build_thumb(img: Image.Image) -> bytes:
        # Cover-fit to 800x450 (crop the longer axis).
        thumb = ImageOps.fit(
            img,
            (THUMB_WIDTH_PX, THUMB_HEIGHT_PX),
            method=Image.LANCZOS,
            centering=(0.5, 0.5),
        )
        buf = io.BytesIO()
        thumb.save(buf, format="WEBP", quality=70, method=6)
        return buf.getvalue()

    def _delete_existing_objects(self, notebook: Notebook) -> None:
        for key in (notebook.banner_s3_key, notebook.banner_thumbnail_s3_key):
            if not key:
                continue
            try:
                self.storage.delete_object(settings.BANNERS_BUCKET, key)
            except Exception as exc:  # pragma: no cover - best-effort cleanup
                logger.warning(f"Failed to delete previous banner object {key}: {exc}")

    # ──────────────────────────────────────────── public API
    def upload_banner(
        self,
        notebook_id: int,
        user_id: int,
        file: UploadFile,
    ) -> Tuple[Notebook, str, str]:
        """Resize and store a new banner. Returns (notebook, full_url, thumb_url)."""
        notebook = self._get_owned_notebook(notebook_id, user_id)

        raw = self._validate_upload(file)
        img = self._open_and_normalise(raw)

        full_bytes = self._build_full(img)
        thumb_bytes = self._build_thumb(img)

        ts = int(time.time())
        prefix = f"banners/{user_id}/{notebook_id}"
        full_key = f"{prefix}/full_{ts}.webp"
        thumb_key = f"{prefix}/thumb_{ts}.webp"

        try:
            self.storage.upload_fileobj(
                io.BytesIO(full_bytes),
                settings.BANNERS_BUCKET,
                full_key,
                content_type="image/webp",
            )
            self.storage.upload_fileobj(
                io.BytesIO(thumb_bytes),
                settings.BANNERS_BUCKET,
                thumb_key,
                content_type="image/webp",
            )
        except Exception as exc:
            logger.error(f"Failed to upload banner objects: {exc}")
            raise HTTPException(status_code=500, detail="Failed to store banner")

        # Replace any previous banner objects on disk before persisting new keys.
        self._delete_existing_objects(notebook)

        notebook.banner_s3_key = full_key
        notebook.banner_thumbnail_s3_key = thumb_key
        notebook.banner_uploaded_at = datetime.now(timezone.utc)
        notebook.banner_content_type = "image/webp"
        self.db.commit()
        self.db.refresh(notebook)

        full_url, thumb_url = build_banner_urls(notebook)
        return notebook, full_url or "", thumb_url or ""

    def delete_banner(self, notebook_id: int, user_id: int) -> None:
        notebook = self._get_owned_notebook(notebook_id, user_id)
        if not notebook.banner_s3_key and not notebook.banner_thumbnail_s3_key:
            return
        self._delete_existing_objects(notebook)
        notebook.banner_s3_key = None
        notebook.banner_thumbnail_s3_key = None
        notebook.banner_uploaded_at = None
        notebook.banner_content_type = None
        self.db.commit()

    def stream_banner(
        self,
        notebook_id: int,
        kind: str,
    ) -> Tuple[Iterator[bytes], str]:
        """Return an iterator over the banner bytes and its content type.

        kind: "full" or "thumb"
        """
        if kind not in ("full", "thumb"):
            raise HTTPException(status_code=400, detail="Invalid banner kind")

        notebook = self.db.query(Notebook).filter(Notebook.id == notebook_id).first()
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        key = notebook.banner_s3_key if kind == "full" else notebook.banner_thumbnail_s3_key
        if not key:
            raise HTTPException(status_code=404, detail="Banner not found")

        try:
            obj = self.storage.s3_client.get_object(
                Bucket=settings.BANNERS_BUCKET,
                Key=key,
            )
        except Exception as exc:
            logger.warning(f"Banner object {key} missing: {exc}")
            raise HTTPException(status_code=404, detail="Banner not found")

        body = obj["Body"]
        return body, "image/webp"


def _banner_version(notebook: Notebook) -> Optional[int]:
    if not notebook.banner_uploaded_at:
        return None
    try:
        return int(notebook.banner_uploaded_at.timestamp())
    except Exception:
        return None


def build_banner_urls(notebook: Notebook) -> Tuple[Optional[str], Optional[str]]:
    """Return (full_url, thumb_url) proxy paths for a notebook, or (None, None)."""
    if not notebook.banner_s3_key:
        return None, None
    version = _banner_version(notebook)
    suffix = f"?v={version}" if version else ""
    base = settings.BACKEND_URL.rstrip("/")
    full_url = f"{base}/api/v1/notebooks/{notebook.id}/banner{suffix}"
    thumb_url = f"{base}/api/v1/notebooks/{notebook.id}/banner/thumb{suffix}"
    return full_url, thumb_url
