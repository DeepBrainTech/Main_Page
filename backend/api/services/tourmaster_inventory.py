"""Portal charges and durable deliveries for Tourmaster-owned inventory."""

import json
from datetime import datetime, timedelta
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import exists
from sqlalchemy.orm import Session

from config.game_auth import create_game_token
from config.shop_items import SHOP_ITEMS
from models import CommerceOperation, GamePurchase, UserItemInventory
from services.assets import debit_assets, get_asset_balances, lock_account
from services.idempotency import replay_operation, save_operation

ITEMS = ("chess_tourmaster_hint", "chess_tourmaster_undo")
PURPOSE = "chess-tourmaster-inventory"
ACK_OPERATION = "chess-tourmaster.inventory.delivered"


def delivery(purchase: GamePurchase) -> dict:
    grants = json.loads(purchase.target)
    token, _ = create_game_token("chess-tourmaster", {
        "user_id": purchase.user_id, "purpose": PURPOSE, "game_key": "chess-tourmaster",
        "purchase_id": purchase.request_id, "grants": grants,
    }, expires_seconds=600)
    return {"purchase_id": purchase.request_id, "item_id": purchase.product_id,
            "grants": grants, "grant_token": token, "cost": purchase.cost}


def purchase_item(db: Session, user_id: int, item_id: str, game_mode: str | None, request_id: UUID | None) -> dict:
    if game_mode not in (None, "chess-tourmaster") or request_id is None:
        raise HTTPException(status_code=400, detail="invalid_chess-tourmaster_purchase")
    item = SHOP_ITEMS.get(item_id)
    if item is None or item.get("games") != ["chess-tourmaster"]:
        raise HTTPException(status_code=400, detail="invalid_item_id")
    grants = item.get("grants", {item_id: 1})
    if not grants or any(key not in ITEMS or type(count) is not int or count <= 0 for key, count in grants.items()):
        raise HTTPException(status_code=500, detail="invalid_shop_grant")
    lock_account(db, user_id)
    previous = db.query(GamePurchase).filter_by(user_id=user_id, request_id=str(request_id)).first()
    if previous is not None:
        if previous.game_key != "chess-tourmaster" or previous.purpose != PURPOSE or previous.product_id != item_id:
            raise HTTPException(status_code=409, detail="purchase_request_mismatch")
        result = delivery(previous)
    else:
        # Reject UUIDs already used by the retired portal-inventory purchase path.
        if db.query(CommerceOperation).filter_by(user_id=user_id, request_id=str(request_id)).first() is not None:
            raise HTTPException(status_code=409, detail="purchase_request_mismatch")
        debit_assets(db, user_id, item["cost"], source="shop:" + item_id,
                     request_id=str(request_id), insufficient_detail="insufficient_assets")
        purchase = GamePurchase(user_id=user_id, request_id=str(request_id), game_key="chess-tourmaster",
                                product_id=item_id, purpose=PURPOSE, target=json.dumps(grants, sort_keys=True),
                                cost=dict(item["cost"]), expires_at=datetime.utcnow() + timedelta(minutes=10))
        db.add(purchase)
        # Signing must succeed before the charge is committed.
        result = delivery(purchase)
    db.commit()
    return {**result, "assets": get_asset_balances(db, user_id)}


def migrate_inventory(db: Session, user_id: int) -> dict:
    lock_account(db, user_id)
    rows = db.query(UserItemInventory).filter(UserItemInventory.user_id == user_id,
                                             UserItemInventory.item_id.in_(ITEMS)).all()
    grants = {}
    for row in rows:
        if row.quantity < 0 or row.quantity > 1000000000:
            raise HTTPException(status_code=409, detail="invalid_legacy_inventory")
        if row.quantity:
            grants[row.item_id] = row.quantity
    result = None
    if grants:
        purchase = GamePurchase(user_id=user_id, request_id=str(uuid4()), game_key="chess-tourmaster",
                                product_id="legacy-inventory", purpose=PURPOSE, target=json.dumps(grants, sort_keys=True),
                                cost={}, expires_at=datetime.utcnow() + timedelta(minutes=10))
        db.add(purchase)
        result = delivery(purchase)
    for row in rows:
        db.delete(row)
    # The grant ledger and removal of legacy stock commit together. Deliveries remain
    # recoverable until Tourmaster has durably accepted them and the client acknowledges.
    db.commit()
    return {"migrated": bool(grants), "delivery": result}


def pending_deliveries(db: Session, user_id: int) -> dict:
    acknowledged = exists().where(CommerceOperation.user_id == GamePurchase.user_id,
                                  CommerceOperation.request_id == GamePurchase.request_id,
                                  CommerceOperation.operation == ACK_OPERATION)
    purchases = db.query(GamePurchase).filter(GamePurchase.user_id == user_id,
        GamePurchase.game_key == "chess-tourmaster", GamePurchase.purpose == PURPOSE,
        ~acknowledged).order_by(GamePurchase.id.asc()).limit(100).all()
    return {"deliveries": [delivery(purchase) for purchase in purchases]}


def acknowledge_delivery(db: Session, user_id: int, purchase_id: UUID) -> dict:
    lock_account(db, user_id)
    purchase = db.query(GamePurchase).filter_by(user_id=user_id, request_id=str(purchase_id),
                                               game_key="chess-tourmaster", purpose=PURPOSE).first()
    if purchase is None:
        raise HTTPException(status_code=404, detail="unknown_inventory_delivery")
    payload = {"purchase_id": str(purchase_id)}
    replay = replay_operation(db, user_id, purchase_id, ACK_OPERATION, payload)
    if replay is None:
        save_operation(db, user_id, purchase_id, ACK_OPERATION, payload, {"delivered": True})
    db.commit()
    return {"delivered": True}
