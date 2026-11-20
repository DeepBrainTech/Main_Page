"""Profile limits and supported avatar image formats."""

USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 32

MAX_AVATAR_UPLOAD_BYTES = 2 * 1024 * 1024
ALLOWED_AVATAR_MIME_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}
