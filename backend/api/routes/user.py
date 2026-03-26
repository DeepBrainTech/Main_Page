"""
用户奖励、签到、任务、六维分数、排行榜
"""
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from database import get_db
from models import (
    User,
    UserRewards,
    UserCheckIn,
    UserTaskClaim,
    UserCognitiveScores,
    UserGameReward,
    UserGamePlayByDay,
    UserItemInventory,
)
from schemas import APIResponse, RewardsState, CognitiveScoresBody, CognitiveScoresResponse, LeaderboardEntry
from auth import get_current_active_user
from config.shop_items import SHOP_ITEMS, get_shop_items_by_game, is_item_available_for_game

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

# 未传或无效时区时回退到 UTC
DEFAULT_TZ = "UTC"


def _today_in_tz(tz: str) -> str:
    """用户当地时区的今日日期 YYYY-MM-DD"""
    try:
        return datetime.now(ZoneInfo(tz)).date().isoformat()
    except Exception:
        return datetime.now(ZoneInfo(DEFAULT_TZ)).date().isoformat()


def _this_month_in_tz(tz: str) -> str:
    """用户当地时区的当月 YYYY-MM"""
    try:
        return datetime.now(ZoneInfo(tz)).strftime("%Y-%m")
    except Exception:
        return datetime.now(ZoneInfo(DEFAULT_TZ)).strftime("%Y-%m")


def _get_or_create_rewards(db: Session, user_id: int) -> UserRewards:
    r = db.query(UserRewards).filter(UserRewards.user_id == user_id).first()
    if r:
        return r
    r = UserRewards(user_id=user_id)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def _check_in_dates_this_month(db: Session, user_id: int, today_iso: str) -> list[str]:
    """当月签到日期列表（以用户当地当月为准）"""
    d = date.fromisoformat(today_iso)
    start = d.replace(day=1).isoformat()
    end = today_iso
    rows = (
        db.query(UserCheckIn.check_in_date)
        .filter(UserCheckIn.user_id == user_id, UserCheckIn.check_in_date >= start, UserCheckIn.check_in_date <= end)
        .order_by(UserCheckIn.check_in_date)
        .all()
    )
    return [r[0] for r in rows]


def _current_streak(db: Session, user_id: int, sorted_dates: list[str], today_iso: str) -> int:
    if not sorted_dates:
        return 0
    if today_iso not in sorted_dates:
        return 0
    streak = 0
    d = date.fromisoformat(today_iso)
    while True:
        key = d.isoformat()
        if key not in sorted_dates:
            break
        streak += 1
        d -= timedelta(days=1)
    return streak


def _daily_progress_from_games(db: Session, user_id: int, today_iso: str) -> dict:
    """从按日表读取当日点开次数，作为每日任务进度。task_id: daily-1 -> chessmater, daily-2 -> chess-tourmaster"""
    out = {}
    for mode, task_id in [(GAME_MODE_DAILY_1, "daily-1"), (GAME_MODE_DAILY_2, "daily-2")]:
        r = db.query(UserGamePlayByDay).filter(
            UserGamePlayByDay.user_id == user_id,
            UserGamePlayByDay.game_mode == mode,
            UserGamePlayByDay.play_date == today_iso,
        ).first()
        out[task_id] = r.count if r else 0
    return out


def _monthly_progress_from_games(db: Session, user_id: int, month_ym: str) -> int:
    """当月该游戏模式点开次数之和（用于每月任务进度）"""
    row = (
        db.query(func.coalesce(func.sum(UserGamePlayByDay.count), 0))
        .filter(
            UserGamePlayByDay.user_id == user_id,
            UserGamePlayByDay.game_mode == GAME_MODE_MONTHLY,
            UserGamePlayByDay.play_date.like(f"{month_ym}-%"),
        )
        .scalar()
    )
    return int(row) if row is not None else 0


def _task_claimed_today(db: Session, user_id: int, today_iso: str) -> list[str]:
    rows = db.query(UserTaskClaim.task_id).filter(
        UserTaskClaim.user_id == user_id, UserTaskClaim.claimed_date == today_iso
    ).all()
    return [r[0] for r in rows]


def _monthly_claimed(db: Session, user_id: int, month_ym: str) -> bool:
    return db.query(UserTaskClaim).filter(
        UserTaskClaim.user_id == user_id,
        UserTaskClaim.task_id == "monthly-1",
        UserTaskClaim.claimed_date == month_ym,
    ).first() is not None


def _balances_dict(rewards: UserRewards) -> dict:
    """统一返回三种资产余额"""
    return {
        "coins": rewards.coins,
        "diamonds": rewards.diamonds,
        "flowers": rewards.flowers,
    }


@router.get("/rewards", response_model=APIResponse)
async def get_rewards(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    x_user_timezone: str | None = Header(None, alias="X-User-Timezone"),
):
    """获取金币、钻石、签到状态、每日/每月任务进度。日期按请求头 X-User-Timezone 的用户当地时间计算。"""
    tz = (x_user_timezone or "").strip() or DEFAULT_TZ
    today_iso = _today_in_tz(tz)
    month_ym = _this_month_in_tz(tz)

    rewards = _get_or_create_rewards(db, current_user.id)
    check_in_dates = _check_in_dates_this_month(db, current_user.id, today_iso)
    all_dates = (
        db.query(UserCheckIn.check_in_date)
        .filter(UserCheckIn.user_id == current_user.id)
        .order_by(UserCheckIn.check_in_date)
        .all()
    )
    sorted_dates = [r[0] for r in all_dates]
    streak = _current_streak(db, current_user.id, sorted_dates, today_iso)
    daily_progress = _daily_progress_from_games(db, current_user.id, today_iso)
    monthly_progress = _monthly_progress_from_games(db, current_user.id, month_ym)
    task_claimed = _task_claimed_today(db, current_user.id, today_iso)
    monthly_claimed = _monthly_claimed(db, current_user.id, month_ym)

    return APIResponse(
        success=True,
        message="ok",
        data={
            "coins": rewards.coins,
            "diamonds": rewards.diamonds,
            "flowers": rewards.flowers,
            "check_in_dates": check_in_dates,
            "has_checked_in_today": today_iso in sorted_dates,
            "current_streak": streak,
            "daily_progress": daily_progress,
            "monthly_progress": monthly_progress,
            "monthly_target": MONTHLY_TARGET,
            "task_claimed_today": task_claimed,
            "monthly_claimed": monthly_claimed,
        },
    )


@router.get("/assets", response_model=APIResponse)
async def get_assets(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取统一资产余额（金币/钻石/鲜花），供官网与游戏端读取。"""
    rewards = _get_or_create_rewards(db, current_user.id)
    return APIResponse(success=True, message="ok", data=_balances_dict(rewards))


@router.get("/shop/items", response_model=APIResponse)
async def get_shop_items(
    game_mode: str | None = Query(None, description="可选：按游戏模式过滤道具"),
    current_user: User = Depends(get_current_active_user),
):
    """获取可兑换道具配置。"""
    _ = current_user
    return APIResponse(
        success=True,
        message="ok",
        data={"items": get_shop_items_by_game(game_mode), "game_mode": game_mode},
    )


@router.post("/check-in", response_model=APIResponse)
async def do_check_in(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    x_user_timezone: str | None = Header(None, alias="X-User-Timezone"),
):
    """签到：按用户当地时区判定今日，未签则写入并发 10 金币；连续 7 天再发 10 钻石（每个 7 日周期只发一次）"""
    tz = (x_user_timezone or "").strip() or DEFAULT_TZ
    today = _today_in_tz(tz)

    existing = db.query(UserCheckIn).filter(
        UserCheckIn.user_id == current_user.id, UserCheckIn.check_in_date == today
    ).first()
    if existing:
        return APIResponse(success=True, message="already_checked_in", data={"coins": 0, "diamonds": 0, "flowers": 0})

    db.add(UserCheckIn(user_id=current_user.id, check_in_date=today))
    rewards = _get_or_create_rewards(db, current_user.id)
    rewards.coins += CHECK_IN_COINS
    coins_awarded = CHECK_IN_COINS
    diamonds_awarded = 0

    all_dates = [
        r[0] for r in
        db.query(UserCheckIn.check_in_date).filter(UserCheckIn.user_id == current_user.id).order_by(UserCheckIn.check_in_date).all()
    ]
    streak = _current_streak(db, current_user.id, all_dates, today)
    if streak >= STREAK_DAYS:
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
        data={"coins": coins_awarded, "diamonds": diamonds_awarded, "flowers": 0},
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
    x_user_timezone: str | None = Header(None, alias="X-User-Timezone"),
):
    """领取任务奖励。今日/当月按请求头 X-User-Timezone 的用户当地时间计算。"""
    tz = (x_user_timezone or "").strip() or DEFAULT_TZ
    today = _today_in_tz(tz)
    month = _this_month_in_tz(tz)

    rewards = _get_or_create_rewards(db, current_user.id)

    if task_id == "daily-1":
        progress = _daily_progress_from_games(db, current_user.id, today).get("daily-1", 0)
        if progress < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="task_not_completed")
        if task_id in _task_claimed_today(db, current_user.id, today):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="already_claimed")
        rewards.coins += DAILY_TASK_COINS
        db.add(UserTaskClaim(user_id=current_user.id, task_id=task_id, claimed_date=today))
    elif task_id == "daily-2":
        progress = _daily_progress_from_games(db, current_user.id, today).get("daily-2", 0)
        if progress < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="task_not_completed")
        if task_id in _task_claimed_today(db, current_user.id, today):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="already_claimed")
        rewards.coins += DAILY_TASK_COINS
        db.add(UserTaskClaim(user_id=current_user.id, task_id=task_id, claimed_date=today))
    elif task_id == "monthly-1":
        progress = _monthly_progress_from_games(db, current_user.id, month)
        if progress < MONTHLY_TARGET:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="task_not_completed")
        if _monthly_claimed(db, current_user.id, month):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="already_claimed")
        rewards.diamonds += MONTHLY_TASK_DIAMONDS
        db.add(UserTaskClaim(user_id=current_user.id, task_id=task_id, claimed_date=month))
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_task_id")
    db.commit()
    db.refresh(rewards)
    return APIResponse(success=True, message="ok", data=_balances_dict(rewards))


@router.get("/shop/inventory", response_model=APIResponse)
async def get_inventory(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取当前用户道具背包。"""
    rows = (
        db.query(UserItemInventory)
        .filter(UserItemInventory.user_id == current_user.id)
        .order_by(UserItemInventory.item_id.asc())
        .all()
    )
    return APIResponse(
        success=True,
        message="ok",
        data={
            "items": [
                {"item_id": r.item_id, "quantity": r.quantity}
                for r in rows
            ]
        },
    )


@router.post("/shop/redeem", response_model=APIResponse)
async def redeem_item(
    item_id: str = Query(..., description="道具 ID，如 avatar_hat_crown"),
    game_mode: str | None = Query(None, description="可选：当前游戏模式，用于校验道具可用范围"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """兑换道具：服务端校验并扣减金币/钻石/鲜花，成功后写入背包。"""
    item = SHOP_ITEMS.get(item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_item_id")
    if not is_item_available_for_game(item, game_mode):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="item_not_available_for_game")

    rewards = _get_or_create_rewards(db, current_user.id)
    cost = item["cost"]

    if rewards.coins < cost["coins"] or rewards.diamonds < cost["diamonds"] or rewards.flowers < cost["flowers"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="insufficient_assets")

    rewards.coins -= cost["coins"]
    rewards.diamonds -= cost["diamonds"]
    rewards.flowers -= cost["flowers"]

    inventory_row = (
        db.query(UserItemInventory)
        .filter(
            UserItemInventory.user_id == current_user.id,
            UserItemInventory.item_id == item_id,
        )
        .first()
    )
    if inventory_row is None:
        inventory_row = UserItemInventory(
            user_id=current_user.id,
            item_id=item_id,
            quantity=1,
        )
        db.add(inventory_row)
    else:
        inventory_row.quantity += 1
        db.add(inventory_row)

    db.add(rewards)
    db.commit()
    db.refresh(rewards)
    db.refresh(inventory_row)

    return APIResponse(
        success=True,
        message="ok",
        data={
            "item_id": item_id,
            "item_name": item["name"],
            "games": item.get("games", []),
            "game_mode": game_mode,
            "cost": cost,
            "inventory_quantity": inventory_row.quantity,
            "assets": _balances_dict(rewards),
        },
    )


@router.post("/shop/consume", response_model=APIResponse)
async def consume_item(
    item_id: str = Query(..., description="道具 ID，如 chess_tourmaster_hint"),
    count: int = Query(1, ge=1, le=99, description="消耗数量，默认 1"),
    game_mode: str | None = Query(None, description="可选：当前游戏模式，用于校验道具可用范围"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """消耗道具：服务端校验库存并扣减数量。"""
    item = SHOP_ITEMS.get(item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_item_id")
    if not is_item_available_for_game(item, game_mode):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="item_not_available_for_game")

    inventory_row = (
        db.query(UserItemInventory)
        .filter(
            UserItemInventory.user_id == current_user.id,
            UserItemInventory.item_id == item_id,
        )
        .first()
    )
    if inventory_row is None or inventory_row.quantity < count:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="insufficient_inventory")

    inventory_row.quantity -= count
    remain = inventory_row.quantity
    if inventory_row.quantity <= 0:
        db.delete(inventory_row)
        remain = 0
    else:
        db.add(inventory_row)
    db.commit()

    return APIResponse(
        success=True,
        message="ok",
        data={
            "item_id": item_id,
            "consumed_count": count,
            "inventory_quantity": remain,
            "game_mode": game_mode,
        },
    )
