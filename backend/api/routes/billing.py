"""
Stripe Checkout, Customer Billing Portal, subscription change preview, and webhooks.
"""
import logging
import time
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
    """Map site locale to Stripe Checkout / Customer Portal `locale` codes."""
    if site_locale == "zh":
        return "zh"
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


def _load_subscription_change_context(
    current_user: User,
    db: Session,
    body: BillingChangeSubscriptionBody,
) -> tuple[stripe.Subscription, str, str]:
    """Active subscription, first line item id, and target Stripe price id. Raises HTTPException."""
    sub_id = getattr(current_user, "stripe_subscription_id", None)
    if not sub_id:
        raise HTTPException(status_code=400, detail="stripe_subscription_missing")

    new_price_id = get_price_id(body.plan, body.billing_interval)
    if not new_price_id:
        raise HTTPException(status_code=503, detail="stripe_price_not_configured")

    try:
        sub = stripe.Subscription.retrieve(sub_id)
    except stripe.error.InvalidRequestError:
        current_user.stripe_subscription_id = None
        db.add(current_user)
        db.commit()
        raise HTTPException(status_code=400, detail="stripe_subscription_missing")

    if sub.status not in ("active", "trialing", "past_due"):
        raise HTTPException(status_code=400, detail="stripe_subscription_inactive")

    current_pid = _first_subscription_price_id(sub)
    if current_pid == new_price_id:
        raise HTTPException(status_code=400, detail="subscription_no_change")

    try:
        items_data = sub["items"].data
    except (AttributeError, KeyError, IndexError):
        raise HTTPException(status_code=400, detail="stripe_subscription_invalid")
    if not items_data:
        raise HTTPException(status_code=400, detail="stripe_subscription_invalid")
    item_id = items_data[0].id
    return sub, item_id, new_price_id


def _is_premium_to_plus_deferred_downgrade(
    current: tuple[str, str] | None,
    new_plan: str,
) -> bool:
    """Premium → Plus switches at current period end (no mid-cycle downgrade invoice)."""
    if not current:
        return False
    cur_plan, _ = current
    return cur_plan == "premium" and new_plan == "plus"


def _schedule_id_on_subscription(sub: stripe.Subscription) -> str | None:
    sch = getattr(sub, "schedule", None)
    if isinstance(sch, str) and sch:
        return sch
    if sch is not None and getattr(sch, "id", None):
        return str(sch.id)
    return None


def _stripe_expandable_id(val: object) -> str | None:
    if val is None:
        return None
    if isinstance(val, str) and val:
        return val
    oid = getattr(val, "id", None)
    return str(oid) if oid else None


def _subscription_primary_item_id(sub: stripe.Subscription) -> str:
    try:
        return str(sub["items"].data[0].id)
    except (AttributeError, KeyError, IndexError) as e:
        raise ValueError("subscription has no items") from e


def _schedule_modify_phases_from_retrieved(
    sched: stripe.SubscriptionSchedule,
    sub: stripe.Subscription,
) -> list[dict]:
    """
    Build `phases` for SubscriptionSchedule.modify from a retrieved schedule.
    Omits fully past phases (Stripe allows omitting past phases on update).
    """
    now_ts = int(time.time())
    fallback_si = _subscription_primary_item_id(sub)
    raw_phases = getattr(sched, "phases", None) or []
    if not raw_phases:
        raise ValueError("schedule has no phases")

    out: list[dict] = []
    for ph in raw_phases:
        start_raw = getattr(ph, "start_date", None)
        if start_raw is None:
            continue
        sd = int(start_raw)
        end_raw = getattr(ph, "end_date", None)
        ed_int = int(end_raw) if end_raw is not None else None
        if ed_int is not None and ed_int <= now_ts:
            continue

        phase: dict = {"start_date": sd, "items": []}
        if ed_int is not None:
            phase["end_date"] = ed_int

        ph_items = getattr(ph, "items", None) or []
        for it in ph_items:
            price_id = _stripe_expandable_id(getattr(it, "price", None)) or _stripe_expandable_id(
                getattr(it, "plan", None)
            )
            if not price_id:
                continue
            qty = int(getattr(it, "quantity", None) or 1)
            si_id = _stripe_expandable_id(getattr(it, "subscription_item", None)) or fallback_si
            phase["items"].append({"subscription_item": si_id, "price": price_id, "quantity": qty})

        if not phase["items"]:
            raise ValueError("schedule phase has no usable items")
        out.append(phase)

    if not out:
        pid = _first_subscription_price_id(sub)
        if not pid:
            raise ValueError("cannot derive price from subscription for schedule phases")
        out = [
            {
                "start_date": int(sub.current_period_start),
                "end_date": int(sub.current_period_end),
                "items": [{"subscription_item": fallback_si, "price": pid, "quantity": 1}],
            }
        ]
    return out


def _resume_cancel_at_period_end_via_subscription_schedule(
    schedule_id: str,
    sub: stripe.Subscription,
) -> None:
    """Clear cancel-at-period-end when Stripe requires updating the subscription schedule."""
    sched = stripe.SubscriptionSchedule.retrieve(schedule_id)
    phases = _schedule_modify_phases_from_retrieved(sched, sub)
    meta = getattr(sched, "metadata", None) if isinstance(getattr(sched, "metadata", None), dict) else {}
    end_behavior = getattr(sched, "end_behavior", None) or "release"
    stripe.SubscriptionSchedule.modify(
        schedule_id,
        phases=phases,
        proration_behavior="none",
        end_behavior=end_behavior,
        metadata=meta,
    )


def _subscription_schedule_pending_multi_phase(sub: stripe.Subscription) -> bool:
    """
    True when the subscription's expanded schedule still has 2+ non-past phases
    (e.g. Premium until period end, then Plus).
    """
    sch = getattr(sub, "schedule", None)
    if sch is None or isinstance(sch, str):
        return False
    phases = getattr(sch, "phases", None) or []
    now_ts = int(time.time())
    active_like = 0
    for ph in phases:
        end_raw = getattr(ph, "end_date", None)
        ed_int = int(end_raw) if end_raw is not None else None
        if ed_int is not None and ed_int <= now_ts:
            continue
        active_like += 1
    return active_like >= 2


def _release_subscription_schedule_by_id(schedule_id: str) -> None:
    """Release an active / not_started schedule (removes future phases; subscription keeps current items)."""
    sched = stripe.SubscriptionSchedule.retrieve(schedule_id)
    st = getattr(sched, "status", None)
    if st not in ("not_started", "active"):
        raise ValueError(f"subscription schedule not releasable: status={st!r}")
    stripe.SubscriptionSchedule.release(schedule_id)


def _stripe_invalid_request_suggests_schedule_conflict(err: stripe.error.InvalidRequestError) -> bool:
    body = getattr(err, "json_body", None) or {}
    err_obj = body.get("error", {}) if isinstance(body, dict) else {}
    code = (err_obj.get("code") or "") if isinstance(err_obj, dict) else ""
    msg = (err_obj.get("message") or str(err) or "").lower()
    if "subscription_schedule" in msg or "subscription schedule" in msg:
        return True
    if "schedule" in msg and "managed" in msg:
        return True
    if isinstance(code, str) and "schedule" in code.lower():
        return True
    return False


def _release_active_subscription_schedule(sub_id: str) -> None:
    """Drop an active schedule so Subscription.modify can apply an immediate upgrade."""
    try:
        sub = stripe.Subscription.retrieve(sub_id, expand=["schedule"])
    except stripe.error.StripeError as e:
        logger.warning("subscription retrieve for schedule release: %s", e)
        return
    sid = _schedule_id_on_subscription(sub)
    if not sid:
        return
    try:
        sched = stripe.SubscriptionSchedule.retrieve(sid)
        st = getattr(sched, "status", None)
        if st in ("not_started", "active"):
            stripe.SubscriptionSchedule.release(sid)
    except stripe.error.StripeError as e:
        logger.warning("subscription schedule release failed: %s", e)


def _apply_premium_to_plus_at_period_end(
    sub: stripe.Subscription,
    current_price_id: str,
    new_price_id: str,
    meta: dict,
) -> stripe.Subscription:
    """Use a two-phase Subscription Schedule: keep Premium until period end, then Plus."""
    period_start = int(sub.current_period_start)
    period_end = int(sub.current_period_end)
    try:
        si = sub["items"].data[0].id
    except (AttributeError, KeyError, IndexError) as e:
        raise HTTPException(status_code=400, detail="stripe_subscription_invalid") from e
    phases: list[dict] = [
        {
            "start_date": period_start,
            "end_date": period_end,
            "items": [{"subscription_item": si, "price": current_price_id, "quantity": 1}],
        },
        {
            "start_date": period_end,
            "items": [{"subscription_item": si, "price": new_price_id, "quantity": 1}],
        },
    ]
    sch_id = _schedule_id_on_subscription(sub)
    try:
        if sch_id:
            stripe.SubscriptionSchedule.modify(
                sch_id,
                phases=phases,
                proration_behavior="none",
                end_behavior="release",
                metadata=meta,
            )
        else:
            sched = stripe.SubscriptionSchedule.create(from_subscription=sub.id)
            stripe.SubscriptionSchedule.modify(
                sched.id,
                phases=phases,
                proration_behavior="none",
                end_behavior="release",
                metadata=meta,
            )
    except stripe.error.StripeError as e:
        logger.warning("subscription schedule create/modify failed: %s", e)
        raise HTTPException(status_code=400, detail="stripe_subscription_change_failed") from e
    return stripe.Subscription.retrieve(sub.id)


def _serialize_invoice_lines(inv: stripe.Invoice, limit: int = 25) -> list[dict]:
    out: list[dict] = []
    try:
        data = inv.lines.data if inv.lines else []
    except (AttributeError, KeyError):
        return out
    for li in data[:limit]:
        desc = getattr(li, "description", None) or ""
        amt = int(getattr(li, "amount", 0) or 0)
        proration = bool(getattr(li, "proration", False))
        typ = getattr(li, "type", None) or ""
        out.append({"description": desc, "amount": amt, "proration": proration, "type": typ})
    return out


def _format_payment_method(pm: stripe.PaymentMethod | None) -> str | None:
    if pm is None:
        return None
    ptype = getattr(pm, "type", None) or ""
    if ptype == "card":
        card = getattr(pm, "card", None)
        if not card:
            return None
        brand = (getattr(card, "display_brand", None) or getattr(card, "brand", None) or "card").upper()
        last4 = getattr(card, "last4", None) or "????"
        return f"{brand} *{last4}"
    if ptype == "link":
        return "Link"
    if ptype == "amazon_pay":
        return "Amazon Pay"
    return ptype.replace("_", " ").title() if ptype else None


def _default_payment_method_label(customer_id: str, subscription_id: str) -> str | None:
    """Human-readable default card/wallet for subscription change preview."""
    try:
        sub = stripe.Subscription.retrieve(subscription_id, expand=["default_payment_method"])
    except stripe.error.StripeError as e:
        logger.warning("subscription retrieve for pm failed: %s", e)
        return None

    pm = getattr(sub, "default_payment_method", None)
    if isinstance(pm, str) and pm:
        try:
            pm = stripe.PaymentMethod.retrieve(pm)
        except stripe.error.StripeError:
            pm = None
    label = _format_payment_method(pm) if isinstance(pm, stripe.PaymentMethod) else None
    if label:
        return label

    try:
        cust = stripe.Customer.retrieve(customer_id, expand=["invoice_settings.default_payment_method"])
    except stripe.error.StripeError as e:
        logger.warning("customer retrieve for pm failed: %s", e)
        return None

    inv_set = getattr(cust, "invoice_settings", None)
    pm2 = getattr(inv_set, "default_payment_method", None) if inv_set else None
    if isinstance(pm2, str) and pm2:
        try:
            pm2 = stripe.PaymentMethod.retrieve(pm2)
        except stripe.error.StripeError:
            pm2 = None
    return _format_payment_method(pm2) if isinstance(pm2, stripe.PaymentMethod) else None


def _invoice_summary(inv: stripe.Invoice | None) -> dict | None:
    if inv is None:
        return None
    return {
        "id": inv.id,
        "currency": inv.currency or "usd",
        "amount_due": int(inv.amount_due or 0),
        "amount_paid": int(inv.amount_paid or 0),
        "total": int(inv.total or 0),
        "status": inv.status,
        "hosted_invoice_url": inv.hosted_invoice_url,
    }


@router.get("/status", response_model=APIResponse)
async def billing_status(current_user: User = Depends(get_current_active_user)):
    checkout = is_stripe_billing_configured()
    portal = bool(checkout and getattr(current_user, "stripe_customer_id", None))
    has_sub = bool(getattr(current_user, "stripe_subscription_id", None))
    cancel_at_period_end: bool | None = None
    has_schedule: bool | None = None
    schedule_pending_change: bool | None = None
    if checkout and has_sub:
        _stripe_configure()
        try:
            sub = stripe.Subscription.retrieve(current_user.stripe_subscription_id, expand=["schedule"])
            if sub.status in ("active", "trialing", "past_due"):
                cancel_at_period_end = bool(getattr(sub, "cancel_at_period_end", False))
                has_schedule = _schedule_id_on_subscription(sub) is not None
                schedule_pending_change = _subscription_schedule_pending_multi_phase(sub)
        except stripe.error.StripeError as e:
            logger.warning("billing status subscription retrieve failed: %s", e)
            cancel_at_period_end = None
            has_schedule = None
            schedule_pending_change = None

    return APIResponse(
        success=True,
        message="ok",
        data={
            "checkout_enabled": checkout,
            "portal_enabled": portal,
            "has_stripe_subscription": has_sub,
            "subscription_cancel_at_period_end": cancel_at_period_end,
            "subscription_has_schedule": has_schedule,
            "subscription_schedule_pending_change": schedule_pending_change,
        },
    )


@router.post("/resume-subscription", response_model=APIResponse)
async def resume_subscription(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Resume renewal (clear cancel-at-period-end) and/or undo a multi-phase SubscriptionSchedule.

    When both cancellation-at-period-end and a deferred multi-phase change exist (e.g. Premium→Plus),
    the schedule is released first so cancel can be cleared on the subscription in one action.
    """
    if not is_stripe_billing_configured():
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    sub_id = getattr(current_user, "stripe_subscription_id", None)
    if not sub_id:
        raise HTTPException(status_code=400, detail="stripe_subscription_missing")
    _stripe_configure()
    try:
        sub = stripe.Subscription.retrieve(sub_id, expand=["schedule"])
    except stripe.error.StripeError as e:
        logger.warning("resume subscription retrieve failed: %s", e)
        raise HTTPException(status_code=400, detail="stripe_subscription_invalid") from e
    if sub.status not in ("active", "trialing", "past_due"):
        raise HTTPException(status_code=400, detail="stripe_subscription_inactive")

    cancel_cape = bool(getattr(sub, "cancel_at_period_end", False))
    sch_id = _schedule_id_on_subscription(sub)
    pending_multi = _subscription_schedule_pending_multi_phase(sub)

    if not cancel_cape and not (sch_id and pending_multi):
        raise HTTPException(status_code=400, detail="subscription_nothing_to_resume")

    try:
        if cancel_cape and sch_id and pending_multi:
            _release_subscription_schedule_by_id(sch_id)
            try:
                stripe.Subscription.modify(sub_id, cancel_at_period_end=False)
            except stripe.error.StripeError as e:
                try:
                    check = stripe.Subscription.retrieve(sub_id)
                except stripe.error.StripeError as re:
                    logger.warning("resume subscription verify retrieve failed: %s", re)
                    raise HTTPException(status_code=400, detail="stripe_resume_subscription_failed") from e
                if bool(getattr(check, "cancel_at_period_end", False)):
                    logger.warning("resume subscription modify failed: %s", e)
                    raise HTTPException(status_code=400, detail="stripe_resume_subscription_failed") from e
        elif cancel_cape:
            if sch_id:
                try:
                    _resume_cancel_at_period_end_via_subscription_schedule(sch_id, sub)
                except ValueError as e:
                    logger.warning("resume subscription schedule phase build failed: %s", e)
                    raise HTTPException(status_code=400, detail="stripe_subscription_invalid") from e
            try:
                stripe.Subscription.modify(sub_id, cancel_at_period_end=False)
            except stripe.error.StripeError as e:
                if sch_id:
                    try:
                        check = stripe.Subscription.retrieve(sub_id)
                    except stripe.error.StripeError as re:
                        logger.warning("resume subscription verify retrieve failed: %s", re)
                        raise HTTPException(status_code=400, detail="stripe_resume_subscription_failed") from e
                    if not bool(getattr(check, "cancel_at_period_end", False)):
                        pass
                    else:
                        logger.warning("resume subscription modify failed: %s", e)
                        raise HTTPException(status_code=400, detail="stripe_resume_subscription_failed") from e
                else:
                    logger.warning("resume subscription modify failed: %s", e)
                    raise HTTPException(status_code=400, detail="stripe_resume_subscription_failed") from e

        elif sch_id and pending_multi:
            try:
                _release_subscription_schedule_by_id(sch_id)
            except ValueError as e:
                logger.warning("resume subscription schedule release invalid: %s", e)
                raise HTTPException(status_code=400, detail="stripe_subscription_invalid") from e
            except stripe.error.StripeError as e:
                logger.warning("resume subscription schedule release failed: %s", e)
                raise HTTPException(status_code=400, detail="stripe_resume_subscription_failed") from e
    except stripe.error.StripeError as e:
        logger.warning("resume subscription failed: %s", e)
        raise HTTPException(status_code=400, detail="stripe_resume_subscription_failed") from e

    try:
        updated = stripe.Subscription.retrieve(sub_id, expand=["schedule"])
    except stripe.error.StripeError as e:
        logger.warning("resume subscription post-update retrieve failed: %s", e)
        raise HTTPException(status_code=400, detail="stripe_subscription_invalid") from e
    sync_user_from_stripe_subscription(db, current_user, updated)
    return APIResponse(success=True, message="ok", data={"resumed": True})


@router.post("/cancel-subscription-at-period-end", response_model=APIResponse)
async def cancel_subscription_at_period_end(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Schedule subscription cancellation at the end of the current billing period (no Customer Portal redirect)."""
    if not is_stripe_billing_configured():
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    sub_id = getattr(current_user, "stripe_subscription_id", None)
    if not sub_id:
        raise HTTPException(status_code=400, detail="stripe_subscription_missing")
    _stripe_configure()
    try:
        sub = stripe.Subscription.retrieve(sub_id, expand=["schedule"])
    except stripe.error.StripeError as e:
        logger.warning("cancel-at-period-end retrieve failed: %s", e)
        raise HTTPException(status_code=400, detail="stripe_subscription_invalid") from e
    if sub.status not in ("active", "trialing", "past_due"):
        raise HTTPException(status_code=400, detail="stripe_subscription_inactive")
    if bool(getattr(sub, "cancel_at_period_end", False)):
        raise HTTPException(status_code=400, detail="subscription_already_canceling_at_period_end")
    sch_id = _schedule_id_on_subscription(sub)
    try:
        updated = stripe.Subscription.modify(sub_id, cancel_at_period_end=True)
    except stripe.error.InvalidRequestError as e:
        if sch_id and _stripe_invalid_request_suggests_schedule_conflict(e):
            try:
                _release_subscription_schedule_by_id(sch_id)
            except (ValueError, stripe.error.StripeError) as re:
                logger.warning("cancel-at-period-end schedule release failed: %s", re)
                raise HTTPException(status_code=400, detail="stripe_cancel_subscription_failed") from e
            try:
                updated = stripe.Subscription.modify(sub_id, cancel_at_period_end=True)
            except stripe.error.StripeError as e2:
                logger.warning("cancel-at-period-end modify after release failed: %s", e2)
                raise HTTPException(status_code=400, detail="stripe_cancel_subscription_failed") from e2
        else:
            logger.warning("cancel-at-period-end modify failed: %s", e)
            raise HTTPException(status_code=400, detail="stripe_cancel_subscription_failed") from e
    except stripe.error.StripeError as e:
        logger.warning("cancel-at-period-end modify failed: %s", e)
        raise HTTPException(status_code=400, detail="stripe_cancel_subscription_failed") from e
    sync_user_from_stripe_subscription(db, current_user, updated)
    return APIResponse(success=True, message="ok", data={"cancel_at_period_end": True})


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
        locale=_stripe_ui_locale(lo),
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
        locale=_stripe_ui_locale(lo),
    )
    return APIResponse(success=True, message="ok", data={"url": session.url})


@router.post("/preview-subscription-change", response_model=APIResponse)
async def preview_subscription_change(
    body: BillingChangeSubscriptionBody,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Preview proration (upgrade) or deferred period-end switch (Premium → Plus)."""
    if not is_stripe_billing_configured():
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    _stripe_configure()

    sub, _item_id, new_price_id = _load_subscription_change_context(current_user, db, body)
    cust = sub.customer
    cust_id = cust if isinstance(cust, str) else getattr(cust, "id", None)
    if not cust_id:
        raise HTTPException(status_code=400, detail="stripe_subscription_invalid")

    period_end = int(sub.current_period_end) if sub.current_period_end else None
    pm_label = _default_payment_method_label(str(cust_id), sub.id)
    cur = _resolve_plan_from_subscription(sub)
    currency = (getattr(sub, "currency", None) or "usd").lower()

    if _is_premium_to_plus_deferred_downgrade(cur, body.plan):
        return APIResponse(
            success=True,
            message="ok",
            data={
                "change_mode": "deferred_downgrade",
                "currency": currency,
                "amount_due": 0,
                "total": 0,
                "subtotal": 0,
                "lines": [],
                "subscription_current_period_end": period_end,
                "payment_method_label": pm_label,
                "pending_plan": body.plan,
                "pending_billing_interval": body.billing_interval,
            },
        )

    try:
        inv = stripe.Invoice.upcoming(
            customer=str(cust_id),
            subscription=sub.id,
            subscription_items=[{"id": _item_id, "price": new_price_id}],
            subscription_proration_behavior="create_prorations",
        )
    except stripe.error.StripeError as e:
        logger.warning("subscription preview invoice failed: %s", e)
        raise HTTPException(status_code=400, detail="stripe_subscription_preview_failed")

    return APIResponse(
        success=True,
        message="ok",
        data={
            "change_mode": "immediate_upgrade",
            "currency": inv.currency or "usd",
            "amount_due": int(inv.amount_due or 0),
            "total": int(inv.total or 0),
            "subtotal": int(inv.subtotal or 0),
            "lines": _serialize_invoice_lines(inv),
            "subscription_current_period_end": period_end,
            "payment_method_label": pm_label,
        },
    )


@router.post("/change-subscription", response_model=APIResponse)
async def change_subscription(
    body: BillingChangeSubscriptionBody,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Plus ↔ Premium: Plus→Premium applies immediately with proration; Premium→Plus takes effect at period end."""
    if not is_stripe_billing_configured():
        raise HTTPException(status_code=503, detail="stripe_not_configured")
    _stripe_configure()

    sub, item_id, new_price_id = _load_subscription_change_context(current_user, db, body)

    meta = dict(sub.metadata or {})
    meta["user_id"] = str(current_user.id)
    meta["plan"] = body.plan
    meta["billing_interval"] = body.billing_interval

    cur = _resolve_plan_from_subscription(sub)
    deferred = _is_premium_to_plus_deferred_downgrade(cur, body.plan)

    if deferred:
        current_pid = _first_subscription_price_id(sub)
        if not current_pid:
            raise HTTPException(status_code=400, detail="stripe_subscription_invalid")
        updated = _apply_premium_to_plus_at_period_end(sub, current_pid, new_price_id, meta)
        sync_user_from_stripe_subscription(db, current_user, updated)
        eff = current_user.membership_expires_at.isoformat() if current_user.membership_expires_at else None
        return APIResponse(
            success=True,
            message="ok",
            data={
                "change_mode": "deferred_downgrade",
                "membership_plan": current_user.membership_plan,
                "membership_billing_interval": current_user.membership_billing_interval,
                "membership_expires_at": eff,
                "deferred_effective_at": eff,
                "invoice": None,
            },
        )

    _release_active_subscription_schedule(sub.id)
    sub = stripe.Subscription.retrieve(sub.id)
    try:
        items_data = sub["items"].data
        item_id = items_data[0].id
    except (AttributeError, KeyError, IndexError):
        raise HTTPException(status_code=400, detail="stripe_subscription_invalid")

    try:
        updated = stripe.Subscription.modify(
            sub.id,
            items=[{"id": item_id, "price": new_price_id}],
            proration_behavior="create_prorations",
            metadata=meta,
            expand=["latest_invoice"],
        )
    except stripe.error.StripeError as e:
        logger.warning("subscription modify failed: %s", e)
        raise HTTPException(status_code=400, detail="stripe_subscription_change_failed")

    sync_user_from_stripe_subscription(db, current_user, updated)

    invoice_payload: dict | None = None
    li = updated.get("latest_invoice")
    if li:
        if isinstance(li, str):
            try:
                inv_full = stripe.Invoice.retrieve(li, expand=["lines"])
                s = _invoice_summary(inv_full)
                if s:
                    s["lines"] = _serialize_invoice_lines(inv_full)
                invoice_payload = s
            except stripe.error.StripeError as e:
                logger.warning("retrieve latest invoice failed: %s", e)
                invoice_payload = None
        else:
            s = _invoice_summary(li)
            if s:
                s["lines"] = _serialize_invoice_lines(li)
            invoice_payload = s

    return APIResponse(
        success=True,
        message="ok",
        data={
            "change_mode": "immediate_upgrade",
            "membership_plan": current_user.membership_plan,
            "membership_billing_interval": current_user.membership_billing_interval,
            "membership_expires_at": current_user.membership_expires_at.isoformat()
            if current_user.membership_expires_at
            else None,
            "deferred_effective_at": None,
            "invoice": invoice_payload,
        },
    )


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
