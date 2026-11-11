"""Atomic portal payment and game-bound grants."""

import json
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import exists

from fastapi import HTTPException
from sqlalchemy.orm import Session

from config.game_auth import (
    create_game_token,
    get_game_auth_entry_by_api_slug,
    validate_game_signing,
)
from config.game_commerce import GameProduct, get_game_product, GameInventoryDelivery, get_game_inventory_delivery, get_game_inventory_delivery_for_item
from config.shop_items import SHOP_ITEMS
from services.idempotency import replay_operation, save_operation
from models import CommerceOperation, GamePurchase, UserItemInventory
from services.assets import debit_assets, get_asset_balances, lock_account


def resolve_product(api_slug: str, product_id: str) -> GameProduct:
    entry = get_game_auth_entry_by_api_slug(api_slug)
    product = get_game_product(entry.game_key, product_id) if entry else None
    if product is None:
        raise HTTPException(status_code=404, detail="unknown_game_product")
    return product


def _owned_item(db: Session, user_id: int, product: GameProduct):
    if not product.inventory_item_id:
        return None
    return (
        db.query(UserItemInventory)
        .filter_by(user_id=user_id, item_id=product.inventory_item_id)
        .first()
    )


def quote_purchase(db: Session, user_id: int, product: GameProduct, target: str | None = None) -> dict:
    inventory = _owned_item(db, user_id, product)
    cost = {} if inventory is not None and inventory.quantity > 0 else product.cost
    entitlement_owned = False
    if target is not None:
        try:
            target = product.validate_target(target)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if product.permanent_target:
            entitlement_owned = db.query(GamePurchase).filter_by(
                user_id=user_id, game_key=product.game_key,
                product_id=product.product_id, target=target,
            ).first() is not None
    return {
        "game_key": product.game_key,
        "product_id": product.product_id,
        "cost": cost,
        "duration_seconds": product.duration_seconds,
        "user_id": user_id,
        "assets": get_asset_balances(db, user_id),
        "inventory_item_id": product.inventory_item_id,
        "inventory_quantity": inventory.quantity if inventory is not None else 0,
        "requires_inventory": product.inventory_only,
        "entitlement_owned": entitlement_owned,
    }


def redeem_purchase(
    db: Session, user_id: int, product: GameProduct, request_id, target: str
) -> dict:
    def conflict(suffix: str):
        return HTTPException(status_code=409, detail="purchase_" + suffix)

    try:
        validate_game_signing(product.game_key)
    except ValueError as exc:
        raise HTTPException(
            status_code=503,
            detail="game_signing_not_configured",
        ) from exc
    try:
        target = product.validate_target(target)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not 0 < len(target) <= 256:
        raise HTTPException(status_code=422, detail="invalid_purchase_target")
    if product.duration_seconds <= 0:
        raise HTTPException(status_code=503, detail="invalid_product_duration")
    lock_account(db, user_id)
    purchase = (
        db.query(GamePurchase)
        .filter_by(user_id=user_id, request_id=str(request_id))
        .first()
    )
    now = datetime.utcnow()
    if purchase is None and product.permanent_target:
        # The account lock serializes concurrent requests across tabs/devices.
        # Reuse the original entitlement even when a retry has a new UUID.
        purchase = (
            db.query(GamePurchase)
            .filter_by(user_id=user_id, game_key=product.game_key,
                       product_id=product.product_id, target=target)
            .order_by(GamePurchase.id.asc())
            .first()
        )
    if purchase is not None:
        if (
            purchase.target != target
            or purchase.game_key != product.game_key
            or purchase.product_id != product.product_id
        ):
            raise conflict("request_mismatch")
        if purchase.expires_at <= now:
            if not product.permanent_target:
                raise conflict("session_expired")
            # Renew delivery authorization, not the permanent entitlement.
            purchase.expires_at = now + timedelta(seconds=product.duration_seconds)
    else:
        inventory = _owned_item(db, user_id, product)
        if inventory is not None and inventory.quantity > 0:
            inventory.quantity -= 1
            if inventory.quantity == 0:
                db.delete(inventory)
            cost = {}
        else:
            if product.inventory_only:
                raise HTTPException(status_code=400, detail="insufficient_inventory")
            debit_assets(
                db,
                user_id,
                product.cost,
                source=product.game_key + ":" + product.product_id,
                request_id=str(request_id),
                insufficient_detail="insufficient_assets",
            )
            cost = dict(product.cost)
        fields = dict(
            user_id=user_id,
            request_id=str(request_id),
            target=target,
            expires_at=now + timedelta(seconds=product.duration_seconds),
        )
        fields.update(
            game_key=product.game_key,
            product_id=product.product_id,
            purpose=product.purpose,
            cost=cost,
        )
        purchase = GamePurchase(**fields)
        db.add(purchase)
    expires_at = int(purchase.expires_at.replace(tzinfo=timezone.utc).timestamp())
    remaining = max(1, expires_at - int(datetime.now(timezone.utc).timestamp()))
    token, _ = create_game_token(
        product.game_key,
        {
            "user_id": user_id,
            "purpose": purchase.purpose,
            "target": purchase.target,
            "purchase_id": purchase.request_id,
            "product_id": product.product_id,
            "game_key": product.game_key,
            "exp": expires_at,
        },
        expires_seconds=remaining,
        expires_at=purchase.expires_at,
    )
    # Signing precedes commit so a signing failure cannot leave a charge behind.
    db.commit()
    return {
        "grant_token": token,
        "expires_at": expires_at,
        "user_id": user_id,
        "game_key": product.game_key,
        "product_id": product.product_id,
        "purchase_id": purchase.request_id,
        "assets": get_asset_balances(db, user_id),
        "cost": purchase.cost,
    }


# Game-owned deliveries reuse the same portal charge/receipt infrastructure.
# Legacy game adapters can continue using their existing routes and ledgers.
def _inventory_delivery_rule(game_key: str) -> GameInventoryDelivery:
    rule = get_game_inventory_delivery(game_key)
    if rule is None:
        raise HTTPException(status_code=404, detail="unknown_game_inventory_delivery")
    if rule.game_key != game_key or not rule.purpose or not rule.ack_operation or rule.token_ttl_seconds <= 0:
        raise HTTPException(status_code=503, detail="invalid_delivery_duration")
    return rule


def inventory_delivery_receipt(purchase: GamePurchase, rule: GameInventoryDelivery) -> dict:
    if purchase.game_key != rule.game_key or purchase.purpose != rule.purpose:
        raise HTTPException(status_code=409, detail="inventory_delivery_scope_mismatch")
    grants = json.loads(purchase.target)
    token, _ = create_game_token(rule.game_key, {
        "user_id": purchase.user_id, "purpose": rule.purpose, "game_key": rule.game_key,
        "purchase_id": purchase.request_id, "grants": grants,
        "item_id": purchase.product_id, "cost": purchase.cost,
    }, expires_seconds=rule.token_ttl_seconds)
    return {"purchase_id": purchase.request_id, "item_id": purchase.product_id,
            "grants": grants, "grant_token": token, "cost": purchase.cost}


def purchase_inventory_delivery(db: Session, user_id: int, item_id: str, game_mode: str | None, request_id: UUID | None) -> dict:
    rule = get_game_inventory_delivery_for_item(item_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="unknown_inventory_delivery_item")
    rule = _inventory_delivery_rule(rule.game_key)
    if game_mode not in (None, rule.game_key) or request_id is None:
        raise HTTPException(status_code=400, detail="invalid_inventory_delivery_purchase")
    item = SHOP_ITEMS.get(item_id)
    if item is None or item.get("games") != [rule.game_key]:
        raise HTTPException(status_code=400, detail="invalid_item_id")
    grants = item.get("grants", {item_id: 1})
    if not isinstance(grants, dict) or not grants or any(key not in rule.grant_items or type(count) is not int or count <= 0 for key, count in grants.items()):
        raise HTTPException(status_code=500, detail="invalid_shop_grant")
    if len(json.dumps(grants, sort_keys=True)) > 256:
        raise HTTPException(status_code=503, detail="invalid_shop_grant")
    lock_account(db, user_id)
    previous = db.query(GamePurchase).filter_by(user_id=user_id, request_id=str(request_id)).first()
    if previous is not None:
        if previous.game_key != rule.game_key or previous.purpose != rule.purpose or previous.product_id != item_id:
            raise HTTPException(status_code=409, detail="purchase_request_mismatch")
        result = inventory_delivery_receipt(previous, rule)
    else:
        # Reject UUIDs already used by the other purchase operations.
        if db.query(CommerceOperation).filter_by(user_id=user_id, request_id=str(request_id)).first() is not None:
            raise HTTPException(status_code=409, detail="purchase_request_mismatch")
        debit_assets(db, user_id, item["cost"], source="shop:" + item_id,
                     request_id=str(request_id), insufficient_detail="insufficient_assets")
        purchase = GamePurchase(user_id=user_id, request_id=str(request_id), game_key=rule.game_key,
                                product_id=item_id, purpose=rule.purpose, target=json.dumps(grants, sort_keys=True),
                                cost=dict(item["cost"]), expires_at=datetime.utcnow() + timedelta(seconds=rule.token_ttl_seconds))
        db.add(purchase)
        # Signing must succeed before the charge is committed.
        result = inventory_delivery_receipt(purchase, rule)
    db.commit()
    return {**result, "assets": get_asset_balances(db, user_id)}


def pending_inventory_deliveries(db: Session, user_id: int, game_key: str) -> dict:
    rule = _inventory_delivery_rule(game_key)
    acknowledged = exists().where(CommerceOperation.user_id == GamePurchase.user_id,
                                  CommerceOperation.request_id == GamePurchase.request_id,
                                  CommerceOperation.operation == rule.ack_operation)
    purchases = db.query(GamePurchase).filter(GamePurchase.user_id == user_id,
        GamePurchase.game_key == rule.game_key, GamePurchase.purpose == rule.purpose,
        ~acknowledged).order_by(GamePurchase.id.asc()).limit(100).all()
    return {"deliveries": [inventory_delivery_receipt(purchase, rule) for purchase in purchases]}


def acknowledge_inventory_delivery(db: Session, user_id: int, purchase_id: UUID, game_key: str) -> dict:
    rule = _inventory_delivery_rule(game_key)
    lock_account(db, user_id)
    purchase = db.query(GamePurchase).filter_by(user_id=user_id, request_id=str(purchase_id),
                                               game_key=rule.game_key, purpose=rule.purpose).first()
    if purchase is None:
        raise HTTPException(status_code=404, detail="unknown_inventory_delivery")
    payload = {"purchase_id": str(purchase_id)}
    replay = replay_operation(db, user_id, purchase_id, rule.ack_operation, payload)
    if replay is None:
        save_operation(db, user_id, purchase_id, rule.ack_operation, payload, {"delivered": True})
    db.commit()
    return {"delivered": True}
