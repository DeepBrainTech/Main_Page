"""Portal charges and delivery recovery; all usable stock lives in the game."""
import asyncio
from datetime import datetime, timedelta
import os
from unittest.mock import patch
from uuid import uuid4
from fastapi import HTTPException
from jose import jwt
from test_chessmater_hint_tickets import CommerceFixture
from models import UserRewards, UserItemInventory, GamePurchase
from services.inventory import redeem_item, consume_item
from services import game_purchases
from config.game_commerce import get_game_product

ITEM = "online_chess_analysis_access"


class OnlineChessCommerceTest(CommerceFixture):
    def setUp(self):
        super().setUp()
        settings = patch.dict(os.environ, {"ONLINE_CHESS_JWT_SECRET": "isolated-online-chess-secret", "ONLINE_CHESS_JWT_AUD": "online-chess", "ONLINE_CHESS_JWT_ISS": "main-portal"})
        settings.start()
        self.addCleanup(settings.stop)
        self.db.query(UserRewards).first().diamonds = 500
        self.db.commit()

    def test_prices_receipts_and_retry_without_any_portal_inventory(self):
        request = uuid4()
        first = asyncio.run(redeem_item(ITEM, "online-chess", self.user, self.db, request)).data
        replay = asyncio.run(redeem_item(ITEM, "online-chess", self.user, self.db, request)).data
        self.assertEqual(first["purchase_id"], replay["purchase_id"])
        self.assertEqual(first["grants"], {ITEM: 1})
        self.assertEqual(self.db.query(UserRewards).first().diamonds, 490)
        bundle = asyncio.run(redeem_item(ITEM + "_pack25", "online-chess", self.user, self.db, uuid4())).data
        self.assertEqual(bundle["grants"], {ITEM: 25})
        self.assertEqual(self.db.query(UserRewards).first().diamonds, 291)
        self.assertEqual(self.db.query(UserItemInventory).count(), 0)
        self.assertIsNone(get_game_product("online-chess", "ai-explanation"))
        claims = jwt.decode(bundle["grant_token"], os.environ["ONLINE_CHESS_JWT_SECRET"], algorithms=["HS256"], audience="online-chess", issuer="main-portal")
        self.assertEqual(claims["purpose"], "online-chess-inventory")
        self.assertEqual(claims["user_id"], 1)
        self.assertEqual(claims["grants"], {ITEM: 25})
        self.assertEqual(claims["cost"]["diamonds"], 199)
        self.assertEqual(claims["item_id"], ITEM + "_pack25")

    def test_pending_receipts_reissue_until_acknowledged_without_charging(self):
        result = asyncio.run(redeem_item(ITEM, "online-chess", self.user, self.db, uuid4())).data
        self.db.query(GamePurchase).first().expires_at = datetime.utcnow() - timedelta(days=1)
        self.db.commit()
        pending = game_purchases.pending_inventory_deliveries(self.db, 1, "online-chess")["deliveries"]
        self.assertEqual(len(pending), 1)
        self.assertEqual(pending[0]["purchase_id"], result["purchase_id"])
        self.assertEqual(game_purchases.pending_inventory_deliveries(self.db, 2, "online-chess")["deliveries"], [])
        game_purchases.acknowledge_inventory_delivery(self.db, 1, result["purchase_id"], "online-chess")
        game_purchases.acknowledge_inventory_delivery(self.db, 1, result["purchase_id"], "online-chess")
        self.assertEqual(game_purchases.pending_inventory_deliveries(self.db, 1, "online-chess")["deliveries"], [])
        self.assertEqual(self.db.query(UserRewards).first().diamonds, 490)
        self.assertEqual(self.db.query(UserItemInventory).count(), 0)

    def test_wrong_user_ack_and_unsigned_portal_consumption_are_rejected(self):
        result = asyncio.run(redeem_item(ITEM, "online-chess", self.user, self.db, uuid4())).data
        with self.assertRaises(HTTPException):
            game_purchases.acknowledge_inventory_delivery(self.db, 2, result["purchase_id"], "online-chess")
        self.db.rollback()
        with self.assertRaises(HTTPException) as error:
            asyncio.run(consume_item(ITEM, 1, "online-chess", self.user, self.db, uuid4()))
        self.assertEqual(error.exception.status_code, 410)
        self.assertEqual(self.db.query(UserItemInventory).count(), 0)

    def test_account_mismatch_is_rejected_before_charge(self):
        from routes import user
        with self.assertRaises(HTTPException) as error:
            asyncio.run(user.redeem_item(expected_user_id=2, item_id=ITEM, game_mode="online-chess", current_user=self.user, db=self.db, request_id=uuid4()))
        self.assertEqual(error.exception.detail, "payment_account_mismatch")
        self.assertEqual(self.db.query(UserRewards).first().diamonds, 500)
        self.assertEqual(self.db.query(GamePurchase).count(), 0)

    def test_signing_failure_and_wrong_game_cannot_commit_charges(self):
        with self.assertRaises(HTTPException):
            asyncio.run(redeem_item(ITEM, "chessmater", self.user, self.db, uuid4()))
        self.db.rollback()
        with patch("services.game_purchases.create_game_token", side_effect=RuntimeError("signing failed")):
            with self.assertRaises(RuntimeError):
                asyncio.run(redeem_item(ITEM, "online-chess", self.user, self.db, uuid4()))
        self.db.rollback()
        self.assertEqual(self.db.query(UserRewards).first().diamonds, 500)
        self.assertEqual(self.db.query(GamePurchase).count(), 0)

    def test_quote_exposes_only_identity_and_diamonds_not_portal_pass_stock(self):
        from routes import user
        result = asyncio.run(user.game_inventory_quote("online-chess", self.user, self.db))
        self.assertEqual(result.data["user_id"], 1)
        self.assertEqual(result.data["assets"]["diamonds"], 500)
        self.assertNotIn("inventory_quantity", result.data)
        self.assertEqual(self.db.query(UserItemInventory).count(), 0)
