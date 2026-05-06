"""
Learning courses: diamond bundle pricing and timed-tier duration.

Sits next to shop_items.py — register every paid course here; routes use
get_learning_bundle_commerce(course_key). Entitlements persist in
user_course_entitlements (user_id + course_key).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Final


@dataclass(frozen=True)
class LearningBundleCommerce:
    """Timed unlock vs lifetime unlock diamond prices; length of timed tier in days."""

    diamonds_three_month: int
    diamonds_lifetime: int
    timed_tier_days: int


def _mental_math_timed_days() -> int:
    # Legacy env name kept for existing deployments
    v = os.getenv("MENTAL_MATH_THREE_MONTH_DAYS")
    if v is not None:
        return int(v)
    return int(os.getenv("LEARNING_MENTAL_MATH_TIMED_BUNDLE_DAYS", "90"))


# Add new courses to this dict only.
LEARNING_BUNDLE_COMMERCE: dict[str, LearningBundleCommerce] = {
    "mental_math": LearningBundleCommerce(
        diamonds_three_month=100,
        diamonds_lifetime=200,
        timed_tier_days=_mental_math_timed_days(),
    ),
}

MENTAL_MATH_COURSE_KEY: Final[str] = "mental_math"


def get_learning_bundle_commerce(course_key: str) -> LearningBundleCommerce:
    """Return commerce for a course slug; raises KeyError if unregistered."""
    try:
        return LEARNING_BUNDLE_COMMERCE[course_key]
    except KeyError as err:
        raise KeyError(f"Unknown learning course commerce key: {course_key}") from err
