import io
from unittest.mock import Mock

import pytest
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.profile import Profile
from app.services.avatar_service import AvatarService, build_avatar_url
from tests.test_factories import create_user


def _make_upload_file(filename: str = "avatar.png", content_type: str = "image/png") -> UploadFile:
    # Tiny 1x1 PNG bytes
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDAT\x08\x99c```\x00\x00\x00"
        b"\x04\x00\x01\xf6\x178U\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    return UploadFile(filename=filename, file=io.BytesIO(png_bytes), headers={"content-type": content_type})


class TestAvatarService:
    def test_upload_avatar_stores_keys_and_url(self, db_session: Session):
        user = create_user(db_session, username="avatar_owner")
        mock_storage = Mock()
        service = AvatarService(db_session, storage=mock_storage)

        avatar_url = service.upload_avatar(user.id, _make_upload_file())
        profile = db_session.query(Profile).filter(Profile.user_id == user.id).first()

        assert profile is not None
        assert profile.avatar_s3_key is not None
        assert profile.avatar_thumbnail_s3_key is not None
        assert profile.avatar_content_type == "image/webp"
        assert f"/api/v1/profiles/{user.username}/avatar" in avatar_url
        assert "?v=" in avatar_url
        assert mock_storage.upload_fileobj.call_count == 2

    def test_delete_avatar_clears_profile_fields(self, db_session: Session):
        user = create_user(db_session, username="avatar_delete_owner")
        mock_storage = Mock()
        service = AvatarService(db_session, storage=mock_storage)
        service.upload_avatar(user.id, _make_upload_file())

        service.delete_avatar(user.id)
        profile = db_session.query(Profile).filter(Profile.user_id == user.id).first()

        assert profile is not None
        assert profile.avatar_s3_key is None
        assert profile.avatar_thumbnail_s3_key is None
        assert profile.avatar_uploaded_at is None
        assert profile.avatar_url is None
        assert mock_storage.delete_object.call_count >= 1

    def test_build_avatar_url_falls_back_to_manual_url(self, db_session: Session):
        user = create_user(db_session, username="manual_avatar_owner")
        profile = db_session.query(Profile).filter(Profile.user_id == user.id).first()
        if profile is None:
            profile = Profile(user_id=user.id)
            db_session.add(profile)
            db_session.commit()
            db_session.refresh(profile)
        profile.avatar_url = "https://example.com/manual-avatar.jpg"
        db_session.commit()

        assert build_avatar_url(user.username, profile) == "https://example.com/manual-avatar.jpg"

    def test_upload_avatar_rejects_invalid_type(self, db_session: Session):
        user = create_user(db_session, username="bad_avatar_owner")
        service = AvatarService(db_session, storage=Mock())
        bad_file = _make_upload_file(filename="avatar.gif", content_type="image/gif")
        with pytest.raises(Exception):
            service.upload_avatar(user.id, bad_file)
