"""R2 credentials are selected strictly by access level, not by feature."""

from io import BytesIO
import os
import unittest
from unittest.mock import MagicMock, patch, sentinel

from utils import r2_storage
from utils import knowledge_loader


class R2StorageTests(unittest.TestCase):
    def setUp(self):
        settings = patch.dict(os.environ, {
            "R2_ACCOUNT_ID": "shared-account",
            "R2_READ_ONLY_ACCESS_KEY_ID": "read-key",
            "R2_READ_ONLY_SECRET_ACCESS_KEY": "read-secret",
            "R2_READ_WRITE_ACCESS_KEY_ID": "write-key",
            "R2_READ_WRITE_SECRET_ACCESS_KEY": "write-secret",
            "R2_BUCKET_NAME": "dbt-learning",
        }, clear=True)
        settings.start()
        self.addCleanup(settings.stop)
        r2_storage._get_r2_client.cache_clear()
        self.addCleanup(r2_storage._get_r2_client.cache_clear)

    def test_clients_share_endpoint_but_use_distinct_credentials_and_caches(self):
        with patch.object(r2_storage.boto3, "client", side_effect=[sentinel.read, sentinel.write]) as create:
            self.assertIs(r2_storage.get_r2_read_only_client(), sentinel.read)
            self.assertIs(r2_storage.get_r2_read_write_client(), sentinel.write)
            self.assertIs(r2_storage.get_r2_read_only_client(), sentinel.read)
            self.assertIs(r2_storage.get_r2_read_write_client(), sentinel.write)
        self.assertEqual(create.call_count, 2)
        read, write = [call.kwargs for call in create.call_args_list]
        self.assertEqual(read["endpoint_url"], "https://shared-account.r2.cloudflarestorage.com")
        self.assertEqual(write["endpoint_url"], read["endpoint_url"])
        self.assertEqual((read["aws_access_key_id"], read["aws_secret_access_key"]), ("read-key", "read-secret"))
        self.assertEqual((write["aws_access_key_id"], write["aws_secret_access_key"]), ("write-key", "write-secret"))
        self.assertEqual(read["config"].connect_timeout, 5)

    def test_missing_read_credentials_never_fall_back_to_write_or_old_keys(self):
        os.environ.update(R2_READ_ONLY_ACCESS_KEY_ID="", R2_ACCESS_KEY_ID="legacy-key", R2_SECRET_ACCESS_KEY="legacy-secret")
        with patch.object(r2_storage.boto3, "client") as create:
            with self.assertRaisesRegex(RuntimeError, "missing_env:R2_READ_ONLY_ACCESS_KEY_ID"):
                r2_storage.get_r2_read_only_client()
        create.assert_not_called()

    def test_missing_write_secret_never_falls_back_to_read_or_feature_keys(self):
        os.environ.update(R2_READ_WRITE_SECRET_ACCESS_KEY="", AVATAR_R2_SECRET_ACCESS_KEY="old-avatar-secret")
        with patch.object(r2_storage.boto3, "client") as create:
            with self.assertRaisesRegex(RuntimeError, "missing_env:R2_READ_WRITE_SECRET_ACCESS_KEY"):
                r2_storage.get_r2_read_write_client()
        create.assert_not_called()

    def test_custom_endpoint_is_shared_and_does_not_require_account_id(self):
        os.environ.update(R2_ACCOUNT_ID="", R2_ENDPOINT_URL="https://custom.r2.example.test")
        with patch.object(r2_storage.boto3, "client") as create:
            r2_storage.get_r2_read_only_client()
            r2_storage.get_r2_read_write_client()
        for call in create.call_args_list:
            self.assertEqual(call.kwargs["endpoint_url"], "https://custom.r2.example.test")

    def test_course_and_legacy_avatar_urls_use_read_only_credentials(self):
        read = MagicMock()
        with patch.object(r2_storage, "get_r2_read_only_client", return_value=read), patch.object(r2_storage, "get_r2_read_write_client") as write:
            r2_storage.generate_object_read_url("course/tutorial.mp4")
            r2_storage.generate_object_read_url("Avatar/42/old.png", expires_seconds=86400)
        self.assertEqual(read.generate_presigned_url.call_count, 2)
        read.generate_presigned_url.assert_called_with(
            ClientMethod="get_object", Params={"Bucket": "dbt-learning", "Key": "Avatar/42/old.png"}, ExpiresIn=86400,
        )
        write.assert_not_called()

    def test_knowledge_reads_use_read_only_client_and_knowledge_bucket(self):
        read = MagicMock()
        read.get_object.return_value = {"Body": BytesIO(b"platform knowledge")}
        with patch.object(knowledge_loader, "get_r2_read_only_client", return_value=read):
            self.assertEqual(knowledge_loader._read_r2_knowledge(), "platform knowledge")
        read.get_object.assert_called_once_with(Bucket="dbt-chat", Key="platform-knowledge.md")


if __name__ == "__main__":
    unittest.main()
