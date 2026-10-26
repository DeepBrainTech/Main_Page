"""Discover game media without exposing storage credentials to the browser."""

import logging
import os
import re
from threading import Lock
from time import monotonic
from urllib.parse import quote, urlsplit

from fastapi import HTTPException

from config.game_media import GAME_MEDIA_PREFIXES
from utils.r2_storage import get_r2_read_only_client

logger = logging.getLogger(__name__)
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".ogv"}
CACHE_SECONDS = 300
SIGNED_URL_SECONDS = 21600
_cache: dict[tuple, tuple[float, tuple[tuple[str, ...], tuple[str, ...]]]] = {}
_cache_lock = Lock()


def _natural_key(key: str) -> tuple:
    return tuple((1, int(part)) if part.isdigit() else (0, part.casefold()) for part in re.split(r"(\d+)", key))


def _folder_keys(client, bucket: str, prefix: str, extensions: set[str]) -> tuple[str, ...]:
    keys = []
    for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=prefix):
        for item in page.get("Contents", []):
            key = item["Key"]
            relative = key[len(prefix):]
            if not key.startswith(prefix) or not relative or any(part.startswith(".") for part in relative.split("/")):
                continue
            if item.get("Size", 0) > 0 and os.path.splitext(key)[1].lower() in extensions:
                keys.append(key)
    return tuple(sorted(set(keys), key=lambda key: (_natural_key(key), key)))


def get_game_media(game_slug: str) -> dict:
    prefix = GAME_MEDIA_PREFIXES.get(game_slug)
    if prefix is None:
        raise HTTPException(404, detail="game_not_found")
    bucket = os.getenv("GAME_MEDIA_R2_BUCKET_NAME", "").strip() or "dbt-game"
    public_base = os.getenv("GAME_MEDIA_PUBLIC_BASE_URL", "").strip().rstrip("/")
    if public_base and (urlsplit(public_base).scheme != "https" or not urlsplit(public_base).netloc or urlsplit(public_base).query or urlsplit(public_base).fragment):
        raise HTTPException(503, detail="game_media_unavailable")
    cache_key = (bucket, prefix)
    try:
        client = get_r2_read_only_client()
        # Serializing cache misses prevents bursts from repeatedly scanning R2.
        with _cache_lock:
            cached = _cache.get(cache_key)
            if cached is None or cached[0] <= monotonic():
                keys = (
                    _folder_keys(client, bucket, f"{prefix}/preview/", IMAGE_EXTENSIONS),
                    _folder_keys(client, bucket, f"{prefix}/video-tutorial/", VIDEO_EXTENSIONS),
                )
                if len(_cache) >= 128:
                    _cache.clear()
                _cache[cache_key] = (monotonic() + CACHE_SECONDS, keys)
            else:
                keys = cached[1]

        def serialize(key: str) -> dict:
            url = f"{public_base}/{quote(key, safe='/')}" if public_base else client.generate_presigned_url(
                "get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=SIGNED_URL_SECONDS,
            )
            return {"key": key, "url": url}

        return {
            "previews": [serialize(key) for key in keys[0]],
            "tutorials": [serialize(key) for key in keys[1]],
        }
    except Exception:
        # Storage errors can contain request details; do not return them to clients.
        logger.warning("Game media storage request failed for %s", game_slug)
        raise HTTPException(503, detail="game_media_unavailable") from None

