"""Avatar storage is isolated from course and knowledge buckets."""

import os

from utils.r2_storage import get_r2_read_write_client


def get_avatar_bucket_name() -> str:
    return os.getenv("AVATAR_R2_BUCKET_NAME", "").strip() or "avatar"


def upload_avatar_bytes(object_key: str, content: bytes, content_type: str) -> None:
    get_r2_read_write_client().put_object(
        Bucket=get_avatar_bucket_name(), Key=object_key,
        Body=content, ContentType=content_type,
    )


def generate_avatar_read_url(object_key: str, expires_seconds: int = 86400) -> str:
    # The read-only token excludes the private avatar bucket, so reads use its read/write token.
    return get_r2_read_write_client().generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": get_avatar_bucket_name(), "Key": object_key},
        ExpiresIn=expires_seconds,
    )
