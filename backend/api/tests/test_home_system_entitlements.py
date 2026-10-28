"""Business rules for temporary membership cosmetics and permanent ownership."""

import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from utils.home_system_entitlements import membership_cosmetic_item_ids, sanitize_cosmetic_loadout


class CosmeticEntitlementTests(unittest.TestCase):
    now = datetime(2026, 10, 7, tzinfo=timezone.utc)
    holiday = "head-thanksgiving-headpiece"
    limited = "limited-jindouyun-monkey"

    def user(self, plan, expires):
        return SimpleNamespace(membership_plan=plan, membership_expires_at=expires)

    def test_both_paid_plans_include_holiday_and_exclude_retired_monkey(self):
        for plan in ("plus", "premium"):
            access = membership_cosmetic_item_ids(self.user(plan, self.now + timedelta(days=1)), self.now)
            self.assertIn(self.holiday, access)
            self.assertNotIn(self.limited, access)
            self.assertNotIn("head-wizard-hat", access)
            self.assertNotIn("background-fireworks", access)

    def test_free_plan_gets_no_membership_access(self):
        self.assertFalse(membership_cosmetic_item_ids(self.user("free", self.now + timedelta(days=1)), self.now))

    def test_wukoo_event_set_is_available_to_both_paid_plans(self):
        loadout = {
            "head": "head-wukoo-circlet",
            "body": "body-wukoo-cloud",
            "hand": "hand-wukoo-staff",
        }
        for plan in ("plus", "premium"):
            access = membership_cosmetic_item_ids(self.user(plan, self.now + timedelta(days=1)), self.now)
            self.assertTrue(set(loadout.values()).issubset(access))
            self.assertNotIn("head-tech-goggles", access)
            self.assertEqual(loadout, sanitize_cosmetic_loadout(loadout, set(), access))
        self.assertEqual(dict.fromkeys(loadout), sanitize_cosmetic_loadout(loadout, set(), set()))

    def test_access_ends_at_expiry_for_naive_and_aware_dates(self):
        for expiry in (self.now, self.now.replace(tzinfo=None), self.now - timedelta(seconds=1)):
            self.assertFalse(membership_cosmetic_item_ids(self.user("premium", expiry), self.now))

    def test_membership_equipment_does_not_require_permanent_ownership(self):
        loadout = {"head": self.holiday, "background": "background-green-free"}
        self.assertEqual(loadout, sanitize_cosmetic_loadout(loadout, set(), {self.holiday}))

    def test_expiry_removes_borrowed_equipment_and_keeps_purchases(self):
        loadout = {"head": self.holiday, "body": "body-fireworks-outfit", "background": "background-green-free"}
        actual = sanitize_cosmetic_loadout(loadout, {self.holiday}, set())
        self.assertEqual(actual, {"head": self.holiday, "body": None, "background": "background-green-free"})
        self.assertEqual(loadout["body"], "body-fireworks-outfit")

    def test_free_user_can_equip_a_purchased_holiday_item(self):
        loadout = {"head": self.holiday}
        self.assertEqual(loadout, sanitize_cosmetic_loadout(loadout, {self.holiday}, set()))

    def test_retired_monkey_is_removed_even_when_owned(self):
        self.assertEqual({"limited": None}, sanitize_cosmetic_loadout(
            {"limited": self.limited}, {self.limited}, set()
        ))

    def test_renewal_restores_temporary_access(self):
        user = self.user("plus", self.now - timedelta(days=1))
        self.assertFalse(membership_cosmetic_item_ids(user, self.now))
        user.membership_expires_at = self.now + timedelta(days=30)
        self.assertIn(self.holiday, membership_cosmetic_item_ids(user, self.now))

    def test_wrong_slot_and_unknown_item_are_removed(self):
        self.assertEqual({"head": None, "hand": None}, sanitize_cosmetic_loadout(
            {"head": self.limited, "hand": "missing"}, {self.limited, "missing"}, set()
        ))


if __name__ == "__main__":
    unittest.main()
