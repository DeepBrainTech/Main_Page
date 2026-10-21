"""Server-authenticated avatar lookup shared by registered games."""

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from sqlalchemy.orm import Session

from database import get_db
from schemas import APIResponse
from services.game_avatars import get_leaderboard_avatars

router = APIRouter()


@router.post("/{api_slug}/leaderboard/avatars", response_model=APIResponse)
async def game_leaderboard_avatars(
    api_slug: str,
    response: Response,
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="avatar_token_required")
    response.headers["Cache-Control"] = "no-store"
    return APIResponse(
        success=True, message="ok",
        data=get_leaderboard_avatars(db, authorization[7:], api_slug),
    )
