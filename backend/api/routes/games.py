"""Game routes: JWT for embedded games, play-record, likes, per-mode stats (no cooldown flower grants)."""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from config.shop_items import SHOP_ITEMS, get_shop_items_by_game, is_item_available_for_game
from database import get_db
from models import User, UserGameReward, UserGamePlayByDay, UserRewards, GameLike, UserGamePlayed
from schemas import APIResponse, GamePlayRecordIn
from auth import (
    get_current_active_user,
    create_fogchess_token,
    FOG_CHESS_TOKEN_EXPIRE_SECONDS,
  
    create_sudoku_token,
    SUDOKU_TOKEN_EXPIRE_SECONDS,
  
    create_quantumgo_token,
    QUANTUMGO_TOKEN_EXPIRE_SECONDS,
  
    create_chessmater_token,
    CHESSMATER_TOKEN_EXPIRE_SECONDS,
  
    create_tourmaster_token,
    TOURMASTER_TOKEN_EXPIRE_SECONDS,

    create_onlinechess_token,
    ONLINE_CHESS_TOKEN_EXPIRE_SECONDS,
)


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


def _build_chessmater_session_response(current_user: User, game_token: str, expires_in: int) -> APIResponse:
    """
    Build lightweight ChessMater session-refresh response.
    This endpoint is for silent refresh and should not mutate play stats.
    """
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


@router.post("/fogchess/token", response_model=APIResponse)
async def issue_fogchess_token(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """为当前登录用户签发 FogChess 短期令牌

    返回字段：
    - game_token: 供 FogChess 使用的短期 JWT（建议仅用于首次换取服务端会话）
    - expires_in: 过期秒数
    - user: 基础身份信息（可选，便于前端展示）
    """
    _try_insert_user_game_played(db, current_user.id, "fogchess")

    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
        # 可按需加入：roles、locale、avatar 等
    }

    token = create_fogchess_token(claims)
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, "fogchess")
    total_flowers = _total_flowers_for_user(db, current_user.id)
    assets = _get_asset_balances(db, current_user.id)
    return _build_token_response(
        current_user=current_user,
        game_token=token,
        expires_in=FOG_CHESS_TOKEN_EXPIRE_SECONDS,
        reward_status=reward_status,
        flowers_awarded=flowers_awarded,
        total_flowers=total_flowers,
        assets=assets,
    )


@router.post("/online-chess/token", response_model=APIResponse)
async def issue_onlinechess_token(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """为当前登录用户签发 Online Chess 短期令牌

    返回字段：
    - game_token: 供 Online Chess 使用的短期 JWT（仅用于首次换取服务端会话）
    - expires_in: 过期秒数
    - user: 基础身份信息（可选，便于前端展示）
    """
    _try_insert_user_game_played(db, current_user.id, "online-chess")

    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
        # 可按需加入：roles、locale、avatar 等
    }

    token = create_onlinechess_token(claims)
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, "online-chess")
    total_flowers = _total_flowers_for_user(db, current_user.id)
    assets = _get_asset_balances(db, current_user.id)
    return _build_token_response(
        current_user=current_user,
        game_token=token,
        expires_in=ONLINE_CHESS_TOKEN_EXPIRE_SECONDS,
        reward_status=reward_status,
        flowers_awarded=flowers_awarded,
        total_flowers=total_flowers,
        assets=assets,
    )


@router.post("/sudoku/token", response_model=APIResponse)
async def issue_sudoku_token(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """为当前登录用户签发 Sudoku 短期令牌

    返回字段：
    - game_token: 供 Sudoku Battle 使用的短期 JWT（建议仅用于首次换取服务端会话）
    - expires_in: 过期秒数
    - user: 基础身份信息（可选，便于前端展示）
    """
    _try_insert_user_game_played(db, current_user.id, "sudoku")

    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
        # 可按需加入：roles、locale、avatar 等
    }

    token = create_sudoku_token(claims)
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, "sudoku")
    total_flowers = _total_flowers_for_user(db, current_user.id)
    assets = _get_asset_balances(db, current_user.id)
    return _build_token_response(
        current_user=current_user,
        game_token=token,
        expires_in=SUDOKU_TOKEN_EXPIRE_SECONDS,
        reward_status=reward_status,
        flowers_awarded=flowers_awarded,
        total_flowers=total_flowers,
        assets=assets,
    )


@router.post("/quantumgo/token", response_model=APIResponse)
async def issue_quantumgo_token(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """为当前登录用户签发 QuantumGo 短期令牌

    返回字段：
    - game_token: 供 QuantumGo 使用的短期 JWT（建议仅用于首次换取服务端会话）
    - expires_in: 过期秒数
    - user: 基础身份信息（可选，便于前端展示）
    """
    _try_insert_user_game_played(db, current_user.id, "quantumgo")

    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
        # 可按需加入：roles、locale、avatar 等
    }

    token = create_quantumgo_token(claims)
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, "quantumgo")
    total_flowers = _total_flowers_for_user(db, current_user.id)
    assets = _get_asset_balances(db, current_user.id)
    return _build_token_response(
        current_user=current_user,
        game_token=token,
        expires_in=QUANTUMGO_TOKEN_EXPIRE_SECONDS,
        reward_status=reward_status,
        flowers_awarded=flowers_awarded,
        total_flowers=total_flowers,
        assets=assets,
    )


@router.post("/chessmater/token", response_model=APIResponse)
async def issue_chessmater_token(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    x_user_timezone: str | None = Header(None, alias="X-User-Timezone"),
):
    """
    为当前登录用户签发 ChessMater 短期令牌；
    按用户当地日期记录当日点开次数，用于每日任务进度。
    """
    tz = (x_user_timezone or "").strip() or DEFAULT_TZ
    today_iso = _today_in_tz(tz)
    _increment_daily_play(db, current_user.id, "chessmater", today_iso)

    _try_insert_user_game_played(db, current_user.id, "chessmater")

    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
        # 可以按需加入: roles, locale, avatar 等
    }

    token = create_chessmater_token(claims)
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, "chessmater")
    total_flowers = _total_flowers_for_user(db, current_user.id)
    assets = _get_asset_balances(db, current_user.id)
    return _build_token_response(
        current_user=current_user,
        game_token=token,
        expires_in=CHESSMATER_TOKEN_EXPIRE_SECONDS,
        reward_status=reward_status,
        flowers_awarded=flowers_awarded,
        total_flowers=total_flowers,
        assets=assets,
    )


@router.get("/chessmater/session", response_model=APIResponse)
async def refresh_chessmater_session(
    response: Response,
    current_user: User = Depends(get_current_active_user),
):
    """
    Silent refresh endpoint for ChessMater.
    Requires current portal authentication and only issues a fresh short-lived game token.
    """
    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
    }
    token = create_chessmater_token(claims)
    # Prevent token responses from being cached by browsers/proxies.
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return _build_game_session_response(
        current_user=current_user,
        game_token=token,
        expires_in=CHESSMATER_TOKEN_EXPIRE_SECONDS,
    )


@router.get("/quantumgo/session", response_model=APIResponse)
async def refresh_quantumgo_session(
    response: Response,
    current_user: User = Depends(get_current_active_user),
):
    """
    Silent refresh endpoint for QuantumGo.
    Requires current portal authentication and only issues a fresh short-lived game token.
    """
    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
    }
    token = create_quantumgo_token(claims)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return _build_game_session_response(
        current_user=current_user,
        game_token=token,
        expires_in=QUANTUMGO_TOKEN_EXPIRE_SECONDS,
    )


@router.post("/chess-tourmaster/token", response_model=APIResponse)
async def issue_tourmaster_token(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    x_user_timezone: str | None = Header(None, alias="X-User-Timezone"),
):
    """
    为当前登录用户签发 Chess-Tourmaster 短期令牌；
    按用户当地日期记录当日点开次数，用于每日/每月任务进度。
    """
    tz = (x_user_timezone or "").strip() or DEFAULT_TZ
    today_iso = _today_in_tz(tz)
    _increment_daily_play(db, current_user.id, "chess-tourmaster", today_iso)

    _try_insert_user_game_played(db, current_user.id, "chess-tourmaster")

    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
    }

    token = create_tourmaster_token(claims)
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, "chess-tourmaster")
    total_flowers = _total_flowers_for_user(db, current_user.id)
    assets = _get_asset_balances(db, current_user.id)
    return _build_token_response(
        current_user=current_user,
        game_token=token,
        expires_in=TOURMASTER_TOKEN_EXPIRE_SECONDS,
        reward_status=reward_status,
        flowers_awarded=flowers_awarded,
        total_flowers=total_flowers,
        assets=assets,
    )


@router.get("/chess-tourmaster/session", response_model=APIResponse)
async def refresh_tourmaster_session(
    response: Response,
    current_user: User = Depends(get_current_active_user),
):
    """
    Silent refresh endpoint for Chess-Tourmaster.
    Requires current portal authentication and only issues a fresh short-lived game token.
    """
    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
    }
    token = create_tourmaster_token(claims)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return _build_game_session_response(
        current_user=current_user,
        game_token=token,
        expires_in=TOURMASTER_TOKEN_EXPIRE_SECONDS,
    )


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
