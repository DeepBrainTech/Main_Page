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
    get_price_id,
    get_public_app_url,
    get_stripe_secret_key,
    get_stripe_webhook_secret,
    is_stripe_billing_configured,
    price_id_index,
)
from database import get_db
from models import User
from schemas import APIResponse, BillingChangeSubscriptionBody, BillingCheckoutBody, BillingPortalBody

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

    if current_interval == "monthly" and current_plan == "plus":
        return "immediate"

    if current_interval == "monthly" and current_plan == "premium":
        if target_interval == "annual":
            return "immediate"
        return "scheduled"

    if current_interval == "annual" and current_plan == "plus":
        if target_interval == "annual" and target_plan == "premium":
            return "immediate"
        return "scheduled"

    if current_interval == "annual" and current_plan == "premium":
        return "scheduled"

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
        updated = stripe.Subscription.modify(
            sub.id,
            items=[{"id": item.id, "price": target_price_id}],
            proration_behavior="always_invoice",
            payment_behavior="pending_if_incomplete",
            metadata={
                **dict(getattr(sub, "metadata", None) or {}),
                "user_id": str(current_user.id),
                "plan": body.plan,
                "billing_interval": body.billing_interval,
            },
            expand=["latest_invoice.payment_intent"],
        )
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
    etype = event["type"]
    obj = event["data"]["object"]

    try:
        if etype == "checkout.session.completed":
            sess = obj
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
