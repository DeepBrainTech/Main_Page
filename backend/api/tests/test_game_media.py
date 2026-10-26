"""Media discovery covers isolation, pagination, cache and private access."""

import os
import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from services import game_media


class GameMediaTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {
            "GAME_MEDIA_R2_BUCKET_NAME": "dbt-game",
            "GAME_MEDIA_PUBLIC_BASE_URL": "https://game-media.example.test",
        })
        self.env.start()
        self.addCleanup(self.env.stop)
        game_media._cache.clear()
        self.client = MagicMock()
        self.mock_client = patch.object(game_media, "get_r2_read_only_client", return_value=self.client)
        self.mock_client.start()
        self.addCleanup(self.mock_client.stop)
        self.client.get_paginator.return_value.paginate.return_value = []

    def object(self, key, size=100):
        return {"Key": key, "Size": size}

    def test_pagination_filtering_natural_order_and_public_url_encoding(self):
        self.client.get_paginator.return_value.paginate.side_effect = [
            [
                {"Contents": [self.object("freefall-chess/preview/10.webp"), self.object("freefall-chess/preview/2.webp")]},
                {"Contents": [self.object("freefall-chess/preview/1 first.png"), self.object("freefall-chess/preview/截图.png"),
                              self.object("freefall-chess/preview/empty.png", 0), self.object("freefall-chess/preview/readme.txt"),
                              self.object("freefall-chess/preview/.hidden.png"), self.object("freefall-chess/preview/.hidden/1.png"),
                              self.object("other-game/preview/1.png")]},
            ],
            [{"Contents": [self.object("freefall-chess/video-tutorial/2.MP4"), self.object("freefall-chess/video-tutorial/1.webm"),
                           self.object("freefall-chess/video-tutorial/poster.png"), self.object("freefall-chess/video-tutorial/3.mov")]}],
        ]
        result = game_media.get_game_media("freefall-chess")
        self.assertEqual([item["key"].split("/")[-1] for item in result["previews"]], ["1 first.png", "2.webp", "10.webp", "截图.png"])
        self.assertEqual(result["previews"][0]["url"], "https://game-media.example.test/freefall-chess/preview/1%20first.png")
        self.assertIn("%E6%88%AA%E5%9B%BE", result["previews"][-1]["url"])
        self.assertEqual(len(result["tutorials"]), 2)
        calls = self.client.get_paginator.return_value.paginate.call_args_list
        self.assertEqual([call.kwargs for call in calls], [
            {"Bucket": "dbt-game", "Prefix": "freefall-chess/preview/"},
            {"Bucket": "dbt-game", "Prefix": "freefall-chess/video-tutorial/"},
        ])

    def test_cached_lists_expire_and_do_not_mix_games(self):
        with patch.object(game_media, "monotonic", return_value=100):
            game_media.get_game_media("freefall-chess")
            game_media.get_game_media("freefall-chess")
            self.assertEqual(self.client.get_paginator.return_value.paginate.call_count, 2)
            game_media.get_game_media("fogchess")
            self.assertEqual(self.client.get_paginator.return_value.paginate.call_count, 4)
        with patch.object(game_media, "monotonic", return_value=401):
            game_media.get_game_media("freefall-chess")
            self.assertEqual(self.client.get_paginator.return_value.paginate.call_count, 6)

    def test_private_urls_are_signed_on_each_read_without_rescanning(self):
        os.environ["GAME_MEDIA_PUBLIC_BASE_URL"] = ""
        self.client.get_paginator.return_value.paginate.side_effect = [
            [{"Contents": [self.object("freefall-chess/preview/1.png")]}], [],
        ]
        self.client.generate_presigned_url.side_effect = ["https://signed.test/first", "https://signed.test/second"]
        first = game_media.get_game_media("freefall-chess")
        second = game_media.get_game_media("freefall-chess")
        self.assertNotEqual(first["previews"][0]["url"], second["previews"][0]["url"])
        self.assertEqual(self.client.get_paginator.return_value.paginate.call_count, 2)
        self.assertEqual(self.client.generate_presigned_url.call_args.kwargs["Params"]["Bucket"], "dbt-game")

    def test_unknown_or_traversal_slugs_never_access_storage(self):
        for slug in ["../ai-tutor", "chessmater", "unknown", "freefall-chess/../../"]:
            with self.assertRaises(HTTPException) as caught:
                game_media.get_game_media(slug)
            self.assertEqual(caught.exception.status_code, 404)
        self.client.get_paginator.assert_not_called()

    def test_storage_failure_is_not_cached_and_does_not_leak_details(self):
        self.client.get_paginator.return_value.paginate.side_effect = RuntimeError("private credential detail")
        with self.assertRaises(HTTPException) as caught:
            game_media.get_game_media("freefall-chess")
        self.assertEqual(caught.exception.status_code, 503)
        self.assertEqual(caught.exception.detail, "game_media_unavailable")
        self.assertEqual(game_media._cache, {})

    def test_empty_folder_is_valid_and_uses_shared_read_only_client(self):
        self.assertEqual(game_media.get_game_media("freefall-chess"), {"previews": [], "tutorials": []})
        game_media.get_r2_read_only_client.assert_called_once_with()

    def test_invalid_public_url_is_rejected(self):
        for base in ["http://media.test", "https://", "https://media.test?token=secret"]:
            os.environ["GAME_MEDIA_PUBLIC_BASE_URL"] = base
            with self.assertRaises(HTTPException) as caught:
                game_media.get_game_media("freefall-chess")
            self.assertEqual(caught.exception.status_code, 503)

    def test_missing_credentials_fail_without_accessing_storage(self):
        with patch.object(game_media, "get_r2_read_only_client", side_effect=RuntimeError("missing_env:R2_READ_ONLY_ACCESS_KEY_ID")):
            with self.assertRaises(HTTPException) as caught:
                game_media.get_game_media("freefall-chess")
        self.assertEqual(caught.exception.status_code, 503)
        self.client.get_paginator.assert_not_called()


class GameMediaRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from sqlalchemy import create_engine

        cls.engine = create_engine("sqlite://")
        with patch.dict(os.environ, {"DATABASE_URL": "sqlite://"}), patch("sqlalchemy.create_engine", return_value=cls.engine):
            from routes import game_media_routes

        cls.routes = game_media_routes
        cls.app = FastAPI()
        cls.app.include_router(game_media_routes.router, prefix="/api/games")
        cls.client = TestClient(cls.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.engine.dispose()

    def tearDown(self):
        self.app.dependency_overrides.clear()

    def test_endpoint_requires_authentication_before_storage_access(self):
        with patch.object(self.routes, "get_game_media") as get_media:
            response = self.client.get("/api/games/freefall-chess/media")
        self.assertEqual(response.status_code, 401)
        get_media.assert_not_called()

    def test_endpoint_wraps_media_and_disables_response_caching(self):
        self.app.dependency_overrides[self.routes.get_current_active_user] = lambda: object()
        with patch.object(self.routes, "get_game_media", return_value={"previews": [], "tutorials": []}) as get_media:
            response = self.client.get("/api/games/freefall-chess/media")
        get_media.assert_called_once_with("freefall-chess")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["cache-control"], "private, no-store")
        self.assertEqual(response.json()["data"], {"previews": [], "tutorials": []})


if __name__ == "__main__":
    unittest.main()
