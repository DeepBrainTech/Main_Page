"""Verify game-owned stock, portal charges and recoverable legacy migration."""
import asyncio
import os
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from jose import jwt

with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///chessmater-test-bootstrap-unused.db"}):
    from models import User, UserRewards, UserItemInventory, GamePurchase, AssetTransaction, CommerceOperation, UserNotification
    from config.game_commerce import get_game_product
    from services.inventory import redeem_item, consume_item
    from services.chessmater_inventory import migrate_inventory, pending_deliveries, acknowledge_delivery


class CommerceFixture(unittest.TestCase):
    def setUp(self):
        self.settings = patch.dict(os.environ, {"CHESSMATER_JWT_SECRET": "isolated-inventory-test-secret",
            "CHESSMATER_JWT_ALG": "HS256", "CHESSMATER_JWT_AUD": "chessmater", "CHESSMATER_JWT_ISS": "main-portal"})
        self.settings.start()
        self.engine = create_engine("sqlite://")
        for model in (User, UserRewards, UserItemInventory, GamePurchase, AssetTransaction, CommerceOperation, UserNotification):
            model.__table__.create(self.engine)
        self.db = Session(self.engine)
        self.user = User(id=1, username="inventory-test", email="inventory@example.test")
        self.db.add(self.user)
        self.db.add(User(id=2, username="other-inventory-test", email="other-inventory@example.test"))
        self.db.add(UserRewards(user_id=1, coins=10000, diamonds=99, flowers=7))
        self.db.commit()
        self.notifications = patch("services.assets.schedule_notification_event")
        self.notifications.start()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        self.notifications.stop()
        self.settings.stop()

    def decode(self, token):
        return jwt.decode(token, os.environ["CHESSMATER_JWT_SECRET"], algorithms=["HS256"], audience="chessmater", issuer="main-portal")


class HintTicketTests(CommerceFixture):
    def test_migration_removes_only_chessmater_rows_and_is_recoverable_until_acknowledged(self):
        self.db.add_all([UserItemInventory(user_id=1, item_id="chess_mater_reply", quantity=3),
                         UserItemInventory(user_id=1, item_id="chess_mater_undo", quantity=2),
                         UserItemInventory(user_id=1, item_id="chess_tourmaster_hint", quantity=9)])
        self.db.commit()
        migrated = migrate_inventory(self.db, 1)
        self.assertTrue(migrated["migrated"])
        self.assertEqual({row.item_id: row.quantity for row in self.db.query(UserItemInventory)}, {"chess_tourmaster_hint": 9})
        self.assertFalse(migrate_inventory(self.db, 1)["migrated"])
        self.assertEqual(self.db.query(GamePurchase).count(), 1)
        self.db.query(GamePurchase).first().expires_at = datetime.utcnow() - timedelta(days=10)
        self.db.commit()
        receipt = pending_deliveries(self.db, 1)["deliveries"][0]
        claims = self.decode(receipt["grant_token"])
        self.assertEqual(claims["grants"], {"chess_mater_reply": 3, "chess_mater_undo": 2})
        self.assertEqual(pending_deliveries(self.db, 2)["deliveries"], [])
        with self.assertRaises(HTTPException):
            acknowledge_delivery(self.db, 2, receipt["purchase_id"])
        self.db.rollback()
        acknowledge_delivery(self.db, 1, receipt["purchase_id"])
        acknowledge_delivery(self.db, 1, receipt["purchase_id"])
        self.assertEqual(pending_deliveries(self.db, 1)["deliveries"], [])
        rewards = self.db.query(UserRewards).first()
        self.assertEqual((rewards.coins, rewards.diamonds, rewards.flowers), (10000, 99, 7))

    def test_signing_failure_rolls_back_charge_and_ledger(self):
        with patch("services.chessmater_inventory.create_game_token", side_effect=RuntimeError("signing failed")):
            with self.assertRaises(RuntimeError):
                asyncio.run(redeem_item("chess_mater_reply", "chessmater", self.user, self.db, uuid4()))
        self.db.rollback()
        self.assertEqual(self.db.query(UserRewards).first().coins, 10000)
        self.assertEqual(self.db.query(GamePurchase).count(), 0)
        self.assertEqual(self.db.query(AssetTransaction).count(), 0)

    def test_retired_permanent_unlock_and_portal_consumption_cannot_spend_stock(self):
        self.assertIsNone(get_game_product("chessmater", "replay"))
        self.db.add(UserItemInventory(user_id=1, item_id="chess_mater_reply", quantity=3))
        self.db.commit()
        with self.assertRaises(HTTPException) as error:
            asyncio.run(consume_item("chess_mater_reply", 1, "chessmater", self.user, self.db, uuid4()))
        self.assertEqual(error.exception.status_code, 410)
        self.assertEqual(self.db.query(UserItemInventory).first().quantity, 3)

    def test_other_game_inventory_keeps_existing_behavior(self):
        asyncio.run(redeem_item("learning_mental_math_making_whole", "learning-mental-math", self.user, self.db, uuid4()))
        self.assertEqual(self.db.query(UserItemInventory).first().quantity, 1)

    def test_failed_migration_retains_source_stock(self):
        self.db.add(UserItemInventory(user_id=1, item_id="chess_mater_reply", quantity=3))
        self.db.commit()
        with patch("services.chessmater_inventory.create_game_token", side_effect=RuntimeError("signing failed")):
            with self.assertRaises(RuntimeError):
                migrate_inventory(self.db, 1)
        self.db.rollback()
        self.assertEqual(self.db.query(UserItemInventory).first().quantity, 3)
        self.assertEqual(self.db.query(GamePurchase).count(), 0)
