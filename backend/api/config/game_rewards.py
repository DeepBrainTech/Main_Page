"""Portal-owned first-clear reward rules for registered games."""

from dataclasses import dataclass


@dataclass(frozen=True)
class LevelRewardRule:
    first_level: int
    last_level: int
    rewards: dict[str, int]
    ledger_operation: str = "first-clear"


GAME_LEVEL_REWARDS: dict[str, LevelRewardRule] = {
    "chessmater": LevelRewardRule(
        first_level=1,
        last_level=105,
        rewards={"coins": 200},
        # Preserve the persisted operation identity so existing claims cannot pay twice.
        ledger_operation="first-clear-coins",
    ),
}
