"""Server-to-server reward delivery; browser game login tokens are not accepted."""

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from schemas import APIResponse
from services.chessmater_rewards import claim_level_reward

router = APIRouter()


@router.post("/chessmater/level-rewards/claim", response_model=APIResponse)
async def claim_chessmater_level_reward(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="reward_token_required")
    return APIResponse(success=True, message="ok", data=claim_level_reward(db, authorization[7:]))
