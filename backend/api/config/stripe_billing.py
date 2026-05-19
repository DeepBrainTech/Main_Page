"""
Stripe price IDs and public site URL for Checkout / Billing Portal.
Set env vars in production; unset = billing endpoints return stripe_not_configured.
"""
import os
from typing import Literal, Optional

MembershipPaidPlan = Literal["plus", "premium"]
BillingInterval = Literal["monthly", "annual"]
DiamondBundleId = Literal["diamonds10", "diamonds25", "diamonds70", "diamonds200", "diamonds300"]

DIAMOND_BUNDLES: dict[DiamondBundleId, int] = {
    "diamonds10": 10,
    "diamonds25": 25,
    "diamonds70": 70,
    "diamonds200": 200,
    "diamonds300": 300,
}


def get_stripe_secret_key() -> Optional[str]:
    return (os.getenv("STRIPE_SECRET_KEY") or "").strip() or None


def get_stripe_webhook_secret() -> Optional[str]:
    return (os.getenv("STRIPE_WEBHOOK_SECRET") or "").strip() or None


def get_public_app_url() -> str:
    base = (os.getenv("PUBLIC_APP_URL") or "http://localhost:3000").strip().rstrip("/")
    return base


def get_price_id(plan: MembershipPaidPlan, interval: BillingInterval) -> Optional[str]:
    env_map = {
        ("plus", "monthly"): "STRIPE_PRICE_PLUS_MONTHLY",
        ("plus", "annual"): "STRIPE_PRICE_PLUS_ANNUAL",
        ("premium", "monthly"): "STRIPE_PRICE_PREMIUM_MONTHLY",
        ("premium", "annual"): "STRIPE_PRICE_PREMIUM_ANNUAL",
    }
    key = env_map.get((plan, interval))
    if not key:
        return None
    val = (os.getenv(key) or "").strip()
    return val or None


def get_diamond_bundle_price_id(bundle_id: DiamondBundleId) -> Optional[str]:
    env_map = {
        "diamonds10": "STRIPE_PRICE_DIAMONDS_10",
        "diamonds25": "STRIPE_PRICE_DIAMONDS_25",
        "diamonds70": "STRIPE_PRICE_DIAMONDS_70",
        "diamonds200": "STRIPE_PRICE_DIAMONDS_200",
        "diamonds300": "STRIPE_PRICE_DIAMONDS_300",
    }
    val = (os.getenv(env_map[bundle_id]) or "").strip()
    return val or None


def price_id_index() -> dict[str, tuple[MembershipPaidPlan, BillingInterval]]:
    """Reverse lookup for webhook: price_id -> (plan, interval)."""
    out: dict[str, tuple[MembershipPaidPlan, BillingInterval]] = {}
    for plan in ("plus", "premium"):
        for interval in ("monthly", "annual"):
            pid = get_price_id(plan, interval)
            if pid:
                out[pid] = (plan, interval)
    return out


def is_stripe_billing_configured() -> bool:
    if not get_stripe_secret_key():
        return False
    for plan in ("plus", "premium"):
        for interval in ("monthly", "annual"):
            if get_price_id(plan, interval):
                return True
    return False


def is_stripe_shop_configured() -> bool:
    if not get_stripe_secret_key():
        return False
    return any(get_diamond_bundle_price_id(bundle_id) for bundle_id in DIAMOND_BUNDLES)
