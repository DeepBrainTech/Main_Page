"""All ChessMater purchases charge once and produce game-owned inventory receipts."""
import asyncio
from uuid import uuid4
from fastapi import HTTPException
from test_chessmater_hint_tickets import CommerceFixture
from models import UserRewards, UserItemInventory, GamePurchase
from services.inventory import redeem_item


class PowerUpTests(CommerceFixture):
    def test_every_design_sku_issues_a_signed_delivery_without_portal_stock(self):
        cases = [
            ("chess_mater_reply", 300, {"chess_mater_reply": 1}),
            ("chess_mater_undo", 400, {"chess_mater_undo": 1}),
            ("chess_mater_antigravity", 600, {"chess_mater_antigravity": 1}),
            ("chess_mater_reply_pack5", 1300, {"chess_mater_reply": 5}),
            ("chess_mater_undo_pack5", 1700, {"chess_mater_undo": 5}),
            ("chess_mater_antigravity_pack5", 2500, {"chess_mater_antigravity": 5}),
            ("chess_mater_utility_pack", 1900, {"chess_mater_reply": 3, "chess_mater_undo": 2, "chess_mater_antigravity": 1})
        ]
        for sku, cost, grants in cases:
            with self.subTest(sku=sku):
                self.db.query(UserRewards).first().coins = 10000
                self.db.commit()
                request = uuid4()
                first = asyncio.run(redeem_item(sku, "chessmater", self.user, self.db, request))
                retry = asyncio.run(redeem_item(sku, "chessmater", self.user, self.db, request))
                self.assertEqual(first.data["purchase_id"], retry.data["purchase_id"])
                self.assertEqual(self.decode(first.data["grant_token"])["grants"], grants)
                self.assertEqual(self.db.query(UserItemInventory).count(), 0)
                self.assertEqual(self.db.query(UserRewards).first().coins, 10000 - cost)
                self.assertEqual(self.db.query(UserRewards).first().diamonds, 99)
                with self.assertRaises(HTTPException):
                    asyncio.run(redeem_item("chess_mater_undo" if sku != "chess_mater_undo" else "chess_mater_reply", "chessmater", self.user, self.db, request))
                self.db.rollback()

    def test_insufficient_coins_and_wrong_game_do_not_charge_or_create_deliveries(self):
        self.db.query(UserRewards).first().coins = 100
        self.db.commit()
        for mode in ("chessmater", "chess-tourmaster"):
            with self.assertRaises(HTTPException):
                asyncio.run(redeem_item("chess_mater_utility_pack", mode, self.user, self.db, uuid4()))
            self.db.rollback()
        self.assertEqual(self.db.query(UserRewards).first().coins, 100)
        self.assertEqual(self.db.query(UserItemInventory).count(), 0)
        self.assertEqual(self.db.query(GamePurchase).count(), 0)
