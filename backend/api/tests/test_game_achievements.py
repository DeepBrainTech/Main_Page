"""Progress isolation and once-only signed achievement notifications."""

from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from jose import jwt

from test_chessmater_hint_tickets import CommerceFixture, UserNotification
from services.game_achievements import (
    TARGETS, TOURMASTER_TARGETS, get_game_achievements, receive_achievement_events, sync_game_achievements,
)
from routes.game_achievement_routes import router
from auth import get_current_active_user
from database import get_db


class GameAchievementTests(CommerceFixture):
    def setUp(self):
        super().setUp()
        self.secret_settings = patch.dict('os.environ', {
            "CHESSMATER_REWARD_SECRET": "",
            "TOURMASTER_REWARD_SECRET": "isolated-tourmaster-achievement-secret",
            "TOURMASTER_JWT_ALG": "HS256",
        })
        self.secret_settings.start()
        self.addCleanup(self.secret_settings.stop)

    def token(self, **overrides):
        claims = {"user_id": "1", "purpose": "achievement-unlocks",
                  "achievements": [{"group": "records", "tier": 0, "target": 10, "rule_version": 2}],
                  "exp": datetime.now(timezone.utc) + timedelta(minutes=1),
                  "aud": "chessmater-achievements", "iss": "chessmater-game", **overrides}
        return jwt.encode(claims, "isolated-inventory-test-secret", algorithm="HS256")

    def tourmaster_token(self, **overrides):
        claims = {"user_id": "1", "purpose": "achievement-progress", "mode": "classic",
                  "clears": 10, "three_stars": 5, "new_clear": True, "new_three_stars": True,
                  "exp": datetime.now(timezone.utc) + timedelta(minutes=1),
                  "aud": "chess-tourmaster-achievements", "iss": "chess-tourmaster-game", **overrides}
        return jwt.encode(claims, "isolated-tourmaster-achievement-secret", algorithm="HS256")

    def test_tourmaster_notifies_each_new_tier_once_across_modes(self):
        with patch('services.game_achievements.schedule_notification_event') as publish:
            for _ in range(2):
                result = receive_achievement_events(self.db, self.tourmaster_token(), 'chess-tourmaster')
                self.assertEqual(result['accepted'], [{"group": "levels", "tier": 0}, {"group": "noHints", "tier": 0}])
            # A replay improves the stars but does not unlock another clear tier or backfill lower tiers.
            result = receive_achievement_events(self.db, self.tourmaster_token(
                mode="math_tour", clears=20, three_stars=10, new_clear=False), 'chess-tourmaster')
            self.assertEqual(result['accepted'], [{"group": "moves", "tier": 1}])
            # Advancing past a threshold does not notify again.
            result = receive_achievement_events(self.db, self.tourmaster_token(
                clears=11, three_stars=5, new_three_stars=False), 'chess-tourmaster')
            self.assertEqual(result['accepted'], [])
            self.assertEqual(publish.call_count, 2)
        rows = self.db.query(UserNotification).order_by(UserNotification.id).all()
        self.assertEqual([row.source_event_id for row in rows], [
            'chess-tourmaster:achievement:v1:1:levels:0', 'chess-tourmaster:achievement:v1:1:noHints:0',
            'chess-tourmaster:achievement:v1:1:moves:1',
        ])
        self.assertEqual(rows[2].notification_metadata,
                         {"game_key": "chess-tourmaster", "group": "moves", "tier": 1, "target": 10})
        self.assertTrue(all(row.user_id == 1 and not row.is_read for row in rows))

    def test_tourmaster_rejects_non_game_tokens_and_inconsistent_progress(self):
        for overrides in [{"aud": "chess-tourmaster", "iss": "main-portal"}, {"mode": "other"},
                          {"clears": 5, "new_three_stars": False}, {"three_stars": True}, {"new_clear": 1}]:
            with self.subTest(overrides=overrides), self.assertRaises(HTTPException) as error:
                receive_achievement_events(self.db, self.tourmaster_token(**overrides), 'chess-tourmaster')
            self.assertEqual(error.exception.status_code, 401)
        self.assertEqual(self.db.query(UserNotification).count(), 0)

    def test_tourmaster_sync_fills_missing_historical_unlocks_and_shares_delivery_deduplication(self):
        progress = {
            "gameKey": "chess-tourmaster",
            "targets": TOURMASTER_TARGETS,
            "values": {"classicClears": 9, "classicStars": 6, "mathClears": 10, "mathStars": 4},
        }
        with patch('services.game_achievements.get_game_achievements', return_value=progress) as get, \
                patch('services.game_achievements.schedule_notification_event') as publish:
            self.assertEqual(sync_game_achievements(self.db, "chess-tourmaster", self.user), progress)
            get.assert_called_once_with("chess-tourmaster", self.user)
            local_star = self.db.query(UserNotification).filter_by(
                source_event_id='chess-tourmaster:achievement:v1:1:noHints:0'
            ).one()
            local_star.is_read = True
            self.db.commit()
            receive_achievement_events(self.db, self.tourmaster_token(clears=9), 'chess-tourmaster')
            sync_game_achievements(self.db, "chess-tourmaster", self.user)
            publish.assert_called_once_with(self.db, 1)
        rows = self.db.query(UserNotification).all()
        self.assertEqual({row.source_event_id for row in rows}, {
            'chess-tourmaster:achievement:v1:1:noHints:0', 'chess-tourmaster:achievement:v1:1:records:0',
        })
        self.assertTrue(local_star.is_read)

    def test_freefall_sync_backfills_current_versions_without_repeating_live_notifications(self):
        values = {"levels": 12, "records": 10, "noHints": 10, "moves": 49}
        self.db.add(UserNotification(user_id=1, type='game_achievement', title='Historical achievement',
                                    message='Historical message', icon='achievement', is_read=True,
                                    source_event_id='chessmater:achievement:v1:1:records:0'))
        self.db.commit()
        with patch('services.game_achievements.schedule_notification_event') as publish, \
                patch('services.game_achievements.requests.get') as upstream:
            upstream.return_value = Mock(status_code=200, json=lambda: {"gameKey": "chessmater", "values": values})
            receive_achievement_events(self.db, self.token(), 'chessmater')
            for _ in range(2):
                self.assertEqual(sync_game_achievements(self.db, 'chessmater', self.user),
                                 {"gameKey": "chessmater", "targets": TARGETS, "values": values})
            self.assertEqual(publish.call_count, 2)
        rows = self.db.query(UserNotification).all()
        self.assertEqual({row.source_event_id: row.is_read for row in rows}, {
            'chessmater:achievement:v1:1:levels:0': False,
            'chessmater:achievement:v1:1:records:0': True,
            'chessmater:achievement:v2:1:records:0': False,
            'chessmater:achievement:v2:1:noHints:0': False,
        })

    def test_delivery_retries_create_one_notification_with_badge_metadata(self):
        with patch('services.game_achievements.schedule_notification_event') as publish:
            for _ in range(3):
                result = receive_achievement_events(self.db, self.token(), 'chessmater')
                self.assertEqual(result['accepted'], [{"group": "records", "tier": 0}])
            self.assertEqual(publish.call_count, 1)
        rows = self.db.query(UserNotification).all()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].user_id, 1)
        self.assertEqual(rows[0].type, 'game_achievement')
        self.assertEqual(rows[0].notification_metadata,
                         {"game_key": "chessmater", "group": "records", "tier": 0, "target": 10})

    def test_new_tiers_and_accounts_are_independent(self):
        with patch('services.game_achievements.schedule_notification_event'):
            receive_achievement_events(self.db, self.token(), 'chessmater')
            receive_achievement_events(self.db, self.token(user_id='2'), 'chessmater')
            receive_achievement_events(self.db, self.token(achievements=[{"group": "records", "tier": 1, "target": 20, "rule_version": 2}]), 'chessmater')
        self.assertEqual(self.db.query(UserNotification).count(), 3)

    def test_wrong_audience_expired_and_malformed_events_are_rejected(self):
        for overrides in [{"aud": "chessmater"}, {"purpose": "first-clear-reward"}, {"user_id": True},
                          {"exp": datetime.now(timezone.utc) - timedelta(seconds=1)},
                          {"achievements": [{"group": "records", "tier": True, "target": 3}]},
                          {"achievements": [{"group": "records", "tier": 0, "target": 999}]},
                          {"achievements": [{"group": "other", "tier": 0, "target": 1}]}]:
            with self.subTest(overrides=overrides), self.assertRaises(HTTPException) as error:
                receive_achievement_events(self.db, self.token(**overrides), 'chessmater')
            self.assertEqual(error.exception.status_code, 401)
        self.assertEqual(self.db.query(UserNotification).count(), 0)

    def test_old_notifications_do_not_block_new_thresholds_and_legacy_events_are_rejected(self):
        self.db.add(UserNotification(user_id=1, type='game_achievement', title='Historical achievement',
                                    message='Historical message', icon='achievement',
                                    source_event_id='chessmater:achievement:v1:1:records:0'))
        self.db.commit()
        with patch('services.game_achievements.schedule_notification_event'):
            receive_achievement_events(self.db, self.token(), 'chessmater')
        self.assertEqual(self.db.query(UserNotification).count(), 2)
        self.assertEqual(self.db.query(UserNotification).filter_by(source_event_id='chessmater:achievement:v1:1:records:0').one().title,
                         'Historical achievement')
        with self.assertRaises(HTTPException):
            receive_achievement_events(self.db, self.token(achievements=[{'group': 'records', 'tier': 0, 'target': 1}]), 'chessmater')
        with patch('services.game_achievements.schedule_notification_event'):
            receive_achievement_events(self.db, self.token(achievements=[{'group': 'moves', 'tier': 0, 'target': 50}]), 'chessmater')
        self.assertEqual(self.db.query(UserNotification).filter_by(source_event_id='chessmater:achievement:v1:1:moves:0').count(), 1)

    @patch('services.game_achievements.requests.get')
    def test_proxy_validates_values_and_uses_current_identity(self, send):
        with patch.dict('os.environ', {"CHESSMATER_API_URL": "https://game.example.test"}):
            values = {"levels": 10, "records": 3, "noHints": 5, "moves": 150}
            send.return_value = Mock(status_code=200, json=lambda: {"gameKey": "chessmater", "values": values})
            progress = get_game_achievements('chessmater', self.user)
            self.assertEqual(progress['values'], values)
            self.assertEqual(progress['targets']['moves'], (50, 150, 500, 1500, 3000))
            claims = jwt.get_unverified_claims(send.call_args.kwargs['headers']['Authorization'][7:])
            self.assertEqual(str(claims['user_id']), '1')
            for invalid in [{}, None, {"gameKey": "chessmater", "values": {**values, "records": True}},
                            {"gameKey": "chessmater", "values": {**values, "moves": -1}}]:
                send.return_value = Mock(status_code=200, json=lambda: invalid)
                with self.assertRaises(HTTPException) as error:
                    get_game_achievements('chessmater', self.user)
                self.assertEqual(error.exception.status_code, 502)

    @patch('services.game_achievements.requests.get')
    @patch('services.game_achievements.create_game_token', return_value=("signed-game-token", 60))
    def test_tourmaster_counts_each_mode_and_each_distinct_level(self, sign, send):
        send.side_effect = [
            Mock(status_code=200, json=lambda: {"success": True, "data": {"levels": [
                {"level": 1, "best_stars": 1}, {"level": 1, "best_stars": 3},
                {"level": 101, "best_stars": 2},
            ]}}),
            Mock(status_code=200, json=lambda: {"success": True, "data": {"levels": [
                {"level": 1, "best_stars": 3}, {"level": 2, "best_stars": 3},
                {"level": 3, "best_stars": 2},
            ]}}),
        ]
        with patch.dict('os.environ', {"TOURMASTER_API_URL": "https://tourmaster.example.test"}):
            self.assertEqual(get_game_achievements('chess-tourmaster', self.user), {
                "gameKey": "chess-tourmaster",
                "values": {"classicClears": 2, "classicStars": 1, "mathClears": 3, "mathStars": 2},
                "targets": {
                    "levels": (10, 20, 30, 40, 50), "records": (10, 20, 30, 40, 50),
                    "noHints": (5, 10, 20, 35, 50), "moves": (5, 10, 20, 35, 50),
                },
            })
        self.assertEqual(sign.call_args.args[0], "chess-tourmaster")
        self.assertEqual(sign.call_args.args[1]["user_id"], self.user.id)
        self.assertEqual([call.kwargs["params"]["game_mode"] for call in send.call_args_list], ["classic", "math_tour"])

    def test_read_requires_login_and_delivery_requires_game_signature(self):
        app = FastAPI()
        app.include_router(router, prefix='/api/games')
        app.dependency_overrides[get_db] = lambda: self.db
        with TestClient(app) as client:
            self.assertEqual(client.get('/api/games/chessmater/achievements').status_code, 401)
            self.assertEqual(client.post('/api/games/chessmater/achievements/events').status_code, 401)
            for game_key in ('chess-tourmaster', 'chessmater'):
                self.assertEqual(client.post(f'/api/games/{game_key}/achievements/sync').status_code, 401)
            app.dependency_overrides[get_current_active_user] = lambda: self.user
            with patch('routes.game_achievement_routes.get_game_achievements', return_value={"gameKey": "chessmater", "values": {}}):
                response = client.get('/api/games/chessmater/achievements')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.headers['cache-control'], 'no-store')
            for game_key in ('chess-tourmaster', 'chessmater'):
                with patch('routes.game_achievement_routes.sync_game_achievements',
                           return_value={"gameKey": game_key, "values": {}}) as sync:
                    response = client.post(f'/api/games/{game_key}/achievements/sync', json={"user_id": 2})
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.headers['cache-control'], 'no-store')
                    sync.assert_called_once_with(self.db, game_key, self.user)
