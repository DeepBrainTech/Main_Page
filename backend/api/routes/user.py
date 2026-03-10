"""
用户奖励、签到、任务、六维分数、排行榜
"""
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from database import get_db
from models import User, UserRewards, UserCheckIn, UserTaskClaim, UserCognitiveScores, UserGameReward
from schemas import APIResponse, RewardsState, CognitiveScoresBody, CognitiveScoresResponse, LeaderboardEntry
from auth import get_current_active_user

router = APIRouter(prefix="/api/user", tags=["用户"])

CHECK_IN_COINS = 10
STREAK_DIAMONDS = 10
STREAK_DAYS = 7
DAILY_TASK_COINS = 10
MONTHLY_TASK_DIAMONDS = 10
GAME_MODE_DAILY_1 = "chessmater"
GAME_MODE_DAILY_2 = "chess-tourmaster"
GAME_MODE_MONTHLY = "chess-tourmaster"
MONTHLY_TARGET = 20


def _today() -> str:
    return date.today().isoformat()


def _this_month() -> str:
    return date.today().strftime("%Y-%m")


def _get_or_create_rewards(db: Session, user_id: int) -> UserRewards:
    r = db.query(UserRewards).filter(UserRewards.user_id == user_id).first()
    if r:
        return r
    r = UserRewards(user_id=user_id)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def _check_in_dates_this_month(db: Session, user_id: int) -> list[str]:
    today = date.today()
    start = today.replace(day=1).isoformat()
    end = today.isoformat()
    rows = (
        db.query(UserCheckIn.check_in_date)
        .filter(UserCheckIn.user_id == user_id, UserCheckIn.check_in_date >= start, UserCheckIn.check_in_date <= end)
        .order_by(UserCheckIn.check_in_date)
        .all()
    )
    return [r[0] for r in rows]


def _current_streak(db: Session, user_id: int, sorted_dates: list[str]) -> int:
    if not sorted_dates:
        return 0
    today = _today()
    if today not in sorted_dates:
        return 0
    streak = 0
    d = date.fromisoformat(today)
    while True:
        key = d.isoformat()
        if key not in sorted_dates:
            break
        streak += 1
        from datetime import timedelta
        d -= timedelta(days=1)
    return streak


def _daily_progress_from_games(db: Session, user_id: int) -> dict:
    """从 UserGameReward 推导每日任务进度。task_id: daily-1 -> chessmater, daily-2 -> chess-tourmaster"""
    out = {}
    for mode, task_id in [(GAME_MODE_DAILY_1, "daily-1"), (GAME_MODE_DAILY_2, "daily-2")]:
        r = db.query(UserGameReward).filter(UserGameReward.user_id == user_id, UserGameReward.game_mode == mode).first()
        out[task_id] = r.click_count if r else 0
    return out


def _monthly_progress_from_games(db: Session, user_id: int) -> int:
    r = db.query(UserGameReward).filter(
        UserGameReward.user_id == user_id, UserGameReward.game_mode == GAME_MODE_MONTHLY
    ).first()
    return r.click_count if r else 0


def _task_claimed_today(db: Session, user_id: int) -> list[str]:
    today = _today()
    rows = db.query(UserTaskClaim.task_id).filter(
        UserTaskClaim.user_id == user_id, UserTaskClaim.claimed_date == today
    ).all()
    return [r[0] for r in rows]


def _monthly_claimed(db: Session, user_id: int) -> bool:
    month = _this_month()
    return db.query(UserTaskClaim).filter(
        UserTaskClaim.user_id == user_id,
        UserTaskClaim.task_id == "monthly-1",
        UserTaskClaim.claimed_date == month,
    ).first() is not None


@router.get("/rewards", response_model=APIResponse)
async def get_rewards(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取金币、钻石、签到状态、每日/每月任务进度（由游戏记录推导）"""
    rewards = _get_or_create_rewards(db, current_user.id)
    check_in_dates = _check_in_dates_this_month(db, current_user.id)
    all_dates = (
        db.query(UserCheckIn.check_in_date)
        .filter(UserCheckIn.user_id == current_user.id)
        .order_by(UserCheckIn.check_in_date)
        .all()
    )
    sorted_dates = [r[0] for r in all_dates]
    streak = _current_streak(db, current_user.id, sorted_dates)
    daily_progress = _daily_progress_from_games(db, current_user.id)
    monthly_progress = _monthly_progress_from_games(db, current_user.id)
    task_claimed = _task_claimed_today(db, current_user.id)
    monthly_claimed = _monthly_claimed(db, current_user.id)

    return APIResponse(
        success=True,
        message="ok",
        data={
            "coins": rewards.coins,
            "diamonds": rewards.diamonds,
            "check_in_dates": check_in_dates,
            "has_checked_in_today": _today() in sorted_dates,
            "current_streak": streak,
            "daily_progress": daily_progress,
            "monthly_progress": monthly_progress,
            "monthly_target": MONTHLY_TARGET,
            "task_claimed_today": task_claimed,
            "monthly_claimed": monthly_claimed,
        },
    )


@router.post("/check-in", response_model=APIResponse)
async def do_check_in(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """签到：今日未签则写入，发 10 金币；连续 7 天再发 10 钻石（每个 7 日周期只发一次）"""
    today = _today()
    existing = db.query(UserCheckIn).filter(
        UserCheckIn.user_id == current_user.id, UserCheckIn.check_in_date == today
    ).first()
    if existing:
        return APIResponse(success=True, message="already_checked_in", data={"coins": 0, "diamonds": 0})

    db.add(UserCheckIn(user_id=current_user.id, check_in_date=today))
    rewards = _get_or_create_rewards(db, current_user.id)
    rewards.coins += CHECK_IN_COINS
    coins_awarded = CHECK_IN_COINS
    diamonds_awarded = 0

    all_dates = [
        r[0] for r in
        db.query(UserCheckIn.check_in_date).filter(UserCheckIn.user_id == current_user.id).order_by(UserCheckIn.check_in_date).all()
    ]
    streak = _current_streak(db, current_user.id, all_dates)
    if streak >= STREAK_DAYS:
        from datetime import timedelta
        streak_start = date.fromisoformat(today) - timedelta(days=STREAK_DAYS - 1)
        streak_start_str = streak_start.isoformat()
        if rewards.last_streak_award_start != streak_start_str:
            rewards.diamonds += STREAK_DIAMONDS
            rewards.last_streak_award_start = streak_start_str
            diamonds_awarded = STREAK_DIAMONDS
    db.commit()
    db.refresh(rewards)
    return APIResponse(
        success=True,
        message="ok",
        data={"coins": coins_awarded, "diamonds": diamonds_awarded},
    )


@router.get("/cognitive-scores", response_model=APIResponse)
async def get_cognitive_scores(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取当前用户六维认知分数"""
    row = db.query(UserCognitiveScores).filter(UserCognitiveScores.user_id == current_user.id).first()
    if not row:
        return APIResponse(
            success=True,
            message="ok",
            data={"memory": 0, "logic": 0, "focus": 0, "reaction": 0, "strategy": 0, "spatial": 0},
        )
    return APIResponse(
        success=True,
        message="ok",
        data={
            "memory": row.memory,
            "logic": row.logic,
            "focus": row.focus,
            "reaction": row.reaction,
            "strategy": row.strategy,
            "spatial": row.spatial,
        },
    )


@router.put("/cognitive-scores", response_model=APIResponse)
async def update_cognitive_scores(
    body: CognitiveScoresBody,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """更新六维分数（只更新传入的维度，用于测试完成后合并）"""
    row = db.query(UserCognitiveScores).filter(UserCognitiveScores.user_id == current_user.id).first()
    if not row:
        row = UserCognitiveScores(user_id=current_user.id)
        db.add(row)
        db.flush()
    for key in ("memory", "logic", "focus", "reaction", "strategy", "spatial"):
        v = getattr(body, key, None)
        if v is not None:
            setattr(row, key, min(100, max(0, v)))
    db.commit()
    db.refresh(row)
    return APIResponse(
        success=True,
        message="ok",
        data={
            "memory": row.memory,
            "logic": row.logic,
            "focus": row.focus,
            "reaction": row.reaction,
            "strategy": row.strategy,
            "spatial": row.spatial,
        },
    )


@router.post("/tasks/claim", response_model=APIResponse)
async def claim_task(
    task_id: str = Query(..., description="daily-1, daily-2, monthly-1"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """领取任务奖励。后端根据游戏进度判断是否可领，并写入 UserTaskClaim 防重复。"""
    rewards = _get_or_create_rewards(db, current_user.id)
    today = _today()
    month = _this_month()

    if task_id == "daily-1":
        progress = _daily_progress_from_games(db, current_user.id).get("daily-1", 0)
        if progress < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="task_not_completed")
        if task_id in _task_claimed_today(db, current_user.id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="already_claimed")
        rewards.coins += DAILY_TASK_COINS
        db.add(UserTaskClaim(user_id=current_user.id, task_id=task_id, claimed_date=today))
    elif task_id == "daily-2":
        progress = _daily_progress_from_games(db, current_user.id).get("daily-2", 0)
        if progress < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="task_not_completed")
        if task_id in _task_claimed_today(db, current_user.id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="already_claimed")
        rewards.coins += DAILY_TASK_COINS
        db.add(UserTaskClaim(user_id=current_user.id, task_id=task_id, claimed_date=today))
    elif task_id == "monthly-1":
        progress = _monthly_progress_from_games(db, current_user.id)
        if progress < MONTHLY_TARGET:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="task_not_completed")
        if _monthly_claimed(db, current_user.id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="already_claimed")
        rewards.diamonds += MONTHLY_TASK_DIAMONDS
        db.add(UserTaskClaim(user_id=current_user.id, task_id=task_id, claimed_date=month))
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_task_id")
    db.commit()
    db.refresh(rewards)
    return APIResponse(success=True, message="ok", data={"coins": rewards.coins, "diamonds": rewards.diamonds})
