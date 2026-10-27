"""Progress isolation and once-only signed achievement notifications."""

from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from jose import jwt

from test_chessmater_hint_tickets import CommerceFixture, UserNotification
from services.game_achievements import get_game_achievements, receive_achievement_events
from routes.game_achievement_routes import router
from auth import get_current_active_user
from database import get_db


class GameAchievementTests(CommerceFixture):
    def setUp(self):
        super().setUp()
        self.secret_settings = patch.dict('os.environ', {"CHESSMATER_REWARD_SECRET": ""})
        self.secret_settings.start()
        self.addCleanup(self.secret_settings.stop)

    def token(self, **overrides):
        claims = {"user_id": "1", "purpose": "achievement-unlocks",
                  "achievements": [{"group": "records", "tier": 0, "target": 10, "rule_version": 2}],
                  "exp": datetime.now(timezone.utc) + timedelta(minutes=1),
                  "aud": "chessmater-achievements", "iss": "chessmater-game", **overrides}
        return jwt.encode(claims, "isolated-inventory-test-secret", algorithm="HS256")

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
            self.assertEqual(get_game_achievements('chessmater', self.user)['values'], values)
            claims = jwt.get_unverified_claims(send.call_args.kwargs['headers']['Authorization'][7:])
            self.assertEqual(str(claims['user_id']), '1')
            for invalid in [{}, None, {"gameKey": "chessmater", "values": {**values, "records": True}},
                            {"gameKey": "chessmater", "values": {**values, "moves": -1}}]:
                send.return_value = Mock(status_code=200, json=lambda: invalid)
                with self.assertRaises(HTTPException) as error:
                    get_game_achievements('chessmater', self.user)
                self.assertEqual(error.exception.status_code, 502)

    def test_read_requires_login_and_delivery_requires_game_signature(self):
        app = FastAPI()
        app.include_router(router, prefix='/api/games')
        app.dependency_overrides[get_db] = lambda: self.db
        with TestClient(app) as client:
            self.assertEqual(client.get('/api/games/chessmater/achievements').status_code, 401)
            self.assertEqual(client.post('/api/games/chessmater/achievements/events').status_code, 401)
            app.dependency_overrides[get_current_active_user] = lambda: self.user
            with patch('routes.game_achievement_routes.get_game_achievements', return_value={"gameKey": "chessmater", "values": {}}):
                response = client.get('/api/games/chessmater/achievements')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.headers['cache-control'], 'no-store')
