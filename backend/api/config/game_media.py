"""Public detail slugs mapped to isolated R2 prefixes."""

from config.game_catalog import SUPPORTED_GAME_KEYS

GAME_MEDIA_PREFIXES = {key: key for key in SUPPORTED_GAME_KEYS if key != "chessmater"}
GAME_MEDIA_PREFIXES["freefall-chess"] = "freefall-chess"

