"""Server-authenticated first-clear rewards for registered games."""

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from sqlalchemy.orm import Session

from database import get_db
from schemas import APIResponse
from services.game_rewards import claim_level_reward

router = APIRouter()


@router.post("/{api_slug}/level-rewards/claim", response_model=APIResponse)
async def claim_game_level_reward(
    api_slug: str,
    response: Response,
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="reward_token_required")
    response.headers["Cache-Control"] = "no-store"
    return APIResponse(
        success=True, message="ok",
        data=claim_level_reward(db, authorization[7:], api_slug),
    )
