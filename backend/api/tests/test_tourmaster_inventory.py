"""Tourmaster purchases and migration never create usable portal stock."""
import asyncio
import os
from unittest.mock import patch
from uuid import uuid4
from fastapi import HTTPException
from jose import jwt
from test_chessmater_hint_tickets import CommerceFixture
from models import UserRewards, UserItemInventory, GamePurchase
from services.inventory import redeem_item, consume_item
from services.tourmaster_inventory import migrate_inventory, pending_deliveries, acknowledge_delivery


class TourmasterInventoryTests(CommerceFixture):
    def setUp(self):
        super().setUp()
        self.tourmaster_settings = patch.dict(os.environ, {"TOURMASTER_JWT_SECRET": "tourmaster-isolated-test-secret"})
        self.tourmaster_settings.start()

    def tearDown(self):
        self.tourmaster_settings.stop()
        super().tearDown()

    def test_hint_and_undo_charge_once_and_issue_tourmaster_only_receipts(self):
        for sku in ("chess_tourmaster_hint", "chess_tourmaster_undo"):
            before = self.db.query(UserRewards).first().coins
            request = uuid4()
            result = asyncio.run(redeem_item(sku, "chess-tourmaster", self.user, self.db, request))
            retry = asyncio.run(redeem_item(sku, "chess-tourmaster", self.user, self.db, request))
            claims = jwt.decode(result.data["grant_token"], os.environ["TOURMASTER_JWT_SECRET"],
                                algorithms=["HS256"], audience="chess-tourmaster", issuer="main-portal")
            self.assertEqual(claims["purpose"], "chess-tourmaster-inventory")
            self.assertEqual(claims["grants"], {sku: 1})
            self.assertEqual(result.data["purchase_id"], retry.data["purchase_id"])
            self.assertEqual(self.db.query(UserRewards).first().coins, before - 5)
            self.assertEqual(self.db.query(UserItemInventory).count(), 0)
            self.assertEqual(self.db.query(UserRewards).first().diamonds, 99)

    def test_migration_removes_only_tourmaster_stock_and_can_redeliver(self):
        self.db.add_all([UserItemInventory(user_id=1, item_id="chess_tourmaster_hint", quantity=4),
                         UserItemInventory(user_id=1, item_id="chess_tourmaster_undo", quantity=2),
                         UserItemInventory(user_id=1, item_id="chess_mater_reply", quantity=9)])
        self.db.commit()
        self.assertTrue(migrate_inventory(self.db, 1)["migrated"])
        self.assertFalse(migrate_inventory(self.db, 1)["migrated"])
        self.assertEqual({row.item_id: row.quantity for row in self.db.query(UserItemInventory)}, {"chess_mater_reply": 9})
        delivery = pending_deliveries(self.db, 1)["deliveries"][0]
        self.assertEqual(delivery["grants"], {"chess_tourmaster_hint": 4, "chess_tourmaster_undo": 2})
        self.assertEqual(pending_deliveries(self.db, 2)["deliveries"], [])
        acknowledge_delivery(self.db, 1, delivery["purchase_id"])
        acknowledge_delivery(self.db, 1, delivery["purchase_id"])
        self.assertEqual(pending_deliveries(self.db, 1)["deliveries"], [])

    def test_wrong_game_insufficient_coins_and_signing_failure_cannot_spend(self):
        self.db.query(UserRewards).first().coins = 0
        self.db.commit()
        for game in ("chess-tourmaster", "chessmater"):
            with self.assertRaises(HTTPException):
                asyncio.run(redeem_item("chess_tourmaster_hint", game, self.user, self.db, uuid4()))
            self.db.rollback()
        self.db.query(UserRewards).first().coins = 10
        self.db.commit()
        with patch("services.tourmaster_inventory.create_game_token", side_effect=RuntimeError("signing failed")):
            with self.assertRaises(RuntimeError):
                asyncio.run(redeem_item("chess_tourmaster_undo", "chess-tourmaster", self.user, self.db, uuid4()))
        self.db.rollback()
        self.assertEqual(self.db.query(UserRewards).first().coins, 10)
        self.assertEqual(self.db.query(GamePurchase).count(), 0)

    def test_retired_portal_consumption_does_not_touch_tourmaster_stock(self):
        self.db.add(UserItemInventory(user_id=1, item_id="chess_tourmaster_hint", quantity=4))
        self.db.commit()
        with self.assertRaises(HTTPException) as error:
            asyncio.run(consume_item("chess_tourmaster_hint", 1, "chess-tourmaster", self.user, self.db, uuid4()))
        self.assertEqual(error.exception.status_code, 410)
        self.assertEqual(self.db.query(UserItemInventory).first().quantity, 4)
