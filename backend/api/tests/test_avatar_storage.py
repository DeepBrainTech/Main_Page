"""Avatar uploads and reads use the dedicated bucket without migrating old keys."""

import asyncio
from io import BytesIO
import os
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException, UploadFile
from sqlalchemy import create_engine
from starlette.datastructures import Headers

from utils import avatar_storage

_bootstrap_engine = create_engine("sqlite://")
with patch.dict(os.environ, {"DATABASE_URL": "sqlite://"}), patch("sqlalchemy.create_engine", return_value=_bootstrap_engine):
    from services.avatars import avatar_url
    from services.profile import upload_avatar
_bootstrap_engine.dispose()


class AvatarStorageTests(unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, {
            "R2_ACCOUNT_ID": "same-account",
            "R2_BUCKET_NAME": "dbt-learning",
            "AVATAR_R2_BUCKET_NAME": "",
            "R2_ENDPOINT_URL": "",
        })
        env.start()
        self.addCleanup(env.stop)

    def test_upload_uses_avatar_bucket_and_exact_user_key(self):
        client = MagicMock()
        with patch.object(avatar_storage, "get_r2_read_write_client", return_value=client):
            avatar_storage.upload_avatar_bytes("42/new.png", b"image", "image/png")
        client.put_object.assert_called_once_with(Bucket="avatar", Key="42/new.png", Body=b"image", ContentType="image/png")

    def test_signed_read_uses_same_bucket_and_keeps_shared_bucket_unchanged(self):
        client = MagicMock()
        client.generate_presigned_url.return_value = "https://signed.example.test/avatar"
        with patch.object(avatar_storage, "get_r2_read_write_client", return_value=client):
            self.assertEqual(avatar_storage.generate_avatar_read_url("42/new.png"), "https://signed.example.test/avatar")
        client.generate_presigned_url.assert_called_once_with(
            ClientMethod="get_object", Params={"Bucket": "avatar", "Key": "42/new.png"}, ExpiresIn=86400,
        )
        self.assertEqual(os.environ["R2_BUCKET_NAME"], "dbt-learning")

    def test_new_keys_use_avatar_resolver_and_legacy_keys_keep_old_resolver(self):
        with patch("services.avatars.generate_avatar_read_url", return_value="new-url") as new, patch("services.avatars.generate_object_read_url", return_value="legacy-url") as old:
            self.assertEqual(avatar_url("42/new.png", None), "new-url")
            new.assert_called_once_with(object_key="42/new.png", expires_seconds=86400)
            old.assert_not_called()
            for key in ["Avatar/42/old.png", "avatars/42.png"]:
                self.assertEqual(avatar_url(key, None), "legacy-url")
                old.assert_called_with(object_key=key, expires_seconds=86400)

    def test_storage_error_keeps_google_avatar_fallback(self):
        with patch("services.avatars.generate_avatar_read_url", side_effect=RuntimeError("unavailable")):
            self.assertEqual(avatar_url("42/new.png", "https://google.example.test/avatar"), "https://google.example.test/avatar")

    def test_upload_service_saves_new_path_and_preserves_legacy_record_on_failure(self):
        user = SimpleNamespace(id=42, avatar_object_key="Avatar/42/old.png")
        db = MagicMock()

        def file():
            return UploadFile(BytesIO(b"image"), filename="avatar.png", headers=Headers({"content-type": "image/png"}))

        with patch("services.profile.upload_avatar_bytes", side_effect=Exception("storage failed")):
            with self.assertRaises(HTTPException):
                asyncio.run(upload_avatar(file(), user, db))
        self.assertEqual(user.avatar_object_key, "Avatar/42/old.png")
        db.commit.assert_not_called()

        with patch("services.profile.upload_avatar_bytes") as upload, patch("services.profile._user_to_response", return_value="updated"):
            self.assertEqual(asyncio.run(upload_avatar(file(), user, db)), "updated")
        self.assertRegex(user.avatar_object_key, r"^42/[0-9a-f]{32}\.png$")
        upload.assert_called_once_with(object_key=user.avatar_object_key, content=b"image", content_type="image/png")
        db.commit.assert_called_once()
        db.refresh.assert_called_once_with(user)


if __name__ == "__main__":
    unittest.main()
