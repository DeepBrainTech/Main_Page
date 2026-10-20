"""First-clear coins are fixed, scoped to an account and replay-safe."""

from datetime import datetime, timedelta
from unittest.mock import patch

from fastapi import HTTPException
from jose import jwt

from test_chessmater_hint_tickets import CommerceFixture
from models import AssetTransaction, UserRewards
from services.chessmater_rewards import claim_level_reward


class LevelRewardTests(CommerceFixture):
    def token(self, **overrides):
        claims = {"user_id": "1", "level": 3, "purpose": "first-clear-coins",
                  "exp": datetime.utcnow() + timedelta(minutes=1),
                  "aud": "chessmater-level-reward", "iss": "chessmater-game", **overrides}
        return jwt.encode(claims, "isolated-inventory-test-secret", algorithm="HS256")

    def test_same_level_credits_once_and_new_levels_and_accounts_are_independent(self):
        first = claim_level_reward(self.db, self.token())
        retry = claim_level_reward(self.db, self.token())
        self.assertFalse(first["already_claimed"])
        self.assertTrue(retry["already_claimed"])
        self.assertEqual(retry["assets"]["coins"], 10200)
        claim_level_reward(self.db, self.token(level=4))
        other = claim_level_reward(self.db, self.token(user_id="2"))
        self.assertEqual(other["assets"]["coins"], 200)
        self.assertEqual(self.db.query(UserRewards).filter_by(user_id=1).one().coins, 10400)
        self.assertEqual(self.db.query(AssetTransaction).count(), 3)

    def test_login_inventory_expired_and_invalid_level_tokens_cannot_grant_coins(self):
        for token in [self.token(aud="chessmater", iss="main-portal"),
                      self.token(purpose="chessmater-inventory"), self.token(level=0),
                      self.token(level=106), self.token(level=True),
                      self.token(exp=datetime.utcnow() - timedelta(minutes=1))]:
            with self.subTest(token=token):
                with self.assertRaises(HTTPException):
                    claim_level_reward(self.db, token)
                self.db.rollback()
        self.assertEqual(self.db.query(AssetTransaction).count(), 0)

    def test_balance_and_deduplication_ledger_roll_back_together(self):
        with patch("services.chessmater_rewards.save_operation", side_effect=RuntimeError("ledger failed")):
            with self.assertRaises(RuntimeError):
                claim_level_reward(self.db, self.token())
        self.db.rollback()
        self.assertEqual(self.db.query(UserRewards).filter_by(user_id=1).one().coins, 10000)
        self.assertEqual(self.db.query(AssetTransaction).count(), 0)
        self.assertEqual(claim_level_reward(self.db, self.token())["assets"]["coins"], 10200)
