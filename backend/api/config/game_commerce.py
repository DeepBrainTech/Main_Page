"""Register paid game grants here; clients never choose the price or purpose."""

from dataclasses import dataclass
from typing import Callable

from lib.commerce_targets import quantum_review_target


@dataclass(frozen=True)
class GameProduct:
    game_key: str
    product_id: str
    cost: dict[str, int]
    duration_seconds: int
    purpose: str
    validate_target: Callable[[str], str]
    inventory_item_id: str | None = None
    inventory_only: bool = False
    permanent_target: bool = False


GAME_PRODUCTS: dict[tuple[str, str], GameProduct] = {
    ("quantumgo", "ai-review"): GameProduct(
        game_key="quantumgo",
        product_id="ai-review",
        cost={"diamonds": 5},
        duration_seconds=24 * 60 * 60,
        purpose="ai-review",
        validate_target=quantum_review_target,
    ),
}


def get_game_product(game_key: str, product_id: str) -> GameProduct | None:
    return GAME_PRODUCTS.get((game_key, product_id))


@dataclass(frozen=True)
class GameInventoryDelivery:
    """Configuration only: usable stock and consumption belong to the game."""
    game_key: str
    item_ids: tuple[str, ...]
    grant_items: tuple[str, ...]
    purpose: str
    ack_operation: str
    token_ttl_seconds: int = 600


GAME_INVENTORY_DELIVERIES: dict[str, GameInventoryDelivery] = {
    "online-chess": GameInventoryDelivery(
        game_key="online-chess",
        item_ids=("online_chess_analysis_access", "online_chess_analysis_access_pack25"),
        grant_items=("online_chess_analysis_access",),
        purpose="online-chess-inventory",
        ack_operation="online-chess.inventory.delivered",
    ),
}


def get_game_inventory_delivery(game_key: str) -> GameInventoryDelivery | None:
    return GAME_INVENTORY_DELIVERIES.get(game_key)


def get_game_inventory_delivery_for_item(item_id: str) -> GameInventoryDelivery | None:
    matches = [rule for rule in GAME_INVENTORY_DELIVERIES.values() if item_id in rule.item_ids]
    if len(matches) > 1:
        raise ValueError("duplicate_inventory_delivery_item")
    return matches[0] if matches else None
