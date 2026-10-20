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
