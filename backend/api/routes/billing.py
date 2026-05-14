"""
Stripe Checkout, Customer Billing Portal, and subscription webhooks.
"""
import logging
from datetime import datetime

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
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
from schemas import APIResponse, BillingCheckoutBody, BillingPortalBody

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


def _membership_path(locale: str) -> str:
    return f"/{locale}/membership"


def _clear_paid_membership(user: User) -> None:
    user.membership_plan = "free"
    user.membership_expires_at = None
    user.membership_billing_interval = None
    user.stripe_subscription_id = None


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
    mapped = price_id_index().get(pid)
    return mapped


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

    cust = sub.customer
    if isinstance(cust, str):
        user.stripe_customer_id = cust
    elif cust is not None and getattr(cust, "id", None):
        user.stripe_customer_id = cust.id

    if sub.current_period_end:
        user.membership_expires_at = datetime.utcfromtimestamp(int(sub.current_period_end))
    else:
        user.membership_expires_at = None

    db.add(user)
    db.commit()


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
async def billing_status(current_user: User = Depends(get_current_active_user)):
    checkout = is_stripe_billing_configured()
    portal = bool(checkout and getattr(current_user, "stripe_customer_id", None))
    return APIResponse(
        success=True,
        message="ok",
        data={
            "checkout_enabled": checkout,
            "portal_enabled": portal,
            "has_stripe_subscription": bool(getattr(current_user, "stripe_subscription_id", None)),
        },
    )


@router.post("/checkout-session", response_model=APIResponse)
async def create_checkout_session(
    body: BillingCheckoutBody,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a Stripe Checkout Session (subscription). Open returned URL in the browser."""
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
    )

    return APIResponse(success=True, message="ok", data={"url": session.url})


@router.post("/portal-session", response_model=APIResponse)
async def create_portal_session(
    body: BillingPortalBody,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Stripe Customer Portal for canceling or updating payment method."""
    if not is_stripe_billing_configured():
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    if not getattr(current_user, "stripe_customer_id", None):
        raise HTTPException(status_code=400, detail="stripe_customer_missing")
    _stripe_configure()

    lo = _allowed_locale(body.locale)
    base = get_public_app_url()
    return_url = f"{base}{_membership_path(lo)}"

    session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=return_url,
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

    except Exception as e:
        logger.exception("stripe webhook error: %s", e)
        raise HTTPException(status_code=500, detail="webhook_handler_failed")

    return APIResponse(success=True, message="ok", data={"received": True})
