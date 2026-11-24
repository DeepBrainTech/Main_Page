"""Game-owned achievement progress and signed, idempotent unlock notifications."""

import os
from urllib.parse import urlsplit

import requests
from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from config.game_auth import create_game_token
from config.game_upstreams import GAME_API_BASES
from models import User, UserNotification
from services.assets import lock_account
from utils.notification_events import schedule_notification_event


TARGETS = {
    "levels": (10, 20, 30, 40, 50),
    "records": (10, 20, 30, 40, 50),
    "noHints": (10, 20, 30, 40, 50),
    "moves": (50, 150, 500, 1500, 3000),
}
RULE_VERSIONS = {"levels": 1, "records": 2, "noHints": 2, "moves": 1}
TOURMASTER_NOTIFICATION_GROUPS = {"classic": ("levels", "noHints"), "math_tour": ("records", "moves")}
TOURMASTER_CLEAR_TARGETS = (10, 20, 30, 40, 50)
TOURMASTER_THREE_STAR_TARGETS = (5, 10, 20, 35, 50)
TOURMASTER_TARGETS = {
    "levels": TOURMASTER_CLEAR_TARGETS,
    "records": TOURMASTER_CLEAR_TARGETS,
    "noHints": TOURMASTER_THREE_STAR_TARGETS,
    "moves": TOURMASTER_THREE_STAR_TARGETS,
}
TOURMASTER_LEVEL_MODES = (("classic", "classic"), ("math_tour", "math"))


def _get_level_progress(base: str, token: str, modes: tuple[tuple[str, str], ...]) -> dict:
    values = {}
    for mode, prefix in modes:
        response = requests.get(
            f"{base}/api/levels/stats", params={"game_mode": mode},
            headers={"Authorization": f"Bearer {token}"}, timeout=(3.05, 8), allow_redirects=False,
        )
        if response.status_code != 200:
            raise ValueError("upstream_status")
        payload = response.json()
        data = payload.get("data")
        levels = data.get("levels") if isinstance(data, dict) else None
        if payload.get("success") is not True or not isinstance(levels, list):
            raise ValueError("invalid_achievement_progress")

        best_stars = {}
        for record in levels:
            level, stars = record.get("level"), record.get("best_stars")
            if type(level) is not int or level < 1 or type(stars) is not int or not 1 <= stars <= 3:
                raise ValueError("invalid_achievement_progress")
            best_stars[level] = max(best_stars.get(level, 0), stars)
        values[f"{prefix}Clears"] = len(best_stars)
        values[f"{prefix}Stars"] = sum(stars == 3 for stars in best_stars.values())
    return values


def get_game_achievements(api_slug: str, user: User) -> dict:
    source = GAME_API_BASES.get(api_slug)
    if source is None:
        raise HTTPException(status_code=404, detail="game_achievements_not_configured")
    env_key, default_base = source
    base = os.getenv(env_key, default_base).strip().rstrip("/")
    parsed = urlsplit(base)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise HTTPException(status_code=503, detail="game_achievements_not_configured")
    try:
        token, _ = create_game_token(api_slug, {
            "sub": user.username, "username": user.username, "user_id": user.id,
        }, expires_seconds=60)
    except ValueError as error:
        raise HTTPException(status_code=503, detail="game_signing_not_configured") from error
    try:
        if api_slug == "chess-tourmaster":
            return {"gameKey": api_slug, "targets": TOURMASTER_TARGETS,
                    "values": _get_level_progress(base, token, TOURMASTER_LEVEL_MODES)}
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
        return {"gameKey": "chessmater", "targets": TARGETS, "values": {key: values[key] for key in TARGETS}}
    except (requests.RequestException, ValueError, TypeError, AttributeError) as error:
        raise HTTPException(status_code=502, detail="game_achievements_unavailable") from error


def _chessmater_unlocks(claims: dict) -> list[dict]:
    events = claims["achievements"]
    if claims.get("purpose") != "achievement-unlocks" or not isinstance(events, list) or not 1 <= len(events) <= 20:
        raise ValueError("invalid_achievement_events")
    for event in events:
        if (not isinstance(event, dict) or event.get("group") not in TARGETS
                or type(event.get("tier")) is not int or not 0 <= event["tier"] < 5
                or type(event.get("target")) is not int
                or type(event.get("rule_version", 1)) is not int
                or event.get("rule_version", 1) != RULE_VERSIONS[event["group"]]
                or event["target"] != TARGETS[event["group"]][event["tier"]]):
            raise ValueError("invalid_achievement_event")
    return events


def _tourmaster_unlocks(claims: dict) -> list[dict]:
    clear_group, stars_group = TOURMASTER_NOTIFICATION_GROUPS[claims["mode"]]
    clears, stars = claims["clears"], claims["three_stars"]
    new_clear, new_stars = claims["new_clear"], claims["new_three_stars"]
    if (claims.get("purpose") != "achievement-progress"
            or type(clears) is not int or type(stars) is not int or not 0 <= stars <= clears
            or type(new_clear) is not bool or type(new_stars) is not bool
            or not (new_clear or new_stars) or not 0 <= stars - new_stars <= clears - new_clear):
        raise ValueError("invalid_achievement_progress")
    return [
        {"group": group, "tier": tier, "target": target}
        for group, count, increased in (
            (clear_group, clears, new_clear),
            (stars_group, stars, new_stars),
        )
        if increased
        for tier, target in enumerate(TOURMASTER_TARGETS[group])
        if count == target
    ]


def receive_achievement_events(db: Session, token: str, api_slug: str) -> dict:
    if api_slug == "chessmater":
        env_prefix = "CHESSMATER"
        fallback_message = "You unlocked a Freefall Chess achievement."
        get_unlocks = _chessmater_unlocks
    elif api_slug == "chess-tourmaster":
        env_prefix = "TOURMASTER"
        fallback_message = "You unlocked a Knightours Chess achievement."
        get_unlocks = _tourmaster_unlocks
    else:
        raise HTTPException(status_code=404, detail="game_achievements_not_configured")

    secret = (os.getenv(f"{env_prefix}_REWARD_SECRET") or os.getenv(f"{env_prefix}_JWT_SECRET") or "").strip()
    if not secret or secret == env_prefix or secret.startswith("change-this-"):
        raise HTTPException(status_code=503, detail="achievement_signing_not_configured")
    try:
        claims = jwt.decode(token, secret, algorithms=[os.getenv(f"{env_prefix}_JWT_ALG", "HS256")],
                            audience=f"{api_slug}-achievements", issuer=f"{api_slug}-game",
                            options={"require_exp": True, "require_aud": True, "require_iss": True})
        raw_user_id = claims["user_id"]
        if (not isinstance(raw_user_id, str) or not raw_user_id.isascii() or not raw_user_id.isdecimal()
                or not 0 < int(raw_user_id) <= 2147483647):
            raise ValueError("invalid_achievement_account")
        user_id = int(raw_user_id)
        events = get_unlocks(claims)
    except (JWTError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=401, detail="invalid_achievement_token") from error
    if not events:
        return {"game_key": api_slug, "accepted": []}
    if db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first() is None:
        raise HTTPException(status_code=404, detail="unknown_achievement_account")
    lock_account(db, user_id)
    accepted = []
    created = False
    for event in events:
        group, tier = event["group"], event["tier"]
        version = event.get("rule_version", 1)
        source_id = f"{api_slug}:achievement:v{version}:{user_id}:{group}:{tier}"
        if db.query(UserNotification).filter_by(source_event_id=source_id).first() is None:
            db.add(UserNotification(
                user_id=user_id, type="game_achievement", title="Achievement Unlocked",
                message=fallback_message, icon="achievement", is_read=False,
                source=api_slug, source_event_id=source_id,
                notification_metadata={"game_key": api_slug, "group": group, "tier": tier,
                                       "target": event["target"]},
            ))
            db.flush()
            created = True
        accepted.append({"group": group, "tier": tier})
    if created:
        schedule_notification_event(db, user_id)
    db.commit()
    return {"game_key": api_slug, "accepted": accepted}
