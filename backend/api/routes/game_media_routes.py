"""Game media reads run in the worker pool because boto3 is synchronous."""

from fastapi import APIRouter, Depends, Response

from auth import get_current_active_user
from schemas import APIResponse
from services.game_media import get_game_media

router = APIRouter()


@router.get("/{game_slug}/media", response_model=APIResponse, dependencies=[Depends(get_current_active_user)])
def read_game_media(game_slug: str, response: Response):
    response.headers["Cache-Control"] = "private, no-store"
    return APIResponse(success=True, message="ok", data=get_game_media(game_slug))

