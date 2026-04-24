"""
排行榜：总脑力榜、各维度榜
"""
from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, text

from database import get_db
from models import User, UserCognitiveScores
from schemas import APIResponse
from auth import get_current_active_user

router = APIRouter(prefix="/api/leaderboard", tags=["排行榜"])

DIMENSION_COLUMNS = ["memory", "logic", "focus", "reaction", "strategy", "spatial"]


@router.get("", response_model=APIResponse)
async def get_leaderboard(
    type: str = Query("total", description="total | memory | logic | focus | reaction | strategy | spatial"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """排行榜：type=total 为六维平均分；否则为单维度分"""
    if type == "total":
        # 总脑力 = 六维平均（只统计有至少一维分数的用户）
        subq = db.query(
            UserCognitiveScores.user_id,
            UserCognitiveScores.previous_total_rank,
            ((UserCognitiveScores.memory + UserCognitiveScores.logic + UserCognitiveScores.focus
              + UserCognitiveScores.reaction + UserCognitiveScores.strategy + UserCognitiveScores.spatial) / 6).label("score"),
        ).subquery()
        rows = (
            db.query(User.id, User.username, subq.c.score, subq.c.previous_total_rank, User.avatar_object_key, User.google_avatar_url)
            .join(subq, User.id == subq.c.user_id)
            .order_by(desc(subq.c.score))
            .limit(limit)
            .all()
        )
    elif type in DIMENSION_COLUMNS:
        col = getattr(UserCognitiveScores, type)
        rows = (
            db.query(User.id, User.username, col, UserCognitiveScores.previous_total_rank, User.avatar_object_key, User.google_avatar_url)
            .join(UserCognitiveScores, User.id == UserCognitiveScores.user_id)
            .order_by(desc(col))
            .limit(limit)
            .all()
        )
    else:
        return APIResponse(success=False, message="invalid type", data=None)
        
    result = []
    for i, r in enumerate(rows):
        current_rank = i + 1
        score = round(r[2]) if r[2] is not None else 0
        previous_rank = r[3]
        avatar_object_key = r[4]
        google_avatar_url = r[5]
        
        avatar_url = None
        if avatar_object_key:
            try:
                from utils.r2_storage import generate_object_read_url
                avatar_url = generate_object_read_url(avatar_object_key)
            except Exception:
                pass
        if not avatar_url and google_avatar_url:
            avatar_url = google_avatar_url
        
        # 判断趋势
        if previous_rank is None or previous_rank == current_rank:
            trend = "stable"
        elif previous_rank > current_rank:
            trend = "up"
        else:
            trend = "down"
            
        result.append({
            "rank": current_rank,
            "user_id": r[0],
            "username": r[1],
            "score": score,
            "trend": trend,
            "avatar_url": avatar_url
        })
        
    return APIResponse(success=True, message="ok", data={"list": result})

@router.post("/snapshot", response_model=APIResponse)
async def snapshot_global_ranks(
    secret: str = Query(..., description="Admin secret key to trigger snapshot"),
    db: Session = Depends(get_db),
):
    """
    保存当前的全局排行榜快照（用于计算升降趋势）。
    在 Railway 可以通过 Cron Job 每天定时调用这个接口（例如 curl -X POST https://your-app/api/leaderboard/snapshot?secret=your-secret）。
    """
    import os
    expected_secret = os.getenv("ADMIN_SECRET", "deepbrain2026")
    if secret != expected_secret:
        return APIResponse(success=False, message="unauthorized", data=None)
        
    # 仅针对 PostgreSQL 的原生排序更新
    sql = text("""
        WITH current_ranks AS (
            SELECT 
                user_id,
                RANK() OVER (
                    ORDER BY (memory + logic + focus + reaction + strategy + spatial) DESC
                ) as rank
            FROM user_cognitive_scores
        )
        UPDATE user_cognitive_scores
        SET previous_total_rank = current_ranks.rank
        FROM current_ranks
        WHERE user_cognitive_scores.user_id = current_ranks.user_id;
    """)
    try:
        db.execute(sql)
        db.commit()
        return APIResponse(success=True, message="Ranks snapshot updated successfully", data=None)
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, message=str(e), data=None)
