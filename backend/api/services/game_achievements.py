"""Game-owned achievement progress and signed, idempotent unlock notifications."""

import os
from urllib.parse import urlsplit

import requests
from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from config.game_auth import create_game_token
from models import User, UserNotification
from services.assets import lock_account
from utils.notification_events import schedule_notification_event


TARGETS = {
    "levels": (10, 20, 30, 40, 50),
    "records": (1, 3, 5, 10, 20),
    "noHints": (1, 5, 10, 20, 30),
    "moves": (50, 150, 500, 1500, 3000),
}


def require_game(api_slug: str):
    if api_slug != "chessmater":
        raise HTTPException(status_code=404, detail="game_achievements_not_configured")


def get_game_achievements(api_slug: str, user: User) -> dict:
    require_game(api_slug)
    base = os.getenv("CHESSMATER_API_URL", "https://chessmater-production.up.railway.app").strip().rstrip("/")
    parsed = urlsplit(base)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise HTTPException(status_code=503, detail="game_achievements_not_configured")
    try:
        token, _ = create_game_token("chessmater", {
            "sub": user.username, "username": user.username, "user_id": user.id,
        }, expires_seconds=60)
    except ValueError as error:
        raise HTTPException(status_code=503, detail="game_signing_not_configured") from error
    try:
        response = requests.get(f"{base}/achievements", headers={"Authorization": f"Bearer {token}"},
                                timeout=(3.05, 8), allow_redirects=False)
        if response.status_code != 200:
            raise ValueError("upstream_status")
        payload = response.json()
        values = payload.get("values") if isinstance(payload, dict) else None
        if payload.get("gameKey") != "chessmater" or not isinstance(values, dict):
            raise ValueError("invalid_achievement_progress")
        for group in TARGETS:
            value = values.get(group)
            if type(value) is not int or not 0 <= value <= (9007199254740991 if group == "moves" else 105):
                raise ValueError("invalid_achievement_progress")
        return {"gameKey": "chessmater", "values": {key: values[key] for key in TARGETS}}
    except (requests.RequestException, ValueError, TypeError, AttributeError) as error:
        raise HTTPException(status_code=502, detail="game_achievements_unavailable") from error


def receive_achievement_events(db: Session, token: str, api_slug: str) -> dict:
    require_game(api_slug)
    secret = (os.getenv("CHESSMATER_REWARD_SECRET") or os.getenv("CHESSMATER_JWT_SECRET") or "").strip()
    if not secret or secret == "CHESSMATER" or secret.startswith("change-this-"):
        raise HTTPException(status_code=503, detail="achievement_signing_not_configured")
    try:
        claims = jwt.decode(token, secret, algorithms=[os.getenv("CHESSMATER_JWT_ALG", "HS256")],
                            audience="chessmater-achievements", issuer="chessmater-game",
                            options={"require_exp": True, "require_aud": True, "require_iss": True})
        raw_user_id, events = claims["user_id"], claims["achievements"]
        if (not isinstance(raw_user_id, str) or not raw_user_id.isascii() or not raw_user_id.isdecimal()
                or not 0 < int(raw_user_id) <= 2147483647 or claims.get("purpose") != "achievement-unlocks"
                or not isinstance(events, list) or not 1 <= len(events) <= 20):
            raise ValueError("invalid_achievement_events")
        for event in events:
            if (not isinstance(event, dict) or event.get("group") not in TARGETS
                    or type(event.get("tier")) is not int or not 0 <= event["tier"] < 5
                    or type(event.get("target")) is not int
                    or event["target"] != TARGETS[event["group"]][event["tier"]]):
                raise ValueError("invalid_achievement_event")
        user_id = int(raw_user_id)
    except (JWTError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=401, detail="invalid_achievement_token") from error
    if db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first() is None:
        raise HTTPException(status_code=404, detail="unknown_achievement_account")
    lock_account(db, user_id)
    accepted = []
    created = False
    for event in events:
        group, tier = event["group"], event["tier"]
        source_id = f"chessmater:achievement:v1:{user_id}:{group}:{tier}"
        if db.query(UserNotification).filter_by(source_event_id=source_id).first() is None:
            db.add(UserNotification(
                user_id=user_id, type="game_achievement", title="Achievement Unlocked",
                message="You unlocked a Freefall Chess achievement.", icon="achievement", is_read=False,
                source="chessmater", source_event_id=source_id,
                notification_metadata={"game_key": "chessmater", "group": group, "tier": tier,
                                       "target": event["target"]},
            ))
            db.flush()
            created = True
        accepted.append({"group": group, "tier": tier})
    if created:
        schedule_notification_event(db, user_id)
    db.commit()
    return {"game_key": "chessmater", "accepted": accepted}
