"""
排行榜：总脑力榜、各维度榜
"""
from fastapi import APIRouter, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database import get_db
from models import User, UserCognitiveScores
from schemas import APIResponse
from auth import get_current_active_user
from fastapi import Depends

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
            ((UserCognitiveScores.memory + UserCognitiveScores.logic + UserCognitiveScores.focus
              + UserCognitiveScores.reaction + UserCognitiveScores.strategy + UserCognitiveScores.spatial) / 6).label("score"),
        ).subquery()
        rows = (
            db.query(User.id, User.username, subq.c.score)
            .join(subq, User.id == subq.c.user_id)
            .order_by(desc(subq.c.score))
            .limit(limit)
            .all()
        )
    elif type in DIMENSION_COLUMNS:
        col = getattr(UserCognitiveScores, type)
        rows = (
            db.query(User.id, User.username, col)
            .join(UserCognitiveScores, User.id == UserCognitiveScores.user_id)
            .order_by(desc(col))
            .limit(limit)
            .all()
        )
    else:
        return APIResponse(success=False, message="invalid type", data=None)
    result = [
        {"rank": i + 1, "user_id": r[0], "username": r[1], "score": round(r[2]) if r[2] is not None else 0}
        for i, r in enumerate(rows)
    ]
    return APIResponse(success=True, message="ok", data={"list": result})
