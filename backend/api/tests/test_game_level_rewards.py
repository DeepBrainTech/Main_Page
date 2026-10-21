"""Configured first-clear rewards are account/game scoped and replay-safe."""

import os
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import NAMESPACE_URL, uuid5

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from jose import jwt

from test_chessmater_hint_tickets import CommerceFixture
from config.game_rewards import GAME_LEVEL_REWARDS, LevelRewardRule
from database import get_db
from models import AssetTransaction, UserRewards
from routes.game_reward_routes import router
from services.game_rewards import claim_level_reward
from services.idempotency import save_operation


class LevelRewardTests(CommerceFixture):
    def setUp(self):
        super().setUp()
        self.reward_settings = patch.dict(os.environ, {"CHESSMATER_REWARD_SECRET": ""})
        self.reward_settings.start()
        self.addCleanup(self.reward_settings.stop)

    def token(self, **overrides):
        claims = {"user_id": "1", "level": 3, "purpose": "first-clear-reward",
                  "exp": datetime.now(timezone.utc) + timedelta(minutes=1),
                  "aud": "chessmater-level-reward", "iss": "chessmater-game", **overrides}
        return jwt.encode(claims, "isolated-inventory-test-secret", algorithm="HS256")

    def claim(self, token, game="chessmater"):
        return claim_level_reward(self.db, token, game)

    def test_same_level_credits_once_and_new_levels_and_accounts_are_independent(self):
        first = self.claim(self.token())
        retry = self.claim(self.token())
        self.assertFalse(first["already_claimed"])
        self.assertEqual(first["rewards"], {"coins": 200})
        self.assertEqual((first["game_key"], first["level"]), ("chessmater", 3))
        self.assertTrue(retry["already_claimed"])
        self.assertEqual(retry["assets"]["coins"], 10200)
        self.claim(self.token(level=4))
        other = self.claim(self.token(user_id="2"))
        self.assertEqual(other["assets"]["coins"], 200)
        self.assertEqual(self.db.query(UserRewards).filter_by(user_id=1).one().coins, 10400)
        self.assertEqual(self.db.query(AssetTransaction).count(), 3)

    def test_invalid_claims_cannot_grant_assets(self):
        for overrides in [
            {"aud": "chessmater", "iss": "main-portal"},
            {"purpose": "chessmater-inventory"}, {"purpose": "first-clear-coins"},
            {"level": 0}, {"level": 106}, {"level": True}, {"level": "3"},
            {"user_id": True}, {"user_id": 1.5}, {"user_id": "0"},
            {"user_id": "2147483648"},
            {"exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        ]:
            with self.subTest(overrides=overrides), self.assertRaises(HTTPException) as error:
                self.claim(self.token(**overrides))
            self.assertEqual(error.exception.status_code, 401)
            self.db.rollback()
        self.assertEqual(self.db.query(AssetTransaction).count(), 0)

    def test_balance_and_deduplication_ledger_roll_back_together(self):
        with patch("services.game_rewards.save_operation", side_effect=RuntimeError("ledger failed")):
            with self.assertRaises(RuntimeError):
                self.claim(self.token())
        self.db.rollback()
        self.assertEqual(self.db.query(UserRewards).filter_by(user_id=1).one().coins, 10000)
        self.assertEqual(self.db.query(AssetTransaction).count(), 0)
        self.assertEqual(self.claim(self.token())["assets"]["coins"], 10200)

    def test_existing_paid_claims_are_not_paid_again(self):
        save_operation(self.db, 1, uuid5(NAMESPACE_URL, "chessmater:first-clear:3"),
                       "chessmater.first-clear-coins", {"level": 3}, {"coins": 200})
        self.db.commit()
        result = self.claim(self.token())
        self.assertTrue(result["already_claimed"])
        self.assertEqual(result["rewards"], {"coins": 200})
        self.assertEqual(result["assets"]["coins"], 10000)
        self.assertEqual(self.db.query(AssetTransaction).count(), 0)

    def test_other_games_use_their_own_rules_and_cannot_reuse_another_games_token(self):
        with patch.dict(GAME_LEVEL_REWARDS, {"number-blast": LevelRewardRule(1, 10, {"diamonds": 2, "flowers": 1})}), patch.dict(os.environ, {
            "NUMBER_BLAST_JWT_SECRET": "isolated-inventory-test-secret",
            "NUMBER_BLAST_JWT_ALG": "HS256", "NUMBER_BLAST_REWARD_SECRET": "",
        }):
            for overrides in [{}, {"aud": "number-blast-level-reward"}, {"iss": "number-blast-game"}]:
                with self.subTest(overrides=overrides), self.assertRaises(HTTPException):
                    self.claim(self.token(**overrides), "number-blast")
            self.claim(self.token())
            token = self.token(aud="number-blast-level-reward", iss="number-blast-game", rewards={"coins": 99999})
            result = self.claim(token, "number-blast")
            self.assertEqual(result["rewards"], {"diamonds": 2, "flowers": 1})
            self.assertEqual(result["assets"], {"coins": 10200, "diamonds": 101, "flowers": 8})
            self.assertTrue(self.claim(token, "number-blast")["already_claimed"])
            with self.assertRaises(HTTPException):
                self.claim(self.token(level=11, aud="number-blast-level-reward", iss="number-blast-game"), "number-blast")
            self.assertEqual(self.db.query(AssetTransaction).count(), 2)

    def test_retry_returns_original_reward_after_configuration_change(self):
        self.claim(self.token())
        with patch.dict(GAME_LEVEL_REWARDS, {"chessmater": LevelRewardRule(1, 105, {"coins": 500}, "first-clear-coins")}):
            result = self.claim(self.token())
            self.assertEqual(result["rewards"], {"coins": 200})
            self.assertEqual(result["assets"]["coins"], 10200)
            self.assertEqual(self.claim(self.token(level=4))["rewards"], {"coins": 500})

    def test_unregistered_or_unconfigured_games_do_not_pay(self):
        for game, detail in [("unknown", "unknown_game"), ("quantumgo", "level_rewards_not_configured")]:
            with self.subTest(game=game), self.assertRaises(HTTPException) as error:
                self.claim(self.token(), game)
            self.assertEqual((error.exception.status_code, error.exception.detail), (404, detail))
        self.assertEqual(self.db.query(AssetTransaction).count(), 0)

    def test_missing_and_placeholder_secrets_are_rejected(self):
        token = self.token()
        for secret in ["", "CHESSMATER", "change-this-reward-secret", "   "]:
            with patch.dict(os.environ, {"CHESSMATER_JWT_SECRET": secret}), self.assertRaises(HTTPException) as error:
                self.claim(token)
            self.assertEqual(error.exception.status_code, 503)

    def test_dedicated_reward_secret_is_required_when_configured(self):
        with patch.dict(os.environ, {"CHESSMATER_REWARD_SECRET": "dedicated-reward-secret"}):
            with self.assertRaises(HTTPException):
                self.claim(self.token())
            claims = jwt.get_unverified_claims(self.token())
            token = jwt.encode(claims, "dedicated-reward-secret", algorithm="HS256")
            self.assertEqual(self.claim(token)["rewards"], {"coins": 200})

    def test_http_route_requires_bearer_and_uses_game_slug(self):
        app = FastAPI()
        app.include_router(router, prefix="/api/games")
        app.dependency_overrides[get_db] = lambda: self.db
        with TestClient(app) as client, patch("routes.game_reward_routes.claim_level_reward", return_value={"rewards": {"coins": 200}}) as claim:
            url = "/api/games/chessmater/level-rewards/claim"
            self.assertEqual(client.post(url).status_code, 401)
            claim.assert_not_called()
            response = client.post(url, headers={"Authorization": "Bearer reward-token"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["cache-control"], "no-store")
            self.assertEqual(response.json()["data"]["rewards"], {"coins": 200})
            claim.assert_called_once_with(self.db, "reward-token", "chessmater")
