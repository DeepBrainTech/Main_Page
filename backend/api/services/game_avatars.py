"""Bounded avatar lookup for authenticated game servers."""

import os

from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from config.game_auth import get_game_auth_entry_by_api_slug
from services.avatars import get_user_avatars


def get_leaderboard_avatars(db: Session, token: str, api_slug: str) -> dict:
    entry = get_game_auth_entry_by_api_slug(api_slug)
    if entry is None:
        raise HTTPException(status_code=404, detail="unknown_game")
    secret = os.getenv(f"{entry.env_prefix}_JWT_SECRET", "").strip()
    if not secret or secret == "CHESSMATER" or secret.startswith("change-this-"):
        raise HTTPException(status_code=503, detail="game_signing_not_configured")
    try:
        claims = jwt.decode(
            token, secret,
            algorithms=[os.getenv(f"{entry.env_prefix}_JWT_ALG", "HS256")],
            audience=f"{entry.game_key}-leaderboard-avatars",
            issuer=f"{entry.game_key}-game",
            options={"require_exp": True, "require_aud": True, "require_iss": True},
        )
        ids = claims["user_ids"]
        if (claims.get("purpose") != "leaderboard-avatars"
                or not isinstance(ids, list) or not 1 <= len(ids) <= 3
                or any(not isinstance(value, str) or not value.isascii()
                       or not value.isdecimal() or not 0 < int(value) <= 2147483647 for value in ids)):
            raise ValueError("invalid_avatar_claims")
    except (JWTError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=401, detail="invalid_avatar_token") from error
    return get_user_avatars(db, [int(value) for value in ids])
