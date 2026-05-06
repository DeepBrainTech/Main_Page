from __future__ import annotations


MAKING_WHOLE_MEDIA_BASE_PATH = "mental-math/making-whole"


MAKING_WHOLE_SECRET_MEDIA_KEYS: dict[str, list[str]] = {
    f"secret{i}": [
        f"{MAKING_WHOLE_MEDIA_BASE_PATH}/secret{i}/secret_{i}.{'jpg' if i == 1 else 'png'}"
    ]
    for i in range(1, 11)
}


def get_making_whole_question_video_key(secret_key: str, question_number: int) -> str | None:
    if secret_key not in MAKING_WHOLE_SECRET_MEDIA_KEYS:
        return None
    if question_number < 1:
        return None
    return f"{MAKING_WHOLE_MEDIA_BASE_PATH}/{secret_key}/{question_number:02d}.mp4"

