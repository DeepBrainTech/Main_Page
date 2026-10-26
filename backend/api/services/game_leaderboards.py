"""Read game-owned scores without recording a launch or granting rewards."""

import os
from urllib.parse import urlsplit

import requests
from fastapi import HTTPException

from config.game_auth import create_game_token
from models import User


def get_game_leaderboard(api_slug: str, user: User) -> dict:
    start_rank = 1
    if api_slug != "chessmater":
        raise HTTPException(status_code=404, detail="game_leaderboard_not_configured")
    base = os.getenv("CHESSMATER_API_URL", "https://chessmater-production.up.railway.app").strip().rstrip("/")
    parsed = urlsplit(base)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise HTTPException(status_code=503, detail="game_leaderboard_not_configured")
    try:
        token, _ = create_game_token("chessmater", {
            "sub": user.username, "username": user.username, "user_id": user.id,
        }, expires_seconds=60)
    except ValueError as error:
        raise HTTPException(status_code=503, detail="game_signing_not_configured") from error
    try:
        response = requests.get(
            f"{base}/leaderboard",
            params={"mode": "completed", "includeMe": "1", "paged": "1", "startRank": start_rank},
            headers={"Authorization": f"Bearer {token}"},
            timeout=(3.05, 8), allow_redirects=False,
        )
        if response.status_code != 200:
            raise ValueError("upstream_status")
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("invalid_leaderboard")
        rows, total, next_rank = payload.get("entries"), payload.get("total"), payload.get("next_rank")
        if (not isinstance(rows, list) or len(rows) > 100
                or type(total) is not int or total < 0
                or payload.get("start_rank") != start_rank
                or len(rows) != min(100, max(0, total - start_rank + 1))
                or next_rank != (start_rank + 100 if start_rank + 100 <= total else None)):
            raise ValueError("invalid_leaderboard")
        entries = []
        seen = set()
        for expected_rank, row in enumerate(rows, start=start_rank):
            if not isinstance(row, dict):
                raise ValueError("invalid_entry")
            rank, completed = row.get("rank"), row.get("completed_levels")
            user_id = str(row.get("user_id", ""))
            username = row.get("username")
            if (type(rank) is not int or rank != expected_rank
                    or type(completed) is not int or completed < 1
                    or not user_id.isascii() or not user_id.isdecimal() or int(user_id) < 1
                    or user_id in seen or (username is not None and not isinstance(username, str))
                    or (entries and completed > entries[-1]["completed_levels"])):
                raise ValueError("invalid_entry")
            seen.add(user_id)
            entries.append({
                "rank": rank, "user_id": user_id, "username": username,
                "completed_levels": completed, "is_current_user": user_id == str(user.id),
            })
        return {"metric": "completed_levels", "entries": entries}
    except (requests.RequestException, ValueError, TypeError) as error:
        raise HTTPException(status_code=502, detail="game_leaderboard_unavailable") from error
