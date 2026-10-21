"""Game avatar lookups reuse the portal profile resolver and reject login tokens."""

from datetime import datetime, timedelta
import os
import unittest
from unittest.mock import patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///avatar-test-bootstrap-unused.db"}):
    from models import User
    from services.game_avatars import get_leaderboard_avatars
    from config.game_auth import GAME_AUTH_ENTRIES
    from routes.game_avatar_routes import router
    from database import get_db


class AvatarTests(unittest.TestCase):
    def setUp(self):
        self.settings = patch.dict(os.environ, {"CHESSMATER_JWT_SECRET": "isolated-inventory-test-secret", "CHESSMATER_JWT_ALG": "HS256", "PUBLIC_APP_URL": "https://portal.example.test"})
        self.settings.start()
        self.engine = create_engine("sqlite://")
        User.__table__.create(self.engine)
        self.db = Session(self.engine)
        self.user = User(id=1, username="avatar-test", email="avatar@example.test")
        self.db.add_all([self.user, User(id=2, username="other", email="other@example.test")])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        self.settings.stop()

    def token(self, **overrides):
        claims = {"user_ids": ["1", "2"], "purpose": "leaderboard-avatars",
                  "aud": "chessmater-leaderboard-avatars", "iss": "chessmater-game",
                  "exp": datetime.utcnow() + timedelta(minutes=1), **overrides}
        return jwt.encode(claims, "isolated-inventory-test-secret", algorithm="HS256")

    def test_resolves_uploaded_and_google_avatars_without_other_profile_fields(self):
        self.user.avatar_object_key = "avatars/1.png"
        self.user.google_avatar_url = "https://google.example.test/avatar.png"
        self.db.commit()
        with patch("services.avatars.generate_object_read_url", return_value="https://r2.example.test/signed-avatar"):
            result = get_leaderboard_avatars(self.db, self.token(), "chessmater")
        self.assertEqual(result, {"avatars": [
            {"user_id": 1, "avatar_url": "https://r2.example.test/signed-avatar", "avatar_fallback_url": "https://portal.example.test/dashboard/default.png"},
            {"user_id": 2, "avatar_url": "https://portal.example.test/dashboard/default.png", "avatar_fallback_url": "https://portal.example.test/dashboard/default.png"},
        ]})
        with patch("services.avatars.generate_object_read_url", side_effect=RuntimeError("unavailable")):
            self.assertEqual(get_leaderboard_avatars(self.db, self.token(), "chessmater")["avatars"][0]["avatar_url"], self.user.google_avatar_url)

    def test_invalid_login_expired_and_unbounded_tokens_are_rejected(self):
        for overrides in [{"aud": "chessmater", "iss": "main-portal"}, {"purpose": "first-clear-coins"},
                          {"exp": datetime.utcnow() - timedelta(minutes=1)},
                          {"user_ids": []}, {"user_ids": ["1"] * 4}, {"user_ids": [True]},
                          {"user_ids": ["0"]}, {"user_ids": ["2147483648"]}]:
            with self.subTest(overrides=overrides), self.assertRaises(HTTPException):
                get_leaderboard_avatars(self.db, self.token(**overrides), "chessmater")

    def test_only_requested_active_accounts_are_returned(self):
        self.user.is_active = False
        self.db.commit()
        self.assertEqual(get_leaderboard_avatars(self.db, self.token(user_ids=["1", "99"]), "chessmater"), {"avatars": []})

    def test_all_registered_games_can_resolve_avatars(self):
        for entry in GAME_AUTH_ENTRIES:
            with self.subTest(game=entry.game_key), patch.dict(os.environ, {
                f"{entry.env_prefix}_JWT_SECRET": "isolated-inventory-test-secret",
                f"{entry.env_prefix}_JWT_ALG": "HS256",
            }):
                token = self.token(aud=f"{entry.game_key}-leaderboard-avatars", iss=f"{entry.game_key}-game")
                result = get_leaderboard_avatars(self.db, token, entry.api_slug)
                self.assertEqual({row["user_id"] for row in result["avatars"]}, {1, 2})

    def test_game_tokens_cannot_be_used_for_another_game_even_with_the_same_secret(self):
        with patch.dict(os.environ, {"TOURMASTER_JWT_SECRET": "isolated-inventory-test-secret", "TOURMASTER_JWT_ALG": "HS256"}):
            for overrides in [
                {},
                {"aud": "chess-tourmaster-leaderboard-avatars"},
                {"iss": "chess-tourmaster-game"},
            ]:
                with self.subTest(overrides=overrides), self.assertRaises(HTTPException) as error:
                    get_leaderboard_avatars(self.db, self.token(**overrides), "chess-tourmaster")
                self.assertEqual(error.exception.status_code, 401)

    def test_unknown_games_and_missing_or_placeholder_secrets_are_rejected(self):
        with self.assertRaises(HTTPException) as error:
            get_leaderboard_avatars(self.db, self.token(), "unregistered-game")
        self.assertEqual(error.exception.status_code, 404)
        token = self.token()
        for secret in ["", "CHESSMATER", "change-this-example-secret"]:
            with self.subTest(secret=secret), patch.dict(os.environ, {"CHESSMATER_JWT_SECRET": secret}):
                with self.assertRaises(HTTPException) as error:
                    get_leaderboard_avatars(self.db, token, "chessmater")
                self.assertEqual(error.exception.status_code, 503)

    def test_http_route_requires_bearer_auth_and_does_not_cache_signed_urls(self):
        app = FastAPI()
        app.include_router(router, prefix="/api/games")
        app.dependency_overrides[get_db] = lambda: self.db
        with TestClient(app) as client, patch("routes.game_avatar_routes.get_leaderboard_avatars", return_value={"avatars": []}) as lookup:
            self.assertEqual(client.post("/api/games/chessmater/leaderboard/avatars").status_code, 401)
            lookup.assert_not_called()
            response = client.post("/api/games/chessmater/leaderboard/avatars", headers={"Authorization": "Bearer test-token"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["cache-control"], "no-store")
            self.assertEqual(response.json()["data"], {"avatars": []})
            lookup.assert_called_once_with(self.db, "test-token", "chessmater")
            lookup.reset_mock()
            response = client.post("/api/games/chess-tourmaster/leaderboard/avatars", headers={"Authorization": "Bearer tourmaster-token"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["cache-control"], "no-store")
            lookup.assert_called_once_with(self.db, "tourmaster-token", "chess-tourmaster")
