"""Membership check-in bonuses stack with daily and streak milestone rewards."""

import asyncio
import os
import unittest
from datetime import date, datetime, timedelta
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///check-in-test-bootstrap-unused.db"}):
    from models import AssetTransaction, User, UserCheckIn, UserRewards
    from services.rewards import do_check_in


class CheckInMembershipRewardTests(unittest.TestCase):
    def test_membership_bonus_stacks_and_duplicate_check_in_grants_nothing(self):
        today = date(2026, 10, 28)
        for streak in (1, 7, 14):
            for plan, expired, bonus in (
                ("free", False, 0),
                ("plus", False, 10),
                ("premium", False, 20),
                ("plus", True, 0),
                ("premium", True, 0),
            ):
                with self.subTest(streak=streak, plan=plan, expired=expired):
                    engine = create_engine("sqlite://")
                    try:
                        for model in (User, UserRewards, UserCheckIn, AssetTransaction):
                            model.__table__.create(engine)
                        with Session(engine, autoflush=False) as db:
                            user = User(
                                id=1, username="check-in-test", email="check-in@example.test",
                                membership_plan=plan,
                                membership_expires_at=datetime.utcnow() + timedelta(days=-1 if expired else 1),
                            )
                            db.add(user)
                            db.add_all([
                                UserCheckIn(user_id=1, check_in_date=(today - timedelta(days=offset)).isoformat())
                                for offset in range(1, streak)
                            ])
                            db.commit()
                            with patch("services.rewards._today_in_tz", return_value=today.isoformat()):
                                result = asyncio.run(do_check_in(user, db, "UTC")).data
                                milestone = streak % 7 == 0
                                coins = 1000 if milestone else 200
                                diamonds = 20 if milestone else 0
                                self.assertEqual(result["coins"], coins)
                                self.assertEqual(result["diamonds"], diamonds)
                                self.assertEqual(result["membership_bonus_plan"], plan if bonus else None)
                                self.assertEqual(result["membership_bonus_coins"], 0)
                                self.assertEqual(result["membership_bonus_diamonds"], bonus)
                                balance = db.query(UserRewards).one()
                                self.assertEqual(balance.coins, coins)
                                self.assertEqual(balance.diamonds, diamonds + bonus)
                                repeated = asyncio.run(do_check_in(user, db, "UTC")).data
                                self.assertEqual(repeated["coins"], 0)
                                self.assertEqual(repeated["diamonds"], 0)
                                self.assertEqual(repeated["membership_bonus_diamonds"], 0)
                                self.assertEqual(db.query(AssetTransaction).count(), 1)
                    finally:
                        engine.dispose()
