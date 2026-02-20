"""游戏相关路由：签发游戏令牌并记录每日奖励。"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserGameReward
from schemas import APIResponse
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
)


router = APIRouter(prefix="/api/games", tags=["游戏"])

DAILY_REWARD_FLOWERS = 10
REWARD_COOLDOWN = timedelta(hours=24)


def _build_reward_status(record: UserGameReward, now: datetime) -> dict:
    can_claim_now = (
        record.last_claimed_at is None
        or (now - record.last_claimed_at) >= REWARD_COOLDOWN
    )
    seconds_until_next_claim = 0
    if not can_claim_now and record.last_claimed_at is not None:
        remaining = REWARD_COOLDOWN - (now - record.last_claimed_at)
        seconds_until_next_claim = max(0, int(remaining.total_seconds()))

    return {
        "game_mode": record.game_mode,
        "flowers_earned": record.flowers_earned,
        "click_count": record.click_count,
        "last_played_at": record.last_played_at.isoformat() if record.last_played_at else None,
        "last_claimed_at": record.last_claimed_at.isoformat() if record.last_claimed_at else None,
        "can_claim_now": can_claim_now,
        "seconds_until_next_claim": seconds_until_next_claim,
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


def _record_play_and_claim_if_ready(db: Session, user: User, game_mode: str) -> tuple[UserGameReward, dict, int]:
    now = datetime.utcnow()
    record = _get_or_create_reward_record(db, user.id, game_mode)

    record.click_count += 1
    record.last_played_at = now

    awarded_flowers = 0
    if record.last_claimed_at is None or (now - record.last_claimed_at) >= REWARD_COOLDOWN:
        awarded_flowers = DAILY_REWARD_FLOWERS
        record.flowers_earned += awarded_flowers
        record.last_claimed_at = now

    db.add(record)
    db.commit()
    db.refresh(record)

    reward_status = _build_reward_status(record, now)
    return record, reward_status, awarded_flowers


def _total_flowers_for_user(db: Session, user_id: int) -> int:
    rewards = db.query(UserGameReward).filter(UserGameReward.user_id == user_id).all()
    return sum(item.flowers_earned for item in rewards)


def _build_token_response(
    current_user: User,
    game_token: str,
    expires_in: int,
    reward_status: dict,
    flowers_awarded: int,
    total_flowers: int,
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
            "user": {
                "id": current_user.id,
                "username": current_user.username,
            },
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
    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
        # 可按需加入：roles、locale、avatar 等
    }

    token = create_fogchess_token(claims)
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, "fogchess")
    total_flowers = _total_flowers_for_user(db, current_user.id)
    return _build_token_response(
        current_user=current_user,
        game_token=token,
        expires_in=FOG_CHESS_TOKEN_EXPIRE_SECONDS,
        reward_status=reward_status,
        flowers_awarded=flowers_awarded,
        total_flowers=total_flowers,
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
    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
        # 可按需加入：roles、locale、avatar 等
    }

    token = create_sudoku_token(claims)
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, "sudoku")
    total_flowers = _total_flowers_for_user(db, current_user.id)
    return _build_token_response(
        current_user=current_user,
        game_token=token,
        expires_in=SUDOKU_TOKEN_EXPIRE_SECONDS,
        reward_status=reward_status,
        flowers_awarded=flowers_awarded,
        total_flowers=total_flowers,
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
    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
        # 可按需加入：roles、locale、avatar 等
    }

    token = create_quantumgo_token(claims)
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, "quantumgo")
    total_flowers = _total_flowers_for_user(db, current_user.id)
    return _build_token_response(
        current_user=current_user,
        game_token=token,
        expires_in=QUANTUMGO_TOKEN_EXPIRE_SECONDS,
        reward_status=reward_status,
        flowers_awarded=flowers_awarded,
        total_flowers=total_flowers,
    )


@router.post("/chessmater/token", response_model=APIResponse)
async def issue_chessmater_token(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    为当前登录用户签发 ChessMater 短期令牌

    返回字段:
    - game_token: 供 ChessMater 使用的短期 JWT（建议仅用于首次换取服务端会话）
    - expires_in: 过期秒数
    - user: 基础身份信息（可选，便于前端展示）
    """
    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
        # 可以按需加入: roles, locale, avatar 等
    }

    token = create_chessmater_token(claims)
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, "chessmater")
    total_flowers = _total_flowers_for_user(db, current_user.id)
    return _build_token_response(
        current_user=current_user,
        game_token=token,
        expires_in=CHESSMATER_TOKEN_EXPIRE_SECONDS,
        reward_status=reward_status,
        flowers_awarded=flowers_awarded,
        total_flowers=total_flowers,
    )


@router.post("/chess-tourmaster/token", response_model=APIResponse)
async def issue_tourmaster_token(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    为当前登录用户签发 Chess-Tourmaster 短期令牌

    返回字段:
    - game_token: 供 Chess-Tourmaster 使用的短期 JWT（建议仅用于首次授权服务器端会话）
    - expires_in: 过期时间
    - user: 基础的身份信息
    """
    claims = {
        "sub": current_user.username,
        "user_id": current_user.id,
        "username": current_user.username,
    }

    token = create_tourmaster_token(claims)
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, "chess-tourmaster")
    total_flowers = _total_flowers_for_user(db, current_user.id)
    return _build_token_response(
        current_user=current_user,
        game_token=token,
        expires_in=TOURMASTER_TOKEN_EXPIRE_SECONDS,
        reward_status=reward_status,
        flowers_awarded=flowers_awarded,
        total_flowers=total_flowers,
    )


@router.post("/sudoku/play", response_model=APIResponse)
async def track_sudoku_play(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """记录 Sudoku 点击并按 24 小时规则发放花朵奖励。"""
    _, reward_status, flowers_awarded = _record_play_and_claim_if_ready(db, current_user, "sudoku")
    total_flowers = _total_flowers_for_user(db, current_user.id)
    return APIResponse(
        success=True,
        message="ok",
        data={
            "flowers_awarded": flowers_awarded,
            "reward_status": reward_status,
            "total_flowers": total_flowers,
            "server_time": datetime.utcnow().isoformat(),
        },
    )


@router.get("/rewards/status", response_model=APIResponse)
async def get_reward_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取当前用户所有游戏模式的每日奖励状态（以服务端时间为准）。"""
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
                    "can_claim_now": True,
                    "seconds_until_next_claim": 0,
                }
            )
            continue
        statuses.append(_build_reward_status(record, now))

    return APIResponse(
        success=True,
        message="ok",
        data={
            "total_flowers": sum(item.flowers_earned for item in rewards),
            "rewards": statuses,
            "server_time": now.isoformat(),
        },
    )
