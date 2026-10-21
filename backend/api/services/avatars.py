"""Consistent avatar URL resolution for profiles and leaderboard entries."""

import os

from sqlalchemy.orm import Session

from models import User
from utils.r2_storage import generate_object_read_url


def avatar_url(object_key: str | None, google_url: str | None) -> str | None:
    if object_key:
        try:
            return generate_object_read_url(
                object_key=object_key, expires_seconds=86400
            )
        except Exception:
            pass
    return google_url or None


def get_user_avatars(db: Session, user_ids: list[int]) -> dict:
    """Resolve active users' public avatars; callers must authorize the lookup."""
    users = db.query(User).filter(User.id.in_(user_ids), User.is_active.is_(True)).all()
    portal_base = (
        os.getenv("PUBLIC_APP_URL") or os.getenv("PORTAL_URL") or "https://deepbraintechnology.com"
    ).strip().rstrip("/")
    default_avatar = f"{portal_base}/dashboard/default.png"
    return {"avatars": [
        {"user_id": user.id,
         "avatar_url": avatar_url(user.avatar_object_key, user.google_avatar_url) or default_avatar,
         "avatar_fallback_url": default_avatar}
        for user in users
    ]}
