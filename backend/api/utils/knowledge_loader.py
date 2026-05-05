"""Knowledge loading helpers for GoodCool chat."""

from __future__ import annotations

import os
import time

from utils.r2_storage import get_r2_client


DEFAULT_KNOWLEDGE_BUCKET = "dbt-chat"
DEFAULT_KNOWLEDGE_KEY = "platform-knowledge.md"
DEFAULT_CACHE_SECONDS = 300

_cached_knowledge: str | None = None
_cached_at = 0.0


def _read_r2_knowledge() -> str:
    bucket = os.getenv("GOODCOOL_KNOWLEDGE_BUCKET", DEFAULT_KNOWLEDGE_BUCKET).strip() or DEFAULT_KNOWLEDGE_BUCKET
    key = os.getenv("GOODCOOL_KNOWLEDGE_KEY", DEFAULT_KNOWLEDGE_KEY).strip() or DEFAULT_KNOWLEDGE_KEY
    client = get_r2_client()
    response = client.get_object(Bucket=bucket, Key=key)
    body = response["Body"].read()
    return body.decode("utf-8").strip()


def get_platform_knowledge() -> str:
    """Load platform knowledge from Cloudflare R2 only."""
    global _cached_at, _cached_knowledge

    cache_seconds = int(os.getenv("GOODCOOL_KNOWLEDGE_CACHE_SECONDS", str(DEFAULT_CACHE_SECONDS)) or DEFAULT_CACHE_SECONDS)
    now = time.time()
    if _cached_knowledge and now - _cached_at < cache_seconds:
        return _cached_knowledge

    knowledge = _read_r2_knowledge()
    _cached_knowledge = knowledge
    _cached_at = now
    return knowledge
