"""Invoice-scoped coin rewards for paid membership activation and renewal."""

import stripe
from sqlalchemy.orm import Session

from config.rewards import MEMBERSHIP_PAYMENT_COINS
from config.stripe_billing import price_id_index
from models import AssetTransaction, User
from services.assets import credit_assets, lock_account
from services.stripe_common import _stripe_obj_get

MEMBERSHIP_REWARD_SOURCE = "stripe:membership_payment_bonus"


def grant_membership_payment_coins(db: Session, user: User, invoice) -> None:
    """Grant once per paid invoice. The caller owns commit and rollback."""
    if (
        _stripe_obj_get(invoice, "billing_reason")
        not in {"subscription_create", "subscription_cycle"}
        or _stripe_obj_get(invoice, "status") != "paid"
        or (_stripe_obj_get(invoice, "amount_paid", 0) or 0) <= 0
    ):
        return
    invoice_id = _stripe_obj_get(invoice, "id")
    if not invoice_id:
        raise ValueError("membership_reward_missing_invoice_id")

    lock_account(db, user.id)
    existing = db.query(AssetTransaction.id).filter(
        AssetTransaction.user_id == user.id,
        AssetTransaction.source == MEMBERSHIP_REWARD_SOURCE,
        AssetTransaction.request_id == invoice_id,
    ).first()
    if existing:
        return

    lines = _stripe_obj_get(invoice, "lines")
    line_items = _stripe_obj_get(lines, "data", []) or []
    if _stripe_obj_get(lines, "has_more") or not line_items:
        line_items = stripe.Invoice.list_lines(invoice_id, limit=100).auto_paging_iter()
    prices = price_id_index()
    plans = set()
    for line in line_items:
        parent = _stripe_obj_get(line, "parent")
        details = _stripe_obj_get(parent, "subscription_item_details")
        if _stripe_obj_get(line, "proration") or _stripe_obj_get(details, "proration"):
            continue
        price = _stripe_obj_get(line, "price")
        pricing = _stripe_obj_get(line, "pricing")
        price_details = _stripe_obj_get(pricing, "price_details")
        price_id = (
            price if isinstance(price, str) else _stripe_obj_get(price, "id")
        ) or _stripe_obj_get(price_details, "price")
        resolved = prices.get(price_id)
        if resolved and resolved[0] in MEMBERSHIP_PAYMENT_COINS:
            plans.add(resolved[0])
    if not plans:
        return
    if len(plans) != 1:
        raise ValueError("membership_reward_ambiguous_invoice_plan")
    plan = plans.pop()
    credit_assets(
        db,
        user.id,
        {"coins": MEMBERSHIP_PAYMENT_COINS[plan]},
        source=MEMBERSHIP_REWARD_SOURCE,
        request_id=invoice_id,
    )
