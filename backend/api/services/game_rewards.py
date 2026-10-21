"""Signed, once-per-account-and-level rewards shared by registered games."""

import os
from uuid import NAMESPACE_URL, uuid5

from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from config.game_auth import get_game_auth_entry_by_api_slug
from config.game_rewards import GAME_LEVEL_REWARDS
from models import User
from services.assets import credit_assets, get_asset_balances, lock_account
from services.idempotency import replay_operation, save_operation


def claim_level_reward(db: Session, token: str, api_slug: str) -> dict:
    entry = get_game_auth_entry_by_api_slug(api_slug)
    if entry is None:
        raise HTTPException(status_code=404, detail="unknown_game")
    rule = GAME_LEVEL_REWARDS.get(entry.game_key)
    if rule is None:
        raise HTTPException(status_code=404, detail="level_rewards_not_configured")
    secret = (
        os.getenv(f"{entry.env_prefix}_REWARD_SECRET")
        or os.getenv(f"{entry.env_prefix}_JWT_SECRET")
        or ""
    ).strip()
    if not secret or secret == "CHESSMATER" or secret.startswith("change-this-"):
        raise HTTPException(status_code=503, detail="reward_signing_not_configured")
    try:
        claims = jwt.decode(
            token, secret,
            algorithms=[os.getenv(f"{entry.env_prefix}_JWT_ALG", "HS256")],
            audience=f"{entry.game_key}-level-reward",
            issuer=f"{entry.game_key}-game",
            options={"require_exp": True, "require_aud": True, "require_iss": True},
        )
        raw_user_id = claims["user_id"]
        level = claims["level"]
        if (
            not isinstance(raw_user_id, str)
            or not raw_user_id.isascii()
            or not raw_user_id.isdecimal()
            or not 0 < int(raw_user_id) <= 2147483647
            or type(level) is not int
            or not rule.first_level <= level <= rule.last_level
            or claims.get("purpose") != "first-clear-reward"
        ):
            raise ValueError("invalid_reward_claim")
        user_id = int(raw_user_id)
    except (JWTError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=401, detail="invalid_reward_token") from error
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if user is None:
        raise HTTPException(status_code=404, detail="unknown_reward_account")
    # Keep the game/level identity stable across retries and reward configuration changes.
    lock_account(db, user_id)
    request_id = uuid5(NAMESPACE_URL, f"{entry.game_key}:first-clear:{level}")
    operation = f"{entry.game_key}.{rule.ledger_operation}"
    payload = {"level": level}
    previous = replay_operation(db, user_id, request_id, operation, payload)
    rewards = previous if previous is not None else dict(rule.rewards)
    if previous is None:
        credit_assets(db, user_id, rewards, source=operation, request_id=str(request_id))
        save_operation(db, user_id, request_id, operation, payload, rewards)
    db.commit()
    return {
        "game_key": entry.game_key,
        "level": level,
        "rewards": rewards,
        "already_claimed": previous is not None,
        "assets": get_asset_balances(db, user_id),
    }
