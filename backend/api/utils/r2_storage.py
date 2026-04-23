from __future__ import annotations

import os
from functools import lru_cache

import boto3
from botocore.client import BaseClient


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"missing_env:{name}")
    return value


def get_r2_bucket_name() -> str:
    return _require_env("R2_BUCKET_NAME")


@lru_cache(maxsize=1)
def get_r2_client() -> BaseClient:
    account_id = _require_env("R2_ACCOUNT_ID")
    access_key_id = _require_env("R2_ACCESS_KEY_ID")
    secret_access_key = _require_env("R2_SECRET_ACCESS_KEY")
    endpoint_url = os.getenv("R2_ENDPOINT_URL", "").strip() or f"https://{account_id}.r2.cloudflarestorage.com"

    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        region_name="auto",
    )


def generate_object_read_url(object_key: str, expires_seconds: int = 600) -> str:
    client = get_r2_client()
    bucket = get_r2_bucket_name()
    return client.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": bucket, "Key": object_key},
        ExpiresIn=expires_seconds,
    )


def upload_object_bytes(
    object_key: str,
    content: bytes,
    content_type: str,
) -> None:
    client = get_r2_client()
    bucket = get_r2_bucket_name()
    client.put_object(
        Bucket=bucket,
        Key=object_key,
        Body=content,
        ContentType=content_type,
    )

