"""A new game needs configuration, not another inventory service implementation."""
import asyncio
import os
from unittest.mock import patch
from uuid import uuid4
from fastapi import HTTPException
from jose import jwt
from test_chessmater_hint_tickets import CommerceFixture
from config.game_commerce import GameInventoryDelivery, GAME_INVENTORY_DELIVERIES, get_game_product
from config.shop_items import SHOP_ITEMS
from models import GamePurchase, UserItemInventory, UserRewards
from services import game_purchases
from services.inventory import redeem_item, consume_item

ITEM = "generic_quantum_test_access"
PACK = ITEM + "_pack3"


class GenericInventoryDeliveryTest(CommerceFixture):
    def setUp(self):
        super().setUp()
        self.rule = GameInventoryDelivery(game_key="quantumgo", item_ids=(ITEM, PACK), grant_items=(ITEM,), purpose="quantumgo-test-inventory", ack_operation="quantumgo.test-delivered")
        for context in [
            patch.dict(GAME_INVENTORY_DELIVERIES, {"quantumgo": self.rule}),
            patch.dict(SHOP_ITEMS, {
                ITEM: {"name": "Test Access", "games": ["quantumgo"], "cost": {"coins": 0, "diamonds": 7, "flowers": 0}},
                PACK: {"name": "Test Pack", "games": ["quantumgo"], "cost": {"coins": 0, "diamonds": 20, "flowers": 0}, "grants": {ITEM: 3}},
            }),
            patch.dict(os.environ, {"QUANTUMGO_JWT_SECRET": "generic-delivery-test-key", "QUANTUMGO_JWT_AUD": "quantum-go", "QUANTUMGO_JWT_ISS": "main-portal"}),
        ]:
            context.start()
            self.addCleanup(context.stop)

    def test_configuration_only_game_can_purchase_recover_and_acknowledge(self):
        result = asyncio.run(redeem_item(PACK, "quantumgo", self.user, self.db, uuid4())).data
        self.assertEqual(result["grants"], {ITEM: 3})
        claims = jwt.decode(result["grant_token"], "generic-delivery-test-key", algorithms=["HS256"], audience="quantum-go", issuer="main-portal")
        self.assertEqual(claims["game_key"], "quantumgo")
        self.assertEqual(claims["purpose"], self.rule.purpose)
        self.assertEqual(claims["cost"]["diamonds"], 20)
        self.assertEqual(self.db.query(UserRewards).first().diamonds, 79)
        self.assertEqual(self.db.query(UserItemInventory).count(), 0)
        pending = game_purchases.pending_inventory_deliveries(self.db, 1, "quantumgo")["deliveries"]
        self.assertEqual(pending[0]["purchase_id"], result["purchase_id"])
        self.assertEqual(game_purchases.pending_inventory_deliveries(self.db, 1, "online-chess")["deliveries"], [])
        game_purchases.acknowledge_inventory_delivery(self.db, 1, result["purchase_id"], "quantumgo")
        self.assertEqual(game_purchases.pending_inventory_deliveries(self.db, 1, "quantumgo")["deliveries"], [])

    def test_retry_keeps_original_paid_price_and_grants_after_catalog_change(self):
        request = uuid4()
        first = asyncio.run(redeem_item(ITEM, "quantumgo", self.user, self.db, request)).data
        with patch.dict(SHOP_ITEMS, {ITEM: {**SHOP_ITEMS[ITEM], "cost": {"coins": 0, "diamonds": 70, "flowers": 0}, "grants": {ITEM: 2}}}):
            replay = asyncio.run(redeem_item(ITEM, "quantumgo", self.user, self.db, request)).data
        self.assertEqual(first["cost"], replay["cost"])
        self.assertEqual(replay["grants"], {ITEM: 1})
        self.assertEqual(self.db.query(UserRewards).first().diamonds, 92)
        self.assertEqual(self.db.query(GamePurchase).count(), 1)

    def test_wrong_game_and_unregistered_grants_cannot_commit_a_charge(self):
        with self.assertRaises(HTTPException):
            asyncio.run(redeem_item(ITEM, "online-chess", self.user, self.db, uuid4()))
        self.db.rollback()
        with patch.dict(SHOP_ITEMS, {PACK: {**SHOP_ITEMS[PACK], "grants": {"foreign_item": 3}}}):
            with self.assertRaises(HTTPException):
                asyncio.run(redeem_item(PACK, "quantumgo", self.user, self.db, uuid4()))
        self.db.rollback()
        self.assertEqual(self.db.query(UserRewards).first().diamonds, 99)
        self.assertEqual(self.db.query(GamePurchase).count(), 0)

    def test_generic_routes_capture_game_key_and_protect_account_switches(self):
        from routes import user
        route = next(item for item in user.router.routes if item.name == "game_inventory_delivery_ack")
        self.assertEqual(route.path, "/api/user/shop/{game_key}/deliveries/{purchase_id}/ack")
        self.assertIn("game_key", [field.name for field in route.dependant.path_params])
        self.assertEqual(asyncio.run(user.game_inventory_quote("quantumgo", self.user, self.db)).data["user_id"], 1)
        with self.assertRaises(HTTPException) as raised:
            asyncio.run(user.redeem_item(expected_user_id=2, item_id=ITEM, game_mode="quantumgo", current_user=self.user, db=self.db, request_id=uuid4()))
        self.assertEqual(raised.exception.detail, "payment_account_mismatch")
        self.assertEqual(self.db.query(UserRewards).first().diamonds, 99)

    def test_acknowledgment_and_receipts_cannot_cross_game_or_user(self):
        result = asyncio.run(redeem_item(ITEM, "quantumgo", self.user, self.db, uuid4())).data
        for game, owner in [("online-chess", 1), ("quantumgo", 2)]:
            with self.assertRaises(HTTPException):
                game_purchases.acknowledge_inventory_delivery(self.db, owner, result["purchase_id"], game)
            self.db.rollback()
        purchase = self.db.query(GamePurchase).first()
        with self.assertRaises(HTTPException):
            game_purchases.inventory_delivery_receipt(purchase, GAME_INVENTORY_DELIVERIES["online-chess"])

    def test_game_owned_stock_cannot_be_consumed_from_portal_inventory(self):
        with self.assertRaises(HTTPException) as raised:
            asyncio.run(consume_item(ITEM, 1, "quantumgo", self.user, self.db, uuid4()))
        self.assertEqual(raised.exception.status_code, 410)
        self.assertEqual(self.db.query(UserItemInventory).count(), 0)

    def test_existing_generic_paid_authorization_is_unchanged(self):
        product = get_game_product("quantumgo", "ai-review")
        self.assertEqual(product.cost, {"diamonds": 5})
        request = uuid4()
        first = game_purchases.redeem_purchase(self.db, 1, product, request, "local:" + "a" * 64)
        replay = game_purchases.redeem_purchase(self.db, 1, product, request, "local:" + "a" * 64)
        self.assertEqual(first["purchase_id"], replay["purchase_id"])
        self.assertEqual(self.db.query(UserRewards).first().diamonds, 94)
        self.assertEqual(self.db.query(UserItemInventory).count(), 0)
