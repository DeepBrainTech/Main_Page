from __future__ import annotations

import re

MAKING_WHOLE_MEDIA_BASE_PATH = "mental-math/"
_SECRET_KEY_PATTERN = re.compile(r"^secret\d+$")


def get_making_whole_question_video_key(secret_key: str, question_number: int) -> str | None:
    if not _SECRET_KEY_PATTERN.match(secret_key):
        return None
    if question_number < 1:
        return None
    return f"{MAKING_WHOLE_MEDIA_BASE_PATH}/{secret_key}/{question_number:02d}.mp4"

