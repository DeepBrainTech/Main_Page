"""Game routes: JWT for embedded games, play-record, likes, per-mode stats (no cooldown flower grants)."""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from config.shop_items import SHOP_ITEMS, get_shop_items_by_game, is_item_available_for_game
from config.game_auth import create_game_token, get_game_auth_entry_by_api_slug
from database import get_db
from models import User, UserGameReward, UserGamePlayByDay, UserRewards, GameLike, UserGamePlayed
from schemas import APIResponse, GamePlayRecordIn
from auth import get_current_active_user


router = APIRouter(prefix="/api/games", tags=["Games"])


@router.get("/shop/catalog", response_model=APIResponse)
async def get_shop_catalog_public(
    game_mode: str | None = Query(
        None,
        description="If set, only items usable in this mode (e.g. chessmater, chess-tourmaster).",
    ),
):
    """
    Read-only shop prices for embedded game clients. Same source as GET /api/user/shop/items;
    no auth. Redeem/consume endpoints still enforce cost server-side.
    """
    items = get_shop_items_by_game(game_mode)
    return APIResponse(
        success=True,
        message="ok",
        data={"items": items, "game_mode": game_mode},
    )


@router.get("/shop/item", response_model=APIResponse)
async def get_shop_item_price_public(
    item_id: str = Query(..., description="Shop item id, e.g. chess_mater_undo"),
    game_mode: str | None = Query(
        None,
        description="If set, returns 400 when the item is not available for this mode.",
    ),
):
    """Single-item price lookup for games that only need one SKU."""
    item = SHOP_ITEMS.get(item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_item_id")
    if game_mode and not is_item_available_for_game(item, game_mode):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="item_not_available_for_game",
        )
    return APIResponse(
        success=True,
        message="ok",
        data={
            "item_id": item_id,
            "name": item["name"],
            "games": item.get("games", []),
            "cost": item["cost"],
        },
    )


DEFAULT_TZ = "UTC"
SUPPORTED_GAME_KEYS = {
    "sudoku",
    "intercontinental-chess",
    "mathchess",
    "chessmater",
    "quantumgo",
    "fogchess",
    "chess-tourmaster",
    "online-chess",
    "dash-dot-simulator",
    "stack_math_chess",
    "recon_chess",
}


def _try_insert_user_game_played(db: Session, user_id: int, game_key: str) -> bool:
    """Insert first-play row if missing; flush only. Caller commits. Returns True if inserted."""
    existing = db.query(UserGamePlayed).filter(
        UserGamePlayed.user_id == user_id,
        UserGamePlayed.game_key == game_key,
    ).first()
    if existing:
        return False
    db.add(UserGamePlayed(user_id=user_id, game_key=game_key))
    db.flush()
    return True


def _today_in_tz(tz: str) -> str:
    """用户当地时区的今日日期 YYYY-MM-DD（用于按日任务进度）"""
    try:
        return datetime.now(ZoneInfo(tz)).date().isoformat()
    except Exception:
        return datetime.now(ZoneInfo(DEFAULT_TZ)).date().isoformat()


def _increment_daily_play(db: Session, user_id: int, game_mode: str, today_iso: str) -> None:
    """当日点开游戏次数 +1，用于每日/每月任务进度（按用户当地日期）"""
    row = db.query(UserGamePlayByDay).filter(
        UserGamePlayByDay.user_id == user_id,
        UserGamePlayByDay.game_mode == game_mode,
        UserGamePlayByDay.play_date == today_iso,
    ).first()
    if row:
        row.count += 1
        db.add(row)
    else:
        db.add(UserGamePlayByDay(user_id=user_id, game_mode=game_mode, play_date=today_iso, count=1))
    db.flush()


def _build_reward_status(record: UserGameReward, now: datetime) -> dict:
    _ = now
    return {
        "game_mode": record.game_mode,
        "flowers_earned": record.flowers_earned,
        "click_count": record.click_count,
        "last_played_at": record.last_played_at.isoformat() if record.last_played_at else None,
        "last_claimed_at": record.last_claimed_at.isoformat() if record.last_claimed_at else None,
        "can_claim_now": False,
        "seconds_until_next_claim": 0,
    }


def _get_or_create_reward_record(db: Session, user_id: int, game_mode: str) -> UserGameReward:
    record = db.query(UserGameReward).filter(
        UserGameReward.user_id == user_id,
        UserGameReward.game_mode == game_mode,
    ).first()
    if record:
        return record

    record = UserGameReward(user_id=user_id, game_mode=game_mode)
    db.add(record)
    db.flush()
    return record


def _get_asset_balances(db: Session, user_id: int) -> dict:
    rewards = db.query(UserRewards).filter(UserRewards.user_id == user_id).first()
    if rewards is None:
        return {"coins": 0, "diamonds": 0, "flowers": 0}
    return {
        "coins": rewards.coins,
        "diamonds": rewards.diamonds,
        "flowers": rewards.flowers,
    }


def _record_play_and_claim_if_ready(db: Session, user: User, game_mode: str) -> tuple[UserGameReward, dict, int]:
    """Updates per-game click stats only; does not grant flowers or touch cooldown."""
    now = datetime.utcnow()
    record = _get_or_create_reward_record(db, user.id, game_mode)

    record.click_count += 1
    record.last_played_at = now

    db.add(record)
    db.commit()
    db.refresh(record)

    reward_status = _build_reward_status(record, now)
    return record, reward_status, 0


def _serialize_like_payload(db: Session, user_id: int) -> list[dict]:
    like_count_rows = db.query(
        GameLike.game_key,
        func.count(GameLike.id),
    ).group_by(GameLike.game_key).all()
    liked_rows = db.query(GameLike.game_key).filter(GameLike.user_id == user_id).all()

    like_count_map = {row[0]: int(row[1]) for row in like_count_rows}
    liked_set = {row[0] for row in liked_rows}

    return [
        {
            "game_key": game_key,
            "like_count": like_count_map.get(game_key, 0),
            "liked_by_me": game_key in liked_set,
        }
        for game_key in sorted(SUPPORTED_GAME_KEYS)
    ]


def _total_flowers_for_user(db: Session, user_id: int) -> int:
    return _get_asset_balances(db, user_id)["flowers"]


def _build_token_response(
    current_user: User,
    game_token: str,
    expires_in: int,
    reward_status: dict,
    flowers_awarded: int,
    total_flowers: int,
    assets: dict,
) -> APIResponse:
    return APIResponse(
        success=True,
        message="ok",
        data={
            "game_token": game_token,
            "expires_in": expires_in,
            "flowers_awarded": flowers_awarded,
            "reward_status": reward_status,
            "total_flowers": total_flowers,
            "assets": assets,
            "user": {
                "id": current_user.id,
                "username": current_user.username,
            },
        },
    )


def _build_game_session_response(
    current_user: User,
    game_token: str,
    expires_in: int,
) -> APIResponse:
    """Build lightweight game session-refresh response."""
    return APIResponse(
        success=True,
        message="ok",
        data={
            "game_token": game_token,
            "expires_in": expires_in,
            "user_id": current_user.id,
            "username": current_user.username,
            "user": {
                "id": current_user.id,
                "username": current_user.username,
            },
        },
    )


def _user_token_claims(user: User) -> dict:
    return {
        "sub": user.username,
        "user_id": user.id,
        "username": user.username,
    }


def _issue_game_token_response(
    current_user: User,
    db: Session,
    game_key: str,
    *,
    track_daily: bool = False,
    user_timezone: str | None = None,
) -> APIResponse:
    """Issue a short-lived game JWT and record portal-side play stats."""
    if track_daily:
        tz = (user_timezone or "").strip() or DEFAULT_TZ
        _increment_daily_play(db, current_user.id, game_key, _today_in_tz(tz))

    _try_insert_user_game_played(db, current_user.id, game_key)
    token, expires_in = create_game_token(game_key, _user_token_claims(current_user))
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, game_key)
    total_flowers = _total_flowers_for_user(db, current_user.id)
    assets = _get_asset_balances(db, current_user.id)
    return _build_token_response(
        current_user=current_user,
        game_token=token,
        expires_in=expires_in,
        reward_status=reward_status,
        flowers_awarded=flowers_awarded,
        total_flowers=total_flowers,
        assets=assets,
    )


def _refresh_game_session_response(current_user: User, game_key: str) -> APIResponse:
    """Silent refresh: issue a fresh short-lived game token without mutating play stats."""
    token, expires_in = create_game_token(game_key, _user_token_claims(current_user))
    return _build_game_session_response(
        current_user=current_user,
        game_token=token,
        expires_in=expires_in,
    )


@router.post("/play-record", response_model=APIResponse)
async def record_game_played(
    body: GamePlayRecordIn,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Record that the user opened a game from the portal (distinct games only; independent of rewards)."""
    if body.game_key not in SUPPORTED_GAME_KEYS:
        return APIResponse(success=False, message="invalid_game_key", data={"game_key": body.game_key})

    is_new = _try_insert_user_game_played(db, current_user.id, body.game_key)
    db.commit()
    total = db.query(UserGamePlayed).filter(UserGamePlayed.user_id == current_user.id).count()

    return APIResponse(
        success=True,
        message="ok",
        data={
            "played_game_count": total,
            "is_new": is_new,
        },
    )


@router.get("/likes", response_model=APIResponse)
async def get_game_likes(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return APIResponse(
        success=True,
        message="ok",
        data={
            "likes": _serialize_like_payload(db, current_user.id),
        },
    )


@router.post("/likes/{game_key}", response_model=APIResponse)
async def like_game(
    game_key: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if game_key not in SUPPORTED_GAME_KEYS:
        return APIResponse(success=False, message="invalid_game_key", data={"game_key": game_key})

    existing = db.query(GameLike).filter(
        GameLike.user_id == current_user.id,
        GameLike.game_key == game_key,
    ).first()
    if not existing:
        db.add(GameLike(user_id=current_user.id, game_key=game_key))
        db.commit()

    return APIResponse(
        success=True,
        message="ok",
        data={
            "likes": _serialize_like_payload(db, current_user.id),
        },
    )


@router.delete("/likes/{game_key}", response_model=APIResponse)
async def unlike_game(
    game_key: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if game_key not in SUPPORTED_GAME_KEYS:
        return APIResponse(success=False, message="invalid_game_key", data={"game_key": game_key})

    existing = db.query(GameLike).filter(
        GameLike.user_id == current_user.id,
        GameLike.game_key == game_key,
    ).first()
    if existing:
        db.delete(existing)
        db.commit()

    return APIResponse(
        success=True,
        message="ok",
        data={
            "likes": _serialize_like_payload(db, current_user.id),
        },
    )


@router.post("/{api_slug}/token", response_model=APIResponse)
async def issue_game_token(
    api_slug: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    x_user_timezone: str | None = Header(None, alias="X-User-Timezone"),
):
    """Issue a short-lived JWT for an embedded game (bootstrap / first paint)."""
    entry = get_game_auth_entry_by_api_slug(api_slug)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="unknown_game")

    return _issue_game_token_response(
        current_user,
        db,
        entry.game_key,
        track_daily=entry.track_daily_play,
        user_timezone=x_user_timezone,
    )


@router.get("/{api_slug}/session", response_model=APIResponse)
async def refresh_game_session(
    api_slug: str,
    response: Response,
    current_user: User = Depends(get_current_active_user),
):
    """Silent refresh: new game_token via portal cookie; no play-stats side effects."""
    entry = get_game_auth_entry_by_api_slug(api_slug)
    if entry is None or not entry.has_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="unknown_game")

    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return _refresh_game_session_response(current_user, entry.game_key)


@router.post("/sudoku/play", response_model=APIResponse)
async def track_sudoku_play(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _try_insert_user_game_played(db, current_user.id, "sudoku")
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, "sudoku")
    total_flowers = _total_flowers_for_user(db, current_user.id)
    return APIResponse(
        success=True,
        message="ok",
        data={
            "flowers_awarded": flowers_awarded,
            "reward_status": reward_status,
            "total_flowers": total_flowers,
            "assets": _get_asset_balances(db, current_user.id),
            "server_time": datetime.utcnow().isoformat(),
        },
    )


@router.get("/rewards/status", response_model=APIResponse)
async def get_reward_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Per-mode play stats and balances (legacy reward-status shape; no active cooldown claims)."""
    now = datetime.utcnow()
    modes = ["fogchess", "sudoku", "quantumgo", "chessmater", "chess-tourmaster"]
    rewards = db.query(UserGameReward).filter(UserGameReward.user_id == current_user.id).all()
    reward_map = {item.game_mode: item for item in rewards}

    statuses = []
    for mode in modes:
        record = reward_map.get(mode)
        if record is None:
            statuses.append(
                {
                    "game_mode": mode,
                    "flowers_earned": 0,
                    "click_count": 0,
                    "last_played_at": None,
                    "last_claimed_at": None,
                    "can_claim_now": False,
                    "seconds_until_next_claim": 0,
                }
            )
            continue
        statuses.append(_build_reward_status(record, now))

    return APIResponse(
        success=True,
        message="ok",
        data={
            "total_flowers": _total_flowers_for_user(db, current_user.id),
            "assets": _get_asset_balances(db, current_user.id),
            "rewards": statuses,
            "server_time": now.isoformat(),
        },
    )
