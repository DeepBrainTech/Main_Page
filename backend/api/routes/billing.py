"""
Stripe Checkout, Customer Billing Portal, and webhooks.

Plan changes, cancellations, and billing-interval switches are handled in the
Stripe Customer Portal (configure products/prices and portal rules in Dashboard).
"""
import logging
from datetime import datetime

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from auth import get_current_active_user
from config.stripe_billing import (
    DIAMOND_BUNDLES,
    get_price_id,
    get_public_app_url,
    get_diamond_bundle_price_id,
    get_stripe_secret_key,
    get_stripe_webhook_secret,
    is_stripe_billing_configured,
    is_stripe_shop_configured,
    price_id_index,
)
from database import get_db
from models import StripeCheckoutFulfillment, User, UserRewards
from schemas import (
    APIResponse,
    BillingChangeSubscriptionBody,
    BillingCheckoutBody,
    BillingDiamondCheckoutBody,
    BillingPortalBody,
    BillingUpdatePaymentMethodBody,
)
from utils.notifications import create_user_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["billing"])


def _stripe_configure() -> None:
    key = get_stripe_secret_key()
    if not key:
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    stripe.api_key = key


def _allowed_locale(locale: str) -> str:
    lo = (locale or "en").split("-")[0].lower()
    if lo in ("en", "zh"):
        return lo
    return "en"


def _stripe_ui_locale(site_locale: str) -> str:
    if site_locale == "zh":
        return "zh"
    return "en"


def _membership_path(locale: str) -> str:
    return f"/{locale}/membership"


def _shop_path(locale: str) -> str:
    return f"/{locale}/shop"


def _clear_paid_membership(user: User) -> None:
    user.membership_plan = "free"
    user.membership_expires_at = None
    user.membership_billing_interval = None
    user.membership_pending_plan = None
    user.membership_pending_billing_interval = None
    user.membership_pending_effective_at = None
    user.stripe_subscription_id = None
    user.stripe_subscription_schedule_id = None


def _first_subscription_price_id(sub: stripe.Subscription) -> str | None:
    try:
        items = sub["items"].data
        if not items:
            return None
        return items[0].price.id
    except (KeyError, IndexError, AttributeError) as e:
        logger.warning("subscription price parse failed: %s", e)
        return None


def _resolve_plan_from_subscription(sub: stripe.Subscription) -> tuple[str, str] | None:
    pid = _first_subscription_price_id(sub)
    if not pid:
        return None
    return price_id_index().get(pid)


def sync_user_from_stripe_subscription(db: Session, user: User, sub: stripe.Subscription) -> None:
    st = sub.status
    if st in ("canceled", "unpaid", "incomplete_expired"):
        _clear_paid_membership(user)
        db.add(user)
        db.commit()
        return

    if st not in ("active", "trialing", "past_due"):
        return

    resolved = _resolve_plan_from_subscription(sub)
    if not resolved:
        return
    plan, billing_interval = resolved
    user.membership_plan = plan
    user.membership_billing_interval = billing_interval
    user.stripe_subscription_id = sub.id
    schedule_id = getattr(sub, "schedule", None)
    user.stripe_subscription_schedule_id = schedule_id if isinstance(schedule_id, str) else None

    cust = sub.customer
    if isinstance(cust, str):
        user.stripe_customer_id = cust
    elif cust is not None and getattr(cust, "id", None):
        user.stripe_customer_id = cust.id

    if sub.current_period_end:
        user.membership_expires_at = datetime.utcfromtimestamp(int(sub.current_period_end))
    else:
        user.membership_expires_at = None

    if (
        user.membership_pending_plan == plan
        and user.membership_pending_billing_interval == billing_interval
    ):
        user.membership_pending_plan = None
        user.membership_pending_billing_interval = None
        user.membership_pending_effective_at = None
        user.stripe_subscription_schedule_id = None

    db.add(user)
    db.commit()


def _subscription_item(sub: stripe.Subscription):
    try:
        items = sub["items"].data
        if not items:
            return None
        return items[0]
    except (KeyError, IndexError, AttributeError) as e:
        logger.warning("subscription item parse failed: %s", e)
        return None


def _change_timing(
    current_plan: str,
    current_interval: str,
    target_plan: str,
    target_interval: str,
) -> str:
    if (current_plan, current_interval) == (target_plan, target_interval):
        return "no_change"

    plan_rank = {"plus": 1, "premium": 2}
    is_plan_downgrade = plan_rank.get(target_plan, 0) < plan_rank.get(current_plan, 0)
    is_interval_downgrade = current_interval == "annual" and target_interval == "monthly"
    if is_plan_downgrade or is_interval_downgrade:
        return "scheduled"

    is_plan_upgrade = plan_rank.get(target_plan, 0) > plan_rank.get(current_plan, 0)
    is_interval_upgrade = current_interval == "monthly" and target_interval == "annual"
    if is_plan_upgrade or is_interval_upgrade:
        return "immediate"

    return "scheduled"


def _release_existing_schedule(user: User) -> None:
    schedule_id = getattr(user, "stripe_subscription_schedule_id", None)
    if not schedule_id:
        return
    try:
        stripe.SubscriptionSchedule.release(schedule_id)
    except stripe.error.InvalidRequestError as e:
        logger.warning("release existing subscription schedule failed: %s", e)
    user.stripe_subscription_schedule_id = None
    user.membership_pending_plan = None
    user.membership_pending_billing_interval = None
    user.membership_pending_effective_at = None


def _clear_pending_membership(user: User) -> None:
    user.membership_pending_plan = None
    user.membership_pending_billing_interval = None
    user.membership_pending_effective_at = None
    user.stripe_subscription_schedule_id = None


def _stripe_obj_get(obj, key: str, default=None):
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _format_amount(amount: int, currency: str | None) -> str:
    code = (currency or "usd").upper()
    zero_decimal = {
        "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF",
        "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
    }
    value = amount if code in zero_decimal else amount / 100
    return f"{code} {value:,.0f}" if code in zero_decimal else f"{code} {value:,.2f}"


def _plan_label(plan: str | None) -> str:
    if plan == "premium":
        return "Premium"
    if plan == "plus":
        return "Plus"
    return "Membership"


def _source_event(event_id: str | None, suffix: str) -> str | None:
    return f"{event_id}:{suffix}" if event_id else None


def _invoice_preview_lines(invoice) -> list[dict]:
    raw_lines = _stripe_obj_get(_stripe_obj_get(invoice, "lines"), "data") or []
    lines = []
    for line in raw_lines:
        amount = int(_stripe_obj_get(line, "amount", 0) or 0)
        currency = _stripe_obj_get(line, "currency", "usd")
        lines.append(
            {
                "description": _stripe_obj_get(line, "description", "") or "",
                "amount": amount,
                "currency": currency,
                "amount_display": _format_amount(amount, currency),
            }
        )
    return lines


def _payment_method_summary(payment_method) -> str | None:
    if not payment_method:
        return None

    pm_type = _stripe_obj_get(payment_method, "type")
    if pm_type == "card":
        card = _stripe_obj_get(payment_method, "card") or {}
        brand = str(_stripe_obj_get(card, "brand", "card") or "card").title()
        last4 = _stripe_obj_get(card, "last4")
        exp_month = _stripe_obj_get(card, "exp_month")
        exp_year = _stripe_obj_get(card, "exp_year")
        label = f"{brand} ending in {last4}" if last4 else brand
        if exp_month and exp_year:
            return f"{label}, expires {int(exp_month):02d}/{exp_year}"
        return label

    if pm_type:
        return str(pm_type).replace("_", " ").title()
    return None


def _subscription_payment_method_display(sub: stripe.Subscription) -> str | None:
    pm = _stripe_obj_get(sub, "default_payment_method")
    if not pm:
        customer = _stripe_obj_get(sub, "customer")
        invoice_settings = _stripe_obj_get(customer, "invoice_settings")
        pm = _stripe_obj_get(invoice_settings, "default_payment_method")
    if isinstance(pm, str):
        try:
            pm = stripe.PaymentMethod.retrieve(pm)
        except stripe.error.StripeError as e:
            logger.warning("payment method retrieve failed: %s", e)
            return None
    return _payment_method_summary(pm)


def _create_subscription_change_preview(
    sub: stripe.Subscription,
    item,
    target_price_id: str,
    proration_date: int,
):
    params = {
        "customer": sub.customer if isinstance(sub.customer, str) else getattr(sub.customer, "id", None),
        "subscription": sub.id,
        "subscription_details": {
            "items": [{"id": item.id, "price": target_price_id}],
            "proration_behavior": "always_invoice",
            "proration_date": proration_date,
        },
    }
    try:
        create_preview = getattr(stripe.Invoice, "create_preview", None)
        if create_preview:
            return create_preview(**params)
        return stripe.Invoice.upcoming(
            customer=params["customer"],
            subscription=sub.id,
            subscription_items=[{"id": item.id, "price": target_price_id}],
            subscription_proration_behavior="always_invoice",
            subscription_proration_date=proration_date,
        )
    except stripe.error.StripeError as e:
        logger.warning("subscription change preview failed: %s", e)
        raise HTTPException(status_code=400, detail="stripe_change_failed")


def _phase_price_id(phase) -> str | None:
    raw_items = _stripe_obj_get(phase, "items") or []
    items = getattr(raw_items, "data", raw_items)
    try:
        first = items[0]
    except (IndexError, TypeError):
        return None
    price = _stripe_obj_get(first, "price")
    if isinstance(price, str):
        return price
    return _stripe_obj_get(price, "id")


def _sync_pending_from_subscription_schedule(db: Session, user: User, sub: stripe.Subscription) -> None:
    schedule_ref = getattr(sub, "schedule", None)
    schedule_id = schedule_ref if isinstance(schedule_ref, str) else getattr(schedule_ref, "id", None)
    if not schedule_id:
        if getattr(user, "membership_pending_plan", None) or getattr(user, "stripe_subscription_schedule_id", None):
            _clear_pending_membership(user)
            db.add(user)
            db.commit()
        return

    try:
        schedule = stripe.SubscriptionSchedule.retrieve(schedule_id)
    except stripe.error.InvalidRequestError as e:
        logger.warning("subscription schedule retrieve failed: %s", e)
        _clear_pending_membership(user)
        db.add(user)
        db.commit()
        return

    status = _stripe_obj_get(schedule, "status")
    if status in ("released", "canceled", "completed"):
        _clear_pending_membership(user)
        db.add(user)
        db.commit()
        return

    current_end = int(getattr(sub, "current_period_end", 0) or 0)
    raw_phases = _stripe_obj_get(schedule, "phases") or []
    phases = list(getattr(raw_phases, "data", raw_phases))
    target_phase = None
    for phase in phases:
        phase_start = int(_stripe_obj_get(phase, "start_date", 0) or 0)
        if current_end and phase_start >= current_end:
            target_phase = phase
            break
    if not target_phase and len(phases) > 1:
        target_phase = phases[-1]

    target_price_id = _phase_price_id(target_phase)
    resolved = price_id_index().get(target_price_id or "")
    if not target_phase or not resolved:
        _clear_pending_membership(user)
        db.add(user)
        db.commit()
        return

    plan, interval = resolved
    effective_at = datetime.utcfromtimestamp(int(_stripe_obj_get(target_phase, "start_date")))
    user.membership_pending_plan = plan
    user.membership_pending_billing_interval = interval
    user.membership_pending_effective_at = effective_at
    user.stripe_subscription_schedule_id = schedule_id
    db.add(user)
    db.commit()


def _schedule_change_at_period_end(
    db: Session,
    user: User,
    sub: stripe.Subscription,
    target_price_id: str,
    target_plan: str,
    target_interval: str,
) -> datetime:
    item = _subscription_item(sub)
    if not item:
        raise HTTPException(status_code=400, detail="subscription_item_missing")
    if not sub.current_period_end:
        raise HTTPException(status_code=400, detail="subscription_period_missing")

    try:
        _release_existing_schedule(user)
        db.add(user)
        db.commit()

        sub = stripe.Subscription.retrieve(sub.id)
        item = _subscription_item(sub)
        if not item:
            raise HTTPException(status_code=400, detail="subscription_item_missing")
        schedule = stripe.SubscriptionSchedule.create(from_subscription=sub.id)
        current_phase = None
        phases = getattr(schedule, "phases", None)
        if phases:
            try:
                current_phase = phases[0]
            except (IndexError, TypeError):
                current_phase = None

        current_start = int(
            getattr(current_phase, "start_date", None)
            or getattr(sub, "current_period_start", 0)
            or datetime.utcnow().timestamp()
        )
        current_end = int(getattr(current_phase, "end_date", None) or sub.current_period_end)
        current_price_id = item.price.id
        quantity = getattr(item, "quantity", None) or 1

        updated_schedule = stripe.SubscriptionSchedule.modify(
            schedule.id,
            end_behavior="release",
            phases=[
                {
                    "start_date": current_start,
                    "end_date": current_end,
                    "items": [{"price": current_price_id, "quantity": quantity}],
                },
                {
                    "start_date": current_end,
                    "items": [{"price": target_price_id, "quantity": quantity}],
                },
            ],
        )
    except stripe.error.StripeError as e:
        logger.warning("schedule subscription change failed for user %s: %s", user.id, e)
        raise HTTPException(status_code=400, detail="stripe_change_failed")

    effective_at = datetime.utcfromtimestamp(current_end)
    user.membership_pending_plan = target_plan
    user.membership_pending_billing_interval = target_interval
    user.membership_pending_effective_at = effective_at
    user.stripe_subscription_schedule_id = updated_schedule.id
    db.add(user)
    db.commit()
    return effective_at


def _user_by_stripe_customer(db: Session, customer_id: str) -> User | None:
    return db.query(User).filter(User.stripe_customer_id == customer_id).first()


def _user_by_subscription_id(db: Session, sub_id: str) -> User | None:
    return db.query(User).filter(User.stripe_subscription_id == sub_id).first()


def _resolve_user_for_subscription(db: Session, sub: stripe.Subscription) -> User | None:
    user = _user_by_subscription_id(db, sub.id)
    if user:
        return user
    meta = dict(sub.metadata or {})
    uid = meta.get("user_id")
    if uid:
        return db.query(User).filter(User.id == int(uid)).first()
    cust = sub.customer
    cid = cust if isinstance(cust, str) else getattr(cust, "id", None)
    if cid:
        return _user_by_stripe_customer(db, str(cid))
    return None


def _resolve_user_for_invoice(db: Session, invoice) -> User | None:
    sub_id = _stripe_obj_get(invoice, "subscription")
    if sub_id:
        user = _user_by_subscription_id(db, str(sub_id))
        if user:
            return user
        try:
            sub = stripe.Subscription.retrieve(str(sub_id))
            user = _resolve_user_for_subscription(db, sub)
            if user:
                return user
        except stripe.error.StripeError as e:
            logger.warning("invoice subscription retrieve failed: %s", e)

    cust_id = _stripe_obj_get(invoice, "customer")
    if cust_id:
        return _user_by_stripe_customer(db, str(cust_id))
    return None


def _get_or_create_rewards(db: Session, user_id: int) -> UserRewards:
    rewards = db.query(UserRewards).filter(UserRewards.user_id == user_id).first()
    if rewards:
        return rewards
    rewards = UserRewards(user_id=user_id)
    db.add(rewards)
    db.flush()
    return rewards


def _fulfill_diamond_checkout_session(db: Session, sess, event_id: str | None = None) -> None:
    session_id = sess.get("id")
    if not session_id:
        logger.warning("diamond checkout session missing id")
        return
    existing = (
        db.query(StripeCheckoutFulfillment)
        .filter(StripeCheckoutFulfillment.stripe_session_id == session_id)
        .first()
    )
    if existing:
        return

    meta = sess.get("metadata") or {}
    if meta.get("kind") != "diamond_bundle":
        return
    uid = meta.get("user_id") or sess.get("client_reference_id")
    bundle_id = meta.get("bundle_id")
    diamonds = DIAMOND_BUNDLES.get(bundle_id)
    if not uid or not diamonds:
        logger.warning("diamond checkout session %s missing user or bundle metadata", session_id)
        return

    user = db.query(User).filter(User.id == int(uid)).first()
    if not user:
        logger.warning("diamond checkout session user %s not found", uid)
        return

    customer_id = sess.get("customer")
    if customer_id and not user.stripe_customer_id:
        user.stripe_customer_id = str(customer_id)

    rewards = _get_or_create_rewards(db, user.id)
    rewards.diamonds += diamonds
    db.add(rewards)
    db.add(user)
    db.add(
        StripeCheckoutFulfillment(
            stripe_session_id=session_id,
            user_id=user.id,
            kind="diamond_bundle",
            amount=diamonds,
        )
    )
    db.commit()
    create_user_notification(
        db,
        user_id=user.id,
        notification_type="purchase",
        title="Purchase Successful",
        message=f"{diamonds} Diamonds have been added to your bag.",
        icon="purchase",
        source="stripe",
        source_event_id=_source_event(event_id or session_id, "purchase"),
        metadata={"bundle_id": bundle_id, "diamonds": diamonds, "stripe_session_id": session_id},
    )


@router.get("/status", response_model=APIResponse)
async def billing_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    checkout = is_stripe_billing_configured()
    portal = bool(checkout and getattr(current_user, "stripe_customer_id", None))
    has_sub = bool(getattr(current_user, "stripe_subscription_id", None))
    cancel_at_period_end: bool | None = None
    if checkout and has_sub:
        _stripe_configure()
        try:
            sub = stripe.Subscription.retrieve(current_user.stripe_subscription_id)
            if sub.status in ("active", "trialing", "past_due"):
                cancel_at_period_end = bool(getattr(sub, "cancel_at_period_end", False))
                sync_user_from_stripe_subscription(db, current_user, sub)
                _sync_pending_from_subscription_schedule(db, current_user, sub)
        except stripe.error.StripeError as e:
            logger.warning("billing status subscription retrieve failed: %s", e)
            cancel_at_period_end = None

    return APIResponse(
        success=True,
        message="ok",
        data={
            "checkout_enabled": checkout,
            "portal_enabled": portal,
            "has_stripe_subscription": has_sub,
            "subscription_cancel_at_period_end": cancel_at_period_end,
            "pending_plan": getattr(current_user, "membership_pending_plan", None),
            "pending_billing_interval": getattr(current_user, "membership_pending_billing_interval", None),
            "pending_effective_at": (
                current_user.membership_pending_effective_at.isoformat()
                if getattr(current_user, "membership_pending_effective_at", None)
                else None
            ),
        },
    )


@router.post("/cancel-scheduled-change", response_model=APIResponse)
async def cancel_scheduled_change(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not is_stripe_billing_configured():
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    if not getattr(current_user, "stripe_subscription_id", None):
        raise HTTPException(status_code=400, detail="subscription_missing")
    _stripe_configure()

    try:
        sub = stripe.Subscription.retrieve(current_user.stripe_subscription_id)
        if sub.status in ("active", "trialing", "past_due"):
            _sync_pending_from_subscription_schedule(db, current_user, sub)
    except stripe.error.InvalidRequestError:
        current_user.stripe_subscription_id = None
        db.add(current_user)
        db.commit()
        raise HTTPException(status_code=400, detail="subscription_missing")
    except stripe.error.StripeError as e:
        logger.warning("subscription retrieve before schedule cancel failed: %s", e)
        raise HTTPException(status_code=400, detail="stripe_change_failed")

    _release_existing_schedule(current_user)
    _clear_pending_membership(current_user)
    db.add(current_user)
    db.commit()

    return APIResponse(success=True, message="scheduled_change_canceled", data={})


@router.post("/checkout-session", response_model=APIResponse)
async def create_checkout_session(
    body: BillingCheckoutBody,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """New subscription via Stripe Checkout (users without an active paid subscription)."""
    if not is_stripe_billing_configured():
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    _stripe_configure()

    price_id = get_price_id(body.plan, body.billing_interval)
    if not price_id:
        raise HTTPException(status_code=503, detail="stripe_price_not_configured")

    if getattr(current_user, "stripe_subscription_id", None):
        try:
            existing = stripe.Subscription.retrieve(current_user.stripe_subscription_id)
            if existing.status in ("active", "trialing", "past_due"):
                raise HTTPException(status_code=400, detail="already_has_active_subscription")
        except stripe.error.InvalidRequestError:
            current_user.stripe_subscription_id = None
            db.add(current_user)
            db.commit()

    lo = _allowed_locale(body.locale)
    base = get_public_app_url()
    success_url = f"{base}{_membership_path(lo)}?checkout=success"
    cancel_url = f"{base}{_membership_path(lo)}?checkout=canceled"

    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            metadata={"user_id": str(current_user.id)},
        )
        current_user.stripe_customer_id = customer.id
        db.add(current_user)
        db.commit()

    meta = {
        "user_id": str(current_user.id),
        "plan": body.plan,
        "billing_interval": body.billing_interval,
    }
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=current_user.stripe_customer_id,
        client_reference_id=str(current_user.id),
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=meta,
        subscription_data={"metadata": meta},
        locale=_stripe_ui_locale(lo),
    )

    return APIResponse(success=True, message="ok", data={"url": session.url})


@router.post("/diamond-checkout-session", response_model=APIResponse)
async def create_diamond_checkout_session(
    body: BillingDiamondCheckoutBody,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a one-time Stripe Checkout session for diamond bundles."""
    if not is_stripe_shop_configured():
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    _stripe_configure()

    price_id = get_diamond_bundle_price_id(body.bundle_id)
    if not price_id:
        raise HTTPException(status_code=503, detail="stripe_price_not_configured")

    lo = _allowed_locale(body.locale)
    base = get_public_app_url()
    success_url = f"{base}{_shop_path(lo)}?checkout=success"
    cancel_url = f"{base}{_shop_path(lo)}?checkout=canceled"

    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            metadata={"user_id": str(current_user.id)},
        )
        current_user.stripe_customer_id = customer.id
        db.add(current_user)
        db.commit()

    diamonds = DIAMOND_BUNDLES[body.bundle_id]
    meta = {
        "kind": "diamond_bundle",
        "user_id": str(current_user.id),
        "bundle_id": body.bundle_id,
        "diamonds": str(diamonds),
    }
    session = stripe.checkout.Session.create(
        mode="payment",
        customer=current_user.stripe_customer_id,
        client_reference_id=str(current_user.id),
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=meta,
        payment_intent_data={"metadata": meta},
        locale=_stripe_ui_locale(lo),
    )

    return APIResponse(success=True, message="ok", data={"url": session.url})


@router.post("/change-preview", response_model=APIResponse)
async def preview_subscription_change(
    body: BillingChangeSubscriptionBody,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not is_stripe_billing_configured():
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    if not getattr(current_user, "stripe_subscription_id", None):
        raise HTTPException(status_code=400, detail="subscription_missing")
    _stripe_configure()

    target_price_id = get_price_id(body.plan, body.billing_interval)
    if not target_price_id:
        raise HTTPException(status_code=503, detail="stripe_price_not_configured")

    try:
        sub = stripe.Subscription.retrieve(
            current_user.stripe_subscription_id,
            expand=["default_payment_method", "customer.invoice_settings.default_payment_method"],
        )
    except stripe.error.InvalidRequestError:
        current_user.stripe_subscription_id = None
        db.add(current_user)
        db.commit()
        raise HTTPException(status_code=400, detail="subscription_missing")

    if sub.status not in ("active", "trialing", "past_due"):
        raise HTTPException(status_code=400, detail="subscription_not_active")
    _sync_pending_from_subscription_schedule(db, current_user, sub)

    resolved = _resolve_plan_from_subscription(sub)
    if not resolved:
        raise HTTPException(status_code=400, detail="subscription_price_unknown")
    current_plan, current_interval = resolved
    timing = _change_timing(current_plan, current_interval, body.plan, body.billing_interval)
    if timing == "no_change":
        raise HTTPException(status_code=400, detail="subscription_no_change")

    if timing == "scheduled":
        effective_at = datetime.utcfromtimestamp(int(sub.current_period_end)) if sub.current_period_end else None
        return APIResponse(
            success=True,
            message="scheduled_preview",
            data={
                "action": "scheduled",
                "plan": body.plan,
                "billing_interval": body.billing_interval,
                "effective_at": effective_at.isoformat() if effective_at else None,
                "amount_due": 0,
                "currency": "usd",
                "amount_due_display": _format_amount(0, "usd"),
                "payment_method_display": _subscription_payment_method_display(sub),
                "proration_date": int(datetime.utcnow().timestamp()),
                "lines": [],
            },
        )

    item = _subscription_item(sub)
    if not item:
        raise HTTPException(status_code=400, detail="subscription_item_missing")

    proration_date = int(body.proration_date or datetime.utcnow().timestamp())
    invoice = _create_subscription_change_preview(sub, item, target_price_id, proration_date)
    amount_due = int(_stripe_obj_get(invoice, "amount_due", 0) or 0)
    currency = _stripe_obj_get(invoice, "currency", "usd")
    return APIResponse(
        success=True,
        message="immediate_preview",
        data={
            "action": "immediate",
            "plan": body.plan,
            "billing_interval": body.billing_interval,
            "amount_due": amount_due,
            "currency": currency,
            "amount_due_display": _format_amount(amount_due, currency),
            "payment_method_display": _subscription_payment_method_display(sub),
            "proration_date": proration_date,
            "lines": _invoice_preview_lines(invoice),
        },
    )


@router.post("/change-subscription", response_model=APIResponse)
async def change_subscription(
    body: BillingChangeSubscriptionBody,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Change an existing paid subscription using app rules.

    Immediate upgrades are applied now and invoiced by Stripe. Downgrades and
    shorter-cycle changes are scheduled for the current period end.
    """
    if not is_stripe_billing_configured():
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    if not getattr(current_user, "stripe_subscription_id", None):
        raise HTTPException(status_code=400, detail="subscription_missing")
    _stripe_configure()

    target_price_id = get_price_id(body.plan, body.billing_interval)
    if not target_price_id:
        raise HTTPException(status_code=503, detail="stripe_price_not_configured")

    try:
        sub = stripe.Subscription.retrieve(current_user.stripe_subscription_id)
    except stripe.error.InvalidRequestError:
        current_user.stripe_subscription_id = None
        db.add(current_user)
        db.commit()
        raise HTTPException(status_code=400, detail="subscription_missing")

    if sub.status not in ("active", "trialing", "past_due"):
        raise HTTPException(status_code=400, detail="subscription_not_active")
    if bool(getattr(sub, "cancel_at_period_end", False)):
        try:
            sub = stripe.Subscription.modify(sub.id, cancel_at_period_end=False)
        except stripe.error.StripeError as e:
            logger.warning("subscription resume before change failed: %s", e)
            raise HTTPException(status_code=400, detail="stripe_change_failed")
        sync_user_from_stripe_subscription(db, current_user, sub)
    _sync_pending_from_subscription_schedule(db, current_user, sub)

    resolved = _resolve_plan_from_subscription(sub)
    if not resolved:
        raise HTTPException(status_code=400, detail="subscription_price_unknown")
    current_plan, current_interval = resolved
    timing = _change_timing(current_plan, current_interval, body.plan, body.billing_interval)
    if timing == "no_change":
        raise HTTPException(status_code=400, detail="subscription_no_change")

    if timing == "scheduled":
        effective_at = _schedule_change_at_period_end(
            db,
            current_user,
            sub,
            target_price_id,
            body.plan,
            body.billing_interval,
        )
        return APIResponse(
            success=True,
            message="scheduled",
            data={
                "action": "scheduled",
                "plan": body.plan,
                "billing_interval": body.billing_interval,
                "effective_at": effective_at.isoformat(),
            },
        )

    item = _subscription_item(sub)
    if not item:
        raise HTTPException(status_code=400, detail="subscription_item_missing")

    _release_existing_schedule(current_user)
    db.add(current_user)
    db.commit()
    try:
        sub = stripe.Subscription.retrieve(sub.id)
    except stripe.error.StripeError as e:
        logger.warning("subscription retrieve before immediate change failed: %s", e)
        raise HTTPException(status_code=400, detail="stripe_change_failed")
    item = _subscription_item(sub)
    if not item:
        raise HTTPException(status_code=400, detail="subscription_item_missing")

    try:
        update_params = {
            "items": [{"id": item.id, "price": target_price_id}],
            "proration_behavior": "always_invoice",
            "payment_behavior": "pending_if_incomplete",
            "expand": ["latest_invoice.payment_intent"],
        }
        if body.proration_date:
            update_params["proration_date"] = body.proration_date
        updated = stripe.Subscription.modify(sub.id, **update_params)
    except stripe.error.StripeError as e:
        logger.warning("subscription change failed: %s", e)
        raise HTTPException(status_code=400, detail="stripe_change_failed")

    if getattr(updated, "pending_update", None):
        invoice = getattr(updated, "latest_invoice", None)
        hosted_invoice_url = getattr(invoice, "hosted_invoice_url", None) if invoice else None
        return APIResponse(
            success=True,
            message="payment_pending",
            data={
                "action": "payment_pending",
                "hosted_invoice_url": hosted_invoice_url,
            },
        )

    sync_user_from_stripe_subscription(db, current_user, updated)
    return APIResponse(
        success=True,
        message="updated",
        data={
            "action": "updated",
            "plan": body.plan,
            "billing_interval": body.billing_interval,
        },
    )


@router.post("/payment-method-setup", response_model=APIResponse)
async def create_payment_method_setup(
    current_user: User = Depends(get_current_active_user),
):
    """Create a SetupIntent so Stripe.js can collect a new card without card data touching our server."""
    if not is_stripe_billing_configured():
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    if not getattr(current_user, "stripe_customer_id", None):
        raise HTTPException(status_code=400, detail="stripe_customer_missing")
    if not getattr(current_user, "stripe_subscription_id", None):
        raise HTTPException(status_code=400, detail="subscription_missing")
    _stripe_configure()

    try:
        sub = stripe.Subscription.retrieve(current_user.stripe_subscription_id)
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=400, detail="subscription_missing")
    if sub.status not in ("active", "trialing", "past_due"):
        raise HTTPException(status_code=400, detail="subscription_not_active")

    try:
        intent = stripe.SetupIntent.create(
            customer=current_user.stripe_customer_id,
            usage="off_session",
            payment_method_types=["card"],
            metadata={
                "user_id": str(current_user.id),
                "subscription_id": current_user.stripe_subscription_id,
            },
        )
    except stripe.error.StripeError as e:
        logger.warning("payment method setup intent failed: %s", e)
        raise HTTPException(status_code=400, detail="payment_method_setup_failed")

    return APIResponse(
        success=True,
        message="ok",
        data={"client_secret": intent.client_secret},
    )


@router.post("/payment-method", response_model=APIResponse)
async def update_subscription_payment_method(
    body: BillingUpdatePaymentMethodBody,
    current_user: User = Depends(get_current_active_user),
):
    """Use a Stripe-created PaymentMethod as the default for future invoices on this subscription."""
    if not is_stripe_billing_configured():
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    if not getattr(current_user, "stripe_customer_id", None):
        raise HTTPException(status_code=400, detail="stripe_customer_missing")
    if not getattr(current_user, "stripe_subscription_id", None):
        raise HTTPException(status_code=400, detail="subscription_missing")
    _stripe_configure()

    try:
        payment_method = stripe.PaymentMethod.retrieve(body.payment_method_id)
        pm_customer = _stripe_obj_get(payment_method, "customer")
        pm_customer_id = pm_customer if isinstance(pm_customer, str) else _stripe_obj_get(pm_customer, "id")
        if pm_customer_id != current_user.stripe_customer_id:
            raise HTTPException(status_code=400, detail="payment_method_customer_mismatch")

        stripe.Customer.modify(
            current_user.stripe_customer_id,
            invoice_settings={"default_payment_method": body.payment_method_id},
        )
        sub = stripe.Subscription.modify(
            current_user.stripe_subscription_id,
            default_payment_method=body.payment_method_id,
            expand=["default_payment_method", "customer.invoice_settings.default_payment_method"],
        )
    except HTTPException:
        raise
    except stripe.error.StripeError as e:
        logger.warning("subscription payment method update failed: %s", e)
        raise HTTPException(status_code=400, detail="payment_method_update_failed")

    return APIResponse(
        success=True,
        message="ok",
        data={"payment_method_display": _subscription_payment_method_display(sub)},
    )


@router.post("/portal-session", response_model=APIResponse)
async def create_portal_session(
    body: BillingPortalBody,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Stripe Customer Portal: change plan, switch monthly/annual, cancel, update payment method.

    Configure allowed prices and proration/downgrade behavior in Stripe Dashboard.
    """
    if not is_stripe_billing_configured():
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    if not getattr(current_user, "stripe_customer_id", None):
        raise HTTPException(status_code=400, detail="stripe_customer_missing")
    _stripe_configure()

    lo = _allowed_locale(body.locale)
    base = get_public_app_url()
    return_url = f"{base}{_membership_path(lo)}?portal=return"

    session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=return_url,
        locale=_stripe_ui_locale(lo),
    )
    return APIResponse(success=True, message="ok", data={"url": session.url})


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    wh_secret = get_stripe_webhook_secret()
    if not wh_secret:
        raise HTTPException(status_code=503, detail="stripe_webhook_not_configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature") or ""
    try:
        event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=wh_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="invalid_signature")

    _stripe_configure()
    event_id = event.get("id")
    etype = event["type"]
    obj = event["data"]["object"]
    previous_attributes = event["data"].get("previous_attributes") or {}

    try:
        if etype == "checkout.session.completed":
            sess = obj
            if sess.get("mode") == "payment":
                _fulfill_diamond_checkout_session(db, sess, event_id)
                return APIResponse(success=True, message="ok", data={"received": True})
            if sess.get("mode") != "subscription":
                return APIResponse(success=True, message="ok", data={"received": True})
            uid = (sess.get("metadata") or {}).get("user_id") or sess.get("client_reference_id")
            if not uid:
                logger.warning("checkout.session.completed missing user reference")
                return APIResponse(success=True, message="ok", data={"received": True})
            user = db.query(User).filter(User.id == int(uid)).first()
            if not user:
                logger.warning("checkout session user %s not found", uid)
                return APIResponse(success=True, message="ok", data={"received": True})
            cust = sess.get("customer")
            if cust:
                user.stripe_customer_id = cust
            sub_id = sess.get("subscription")
            if sub_id:
                user.stripe_subscription_id = sub_id
                db.add(user)
                db.commit()
                full_sub = stripe.Subscription.retrieve(sub_id)
                sync_user_from_stripe_subscription(db, user, full_sub)
                plan = (sess.get("metadata") or {}).get("plan") or getattr(user, "membership_plan", None)
                interval = (sess.get("metadata") or {}).get("billing_interval")
                create_user_notification(
                    db,
                    user_id=user.id,
                    notification_type="subscription",
                    title="Subscription Activated",
                    message=f"Your {_plan_label(plan)} membership is now active.",
                    icon="subscription",
                    source="stripe",
                    source_event_id=_source_event(event_id, "subscription-activated"),
                    metadata={"plan": plan, "billing_interval": interval, "stripe_subscription_id": sub_id},
                )

        elif etype == "customer.subscription.deleted":
            sub_id = obj.get("id")
            cust_id = obj.get("customer")
            user = _user_by_subscription_id(db, sub_id) if sub_id else None
            if not user and cust_id:
                user = _user_by_stripe_customer(db, str(cust_id))
            if not user:
                meta = obj.get("metadata") or {}
                uid = meta.get("user_id")
                if uid:
                    user = db.query(User).filter(User.id == int(uid)).first()
            if user:
                _clear_paid_membership(user)
                db.add(user)
                db.commit()
                create_user_notification(
                    db,
                    user_id=user.id,
                    notification_type="subscription",
                    title="Subscription Canceled",
                    message="Your subscription has been canceled.",
                    icon="subscription",
                    source="stripe",
                    source_event_id=_source_event(event_id, "subscription-canceled"),
                    metadata={"stripe_subscription_id": sub_id},
                )

        elif etype in ("customer.subscription.created", "customer.subscription.updated"):
            sub_id = obj.get("id")
            if not sub_id:
                return APIResponse(success=True, message="ok", data={"received": True})
            full_sub = stripe.Subscription.retrieve(sub_id)
            user = _resolve_user_for_subscription(db, full_sub)
            if not user:
                logger.warning("subscription %s: user not resolved", sub_id)
                return APIResponse(success=True, message="ok", data={"received": True})
            if full_sub.status == "canceled":
                _clear_paid_membership(user)
                db.add(user)
                db.commit()
            else:
                sync_user_from_stripe_subscription(db, user, full_sub)
                _sync_pending_from_subscription_schedule(db, user, full_sub)
                if etype == "customer.subscription.updated" and (
                    "items" in previous_attributes
                    or "plan" in previous_attributes
                    or "cancel_at_period_end" in previous_attributes
                ):
                    resolved = _resolve_plan_from_subscription(full_sub)
                    plan = resolved[0] if resolved else getattr(user, "membership_plan", None)
                    create_user_notification(
                        db,
                        user_id=user.id,
                        notification_type="subscription",
                        title="Subscription Updated",
                        message=f"Your {_plan_label(plan)} membership has been updated.",
                        icon="subscription",
                        source="stripe",
                        source_event_id=_source_event(event_id, "subscription-updated"),
                        metadata={
                            "plan": plan,
                            "stripe_subscription_id": sub_id,
                            "previous_attributes": list(previous_attributes.keys()),
                        },
                    )

        elif etype == "invoice.paid":
            user = _resolve_user_for_invoice(db, obj)
            if not user:
                logger.warning("invoice.paid: user not resolved")
                return APIResponse(success=True, message="ok", data={"received": True})
            billing_reason = _stripe_obj_get(obj, "billing_reason")
            if billing_reason == "subscription_create":
                return APIResponse(success=True, message="ok", data={"received": True})
            plan = getattr(user, "membership_plan", None)
            create_user_notification(
                db,
                user_id=user.id,
                notification_type="subscription",
                title="Subscription Renewed",
                message=f"Your {_plan_label(plan)} membership is renewed.",
                icon="subscription",
                source="stripe",
                source_event_id=_source_event(event_id, "subscription-renewed"),
                metadata={
                    "plan": plan,
                    "stripe_invoice_id": _stripe_obj_get(obj, "id"),
                    "billing_reason": billing_reason,
                },
            )

        elif etype.startswith("subscription_schedule."):
            schedule_id = obj.get("id")
            sub_id = obj.get("subscription")
            full_sub = stripe.Subscription.retrieve(sub_id) if sub_id else None
            user = _resolve_user_for_subscription(db, full_sub) if full_sub else None
            if not user and schedule_id:
                user = db.query(User).filter(User.stripe_subscription_schedule_id == schedule_id).first()
            if not user:
                logger.warning("subscription schedule %s: user not resolved", schedule_id)
                return APIResponse(success=True, message="ok", data={"received": True})

            status = obj.get("status")
            if full_sub:
                sync_user_from_stripe_subscription(db, user, full_sub)
            if status in ("released", "canceled", "completed"):
                _clear_pending_membership(user)
                db.add(user)
                db.commit()
            elif full_sub:
                _sync_pending_from_subscription_schedule(db, user, full_sub)

    except Exception as e:
        logger.exception("stripe webhook error: %s", e)
        raise HTTPException(status_code=500, detail="webhook_handler_failed")

    return APIResponse(success=True, message="ok", data={"received": True})
