"""Authenticated, read-only game leaderboard endpoints."""

from fastapi import APIRouter, Depends, Response

from auth import get_current_active_user
from models import User
from schemas import APIResponse
from services.game_leaderboards import get_game_leaderboard

router = APIRouter()


@router.get("/{api_slug}/leaderboard", response_model=APIResponse)
def game_leaderboard(
    api_slug: str,
    response: Response,
    current_user: User = Depends(get_current_active_user),
):
    response.headers["Cache-Control"] = "no-store"
    return APIResponse(success=True, message="ok", data=get_game_leaderboard(api_slug, current_user))
