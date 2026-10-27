"""Authenticated achievement reads and game-server unlock delivery."""

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from sqlalchemy.orm import Session

from auth import get_current_active_user
from database import get_db
from models import User
from schemas import APIResponse
from services.game_achievements import get_game_achievements, receive_achievement_events

router = APIRouter()


@router.get("/{api_slug}/achievements", response_model=APIResponse)
def game_achievements(api_slug: str, response: Response, current_user: User = Depends(get_current_active_user)):
    response.headers["Cache-Control"] = "no-store"
    return APIResponse(success=True, message="ok", data=get_game_achievements(api_slug, current_user))


@router.post("/{api_slug}/achievements/events", response_model=APIResponse)
def achievement_events(api_slug: str, response: Response, authorization: str | None = Header(None),
                       db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="achievement_token_required")
    response.headers["Cache-Control"] = "no-store"
    return APIResponse(success=True, message="ok", data=receive_achievement_events(db, authorization[7:], api_slug))
