from __future__ import annotations

import os
from functools import lru_cache

import boto3
from botocore.client import BaseClient
from botocore.config import Config
from typing import Literal


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"missing_env:{name}")
    return value


def get_r2_bucket_name() -> str:
    return _require_env("R2_BUCKET_NAME")


def get_r2_endpoint_url() -> str:
    endpoint_url = os.getenv("R2_ENDPOINT_URL", "").strip()
    if endpoint_url:
        return endpoint_url
    return f"https://{_require_env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com"


@lru_cache(maxsize=2)
def _get_r2_client(permission: Literal["READ_ONLY", "READ_WRITE"]) -> BaseClient:
    access_key_id = _require_env(f"R2_{permission}_ACCESS_KEY_ID")
    secret_access_key = _require_env(f"R2_{permission}_SECRET_ACCESS_KEY")

    return boto3.client(
        "s3",
        endpoint_url=get_r2_endpoint_url(),
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        region_name="auto",
        config=Config(connect_timeout=5, read_timeout=10, retries={"max_attempts": 2}),
    )


def get_r2_read_only_client() -> BaseClient:
    return _get_r2_client("READ_ONLY")


def get_r2_read_write_client() -> BaseClient:
    return _get_r2_client("READ_WRITE")


def generate_object_read_url(object_key: str, expires_seconds: int = 600) -> str:
    client = get_r2_read_only_client()
    bucket = get_r2_bucket_name()
    return client.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": bucket, "Key": object_key},
        ExpiresIn=expires_seconds,
    )

