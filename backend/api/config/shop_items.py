"""
商店道具配置。

Mental Math bundle diamond unlock is in learning_commerce.py (not this catalog).

约定：
- `games` 为可使用该道具的游戏模式列表；
- 包含 `"all"` 表示全游戏可用；
- 价格统一由后端配置并校验，游戏端只负责展示。
"""

from __future__ import annotations

from typing import Any


SHOP_ITEMS: dict[str, dict[str, Any]] = {
    "chess_tourmaster_hint": {
        "name": "Knightours Chess Hint",
        "games": ["chess-tourmaster"],
        "cost": {"coins": 5, "diamonds": 0, "flowers": 0},
    },
        "chess_tourmaster_undo": {
        "name": "Knightours Chess Undo",
        "games": ["chess-tourmaster"],
        "cost": {"coins": 5, "diamonds": 0, "flowers": 0},
    },

    # Freefall Chess is the display name; keep chess_mater_* SKUs and chessmater mode IDs
    # stable for existing purchases, inventory receipts and game clients.
    "chess_mater_reply": {
        "name": "Freefall Chess Hint Unlock Ticket",
        "games": ["chessmater"],
        "cost": {"coins": 300, "diamonds": 0, "flowers": 0},
    },
    "chess_mater_undo": {
        "name": "Freefall Chess Undo",
        "games": ["chessmater"],
        "cost": {"coins": 400, "diamonds": 0, "flowers": 0},
    },
    "chess_mater_antigravity": {
        "name": "Freefall Chess Antigravity",
        "games": ["chessmater"],
        "cost": {"coins": 600, "diamonds": 0, "flowers": 0},
    },
    "chess_mater_reply_pack5": {
        "name": "Freefall Chess Hint Pack of 5",
        "games": ["chessmater"],
        "cost": {"coins": 1300, "diamonds": 0, "flowers": 0},
        "grants": {"chess_mater_reply": 5},
    },
    "chess_mater_undo_pack5": {
        "name": "Freefall Chess Undo Pack of 5",
        "games": ["chessmater"],
        "cost": {"coins": 1700, "diamonds": 0, "flowers": 0},
        "grants": {"chess_mater_undo": 5},
    },
    "chess_mater_antigravity_pack5": {
        "name": "Freefall Chess AntiGravity Pack of 5",
        "games": ["chessmater"],
        "cost": {"coins": 2500, "diamonds": 0, "flowers": 0},
        "grants": {"chess_mater_antigravity": 5},
    },
    "chess_mater_utility_pack": {
        "name": "Freefall Chess Utility Pack",
        "games": ["chessmater"],
        "cost": {"coins": 1900, "diamonds": 0, "flowers": 0},
        "grants": {"chess_mater_reply": 3, "chess_mater_undo": 2, "chess_mater_antigravity": 1},
    },
    "learning_mental_math_making_whole": {
        "name": "learning_mental_math_making_whole",
        "games": ["learning-mental-math"],
        "cost": {"coins": 20, "diamonds": 0, "flowers": 0},
    },
    "learning_mental_math_break_into_parts": {
        "name": "learning_mental_math_break_into_parts",
        "games": ["learning-mental-math"],
        "cost": {"coins": 20, "diamonds": 0, "flowers": 0},
    },
    "learning_mental_math_rearrange": {
        "name": "learning_mental_math_rearrange",
        "games": ["learning-mental-math"],
        "cost": {"coins": 20, "diamonds": 0, "flowers": 0},
    },
    "learning_mental_math_round_and_adjust": {
        "name": "learning_mental_math_round_and_adjust",
        "games": ["learning-mental-math"],
        "cost": {"coins": 20, "diamonds": 0, "flowers": 0},
    },
    "learning_mental_math_left_to_right_flow": {
        "name": "learning_mental_math_left_to_right_flow",
        "games": ["learning-mental-math"],
        "cost": {"coins": 20, "diamonds": 0, "flowers": 0},
    },
}


def is_item_available_for_game(item: dict[str, Any], game_mode: str | None) -> bool:
    """判断道具是否可用于指定游戏。"""
    if not game_mode:
        return True
    games = item.get("games", [])
    return "all" in games or game_mode in games


def get_shop_items_by_game(game_mode: str | None) -> dict[str, dict[str, Any]]:
    """按游戏模式过滤可展示的道具列表。"""
    return {
        item_id: item
        for item_id, item in SHOP_ITEMS.items()
        if is_item_available_for_game(item, game_mode)
    }
