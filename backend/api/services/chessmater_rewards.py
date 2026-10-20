"""Signed, one-time first-clear rewards from the ChessMater game server."""

import os
from uuid import NAMESPACE_URL, uuid5

from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from models import User
from services.assets import credit_assets, get_asset_balances, lock_account
from services.idempotency import replay_operation, save_operation

OPERATION = "chessmater.first-clear-coins"


def claim_level_reward(db: Session, token: str) -> dict:
    secret = os.getenv("CHESSMATER_REWARD_SECRET") or os.getenv("CHESSMATER_JWT_SECRET")
    if not secret or secret == "CHESSMATER":
        raise HTTPException(status_code=503, detail="reward_signing_not_configured")
    try:
        claims = jwt.decode(token, secret, algorithms=["HS256"],
                            audience="chessmater-level-reward", issuer="chessmater-game",
                            options={"require_exp": True, "require_aud": True, "require_iss": True})
        user_id = int(claims["user_id"])
        level = claims["level"]
        if user_id <= 0 or type(level) is not int or not 1 <= level <= 105 or claims.get("purpose") != "first-clear-coins":
            raise ValueError("invalid_reward_claim")
    except (JWTError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=401, detail="invalid_reward_token") from error
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if user is None:
        raise HTTPException(status_code=404, detail="unknown_reward_account")
    # Account locking and a stable per-level key cover concurrent requests and retries
    # even when the game server lost the previous delivery acknowledgement.
    lock_account(db, user_id)
    request_id = uuid5(NAMESPACE_URL, f"chessmater:first-clear:{level}")
    payload = {"level": level}
    previous = replay_operation(db, user_id, request_id, OPERATION, payload)
    if previous is None:
        credit_assets(db, user_id, {"coins": 200}, source=OPERATION, request_id=str(request_id))
        save_operation(db, user_id, request_id, OPERATION, payload, {"coins": 200})
    db.commit()
    return {"coins": 200, "already_claimed": previous is not None, "assets": get_asset_balances(db, user_id)}
