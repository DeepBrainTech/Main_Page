"""Game leaderboard proxy contract, identity, and failure handling."""

import os
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from jose import jwt

with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///leaderboard-test-bootstrap-unused.db"}):
    from auth import get_current_active_user
    from routes.game_leaderboard_routes import router
    from services.game_leaderboards import get_game_leaderboard


class GameLeaderboardTests(unittest.TestCase):
    def setUp(self):
        self.user = SimpleNamespace(id=6, username="reader")
        self.env = patch.dict(os.environ, {
            "CHESSMATER_API_URL": "https://game.example.test/",
            "CHESSMATER_JWT_SECRET": "leaderboard-isolated-test-secret",
            "CHESSMATER_JWT_ALG": "HS256",
            "CHESSMATER_JWT_AUD": "chessmater",
            "CHESSMATER_JWT_ISS": "main-portal",
        })
        self.env.start()
        self.addCleanup(self.env.stop)

    def rows(self, count=12):
        return [{"rank": i, "user_id": str(i), "username": f"Player {i}",
                 "completed_levels": 200 - i, "private_field": "never expose"}
                for i in range(1, count + 1)]

    def response(self, rows):
        payload = {"entries": rows, "total": len(rows), "start_rank": 1, "next_rank": None} if isinstance(rows, list) else rows
        return Mock(status_code=200, json=Mock(return_value=payload))

    @patch("services.game_leaderboards.requests.get")
    def test_all_page_entries_and_identity_without_launch_side_effects(self, send):
        send.return_value = self.response(self.rows())
        result = get_game_leaderboard("chessmater", self.user)
        self.assertEqual(result["metric"], "completed_levels")
        self.assertEqual(len(result["entries"]), 12)
        self.assertEqual([r["rank"] for r in result["entries"] if r["is_current_user"]], [6])
        self.assertNotIn("private_field", result["entries"][0])
        args, kwargs = send.call_args
        self.assertEqual(args[0], "https://game.example.test/leaderboard")
        self.assertEqual(kwargs["params"], {"mode": "completed", "includeMe": "1", "paged": "1", "startRank": 1})
        self.assertFalse(kwargs["allow_redirects"])
        token = kwargs["headers"]["Authorization"].removeprefix("Bearer ")
        claims = jwt.decode(token, "leaderboard-isolated-test-secret", algorithms=["HS256"],
                            audience="chessmater", issuer="main-portal")
        self.assertEqual(claims["user_id"], 6)
        self.assertEqual(claims["username"], "reader")

    @patch("services.game_leaderboards.requests.get")
    def test_current_user_is_not_added_outside_requested_page(self, send):
        send.return_value = self.response(self.rows())
        self.user.id = 200
        result = get_game_leaderboard("chessmater", self.user)
        self.assertEqual(len(result["entries"]), 12)
        self.assertFalse(any(r["is_current_user"] for r in result["entries"]))

    @patch("services.game_leaderboards.requests.get")
    def test_empty_and_short_boards(self, send):
        for count in (0, 2):
            send.return_value = self.response(self.rows(count))
            self.assertEqual(len(get_game_leaderboard("chessmater", self.user)["entries"]), count)

    @patch("services.game_leaderboards.requests.get")
    def test_bad_payloads_and_upstream_failures(self, send):
        import requests
        for payload in ({"entries": []}, [None], [{**self.rows(1)[0], "rank": 2}],
                        [{**self.rows(1)[0], "completed_levels": True}],
                        [{**self.rows(1)[0], "completed_levels": 0}],
                        [{**self.rows(1)[0], "user_id": "unknown"}]):
            send.return_value = self.response(payload)
            with self.subTest(payload=payload), self.assertRaises(HTTPException) as error:
                get_game_leaderboard("chessmater", self.user)
            self.assertEqual(error.exception.status_code, 502)
        for status in (302, 401, 500):
            send.return_value = Mock(status_code=status)
            with self.assertRaises(HTTPException) as error:
                get_game_leaderboard("chessmater", self.user)
            self.assertEqual(error.exception.status_code, 502)
        send.side_effect = requests.Timeout()
        with self.assertRaises(HTTPException) as error:
            get_game_leaderboard("chessmater", self.user)
        self.assertEqual(error.exception.status_code, 502)

    @patch("services.game_leaderboards.requests.get")
    def test_unsupported_games_and_missing_config_do_not_send_requests(self, send):
        with self.assertRaises(HTTPException) as error:
            get_game_leaderboard("sudoku", self.user)
        self.assertEqual(error.exception.status_code, 404)
        for settings in ({"CHESSMATER_JWT_SECRET": ""}, {"CHESSMATER_API_URL": "file:///etc/passwd"}):
            with patch.dict(os.environ, settings), self.assertRaises(HTTPException) as error:
                get_game_leaderboard("chessmater", self.user)
            self.assertEqual(error.exception.status_code, 503)
        send.assert_not_called()

    def test_route_authentication_and_private_cache(self):
        app = FastAPI()
        app.include_router(router, prefix="/api/games")
        with TestClient(app) as client, patch("routes.game_leaderboard_routes.get_game_leaderboard", return_value={"metric": "completed_levels", "entries": []}) as lookup:
            self.assertEqual(client.get("/api/games/chessmater/leaderboard").status_code, 401)
            lookup.assert_not_called()
            app.dependency_overrides[get_current_active_user] = lambda: self.user
            response = client.get("/api/games/chessmater/leaderboard")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["cache-control"], "no-store")
            lookup.assert_called_once_with("chessmater", self.user)
            lookup.reset_mock()
            self.assertEqual(client.get("/api/games/chessmater/leaderboard?start_rank=101").status_code, 200)
            lookup.assert_called_once_with("chessmater", self.user)

    @patch("services.game_leaderboards.requests.get")
    def test_top_hundred_cap_and_no_extra_current_user_row(self, send):
        first = self.rows(100)
        self.user.id = 115
        send.return_value = Mock(status_code=200, json=Mock(return_value={
            "entries": first, "total": 125, "start_rank": 1, "next_rank": 101,
            "current_user": {"rank": 115, "user_id": "115"},
        }))
        result = get_game_leaderboard("chessmater", self.user)
        self.assertEqual(len(result["entries"]), 100)
        self.assertNotIn("next_rank", result)
        self.assertNotIn("current_user", result)
        self.assertFalse(any(row["is_current_user"] for row in result["entries"]))
        send.assert_called_once()
        self.assertEqual(send.call_args.kwargs["params"]["startRank"], 1)


if __name__ == "__main__":
    unittest.main()
