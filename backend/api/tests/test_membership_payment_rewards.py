"""Paid membership invoice rewards are atomic and replay-safe."""

import os
import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///membership-test-bootstrap-unused.db"}):
    from models import AssetTransaction, User, UserNotification, UserRewards
    from services.membership_rewards import grant_membership_payment_coins
    from services.stripe_events import stripe_webhook
    from services.subscriptions import _resolve_user_for_invoice, billing_status


class MembershipPaymentRewardTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        for model in (User, UserRewards, AssetTransaction, UserNotification):
            model.__table__.create(self.engine)
        self.db = Session(self.engine)
        self.user = User(id=1, username="membership-test", email="member@example.test", membership_plan="free")
        self.db.add(self.user)
        self.db.commit()
        self.prices = patch("services.membership_rewards.price_id_index", return_value={
            "price_plus": ("plus", "monthly"),
            "price_premium": ("premium", "annual"),
        })
        self.prices.start()
        self.addCleanup(self.prices.stop)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def invoice(self, invoice_id="in_first", plan="plus", **overrides):
        return {
            "id": invoice_id,
            "status": "paid",
            "amount_paid": 499,
            "billing_reason": "subscription_create",
            "lines": {"data": [{"price": {"id": "price_" + plan}}]},
            **overrides,
        }

    def grant(self, invoice):
        grant_membership_payment_coins(self.db, self.user, invoice)
        self.db.commit()

    def test_initial_and_each_renewal_grant_once_per_invoice(self):
        for plan, amount in (("plus", 5000), ("premium", 10000)):
            for reason in ("subscription_create", "subscription_cycle"):
                invoice = self.invoice(plan + reason, plan, billing_reason=reason)
                self.grant(invoice)
                self.grant(invoice)
        self.assertEqual(self.db.query(UserRewards).one().coins, 30000)
        self.assertEqual(self.db.query(AssetTransaction).count(), 4)

    def test_trial_zero_value_failed_manual_and_plan_change_invoices_do_not_grant(self):
        for overrides in (
            {"amount_paid": 0}, {"status": "open"},
            {"billing_reason": "manual"}, {"billing_reason": "subscription_update"},
        ):
            self.grant(self.invoice(**overrides))
        self.assertEqual(self.db.query(AssetTransaction).count(), 0)

    def test_invoice_price_wins_over_current_membership_and_supports_new_price_shape(self):
        self.user.membership_plan = "plus"
        self.grant(self.invoice(lines={"data": [{
            "pricing": {"price_details": {"price": "price_premium"}},
        }]}))
        self.assertEqual(self.db.query(UserRewards).one().coins, 10000)

    def test_unknown_prices_and_prorations_do_not_grant(self):
        for line in (
            {"price": {"id": "unrelated_price"}},
            {"price": {"id": "price_plus"}, "proration": True},
            {"price": {"id": "price_plus"}, "parent": {"subscription_item_details": {"proration": True}}},
        ):
            self.grant(self.invoice(lines={"data": [line]}))
        self.assertEqual(self.db.query(AssetTransaction).count(), 0)

    def test_rollback_allows_safe_retry_without_losing_reward(self):
        grant_membership_payment_coins(self.db, self.user, self.invoice())
        self.db.rollback()
        self.assertEqual(self.db.query(AssetTransaction).count(), 0)
        self.grant(self.invoice())
        self.assertEqual(self.db.query(UserRewards).one().coins, 5000)
        self.assertEqual(self.db.query(AssetTransaction).count(), 1)

    def test_paginated_invoice_uses_full_line_items(self):
        with patch("services.membership_rewards.stripe.Invoice.list_lines") as lines:
            lines.return_value.auto_paging_iter.return_value = [{"price": "price_plus"}]
            self.grant(self.invoice(lines={"data": [], "has_more": True}))
            lines.assert_called_once_with("in_first", limit=100)
        self.assertEqual(self.db.query(UserRewards).one().coins, 5000)

    def test_paid_webhook_grants_initial_payment_and_renewal_without_duplicate_credit(self):
        async def body():
            return b"test-webhook"

        request = SimpleNamespace(body=body, headers={"stripe-signature": "test"})
        with (
            patch("services.stripe_events.get_stripe_webhook_secret", return_value="test"),
            patch("services.stripe_events._stripe_configure"),
            patch("services.stripe_events._resolve_user_for_invoice", return_value=self.user),
            patch("services.stripe_events.create_user_notification"),
            patch("services.stripe_events.stripe.Webhook.construct_event") as construct,
        ):
            for reason in ("subscription_create", "subscription_cycle"):
                for retry in range(2):
                    construct.return_value = {
                        "id": f"evt_{reason}_{retry}", "type": "invoice.paid",
                        "data": {"object": self.invoice(reason, billing_reason=reason)},
                    }
                    asyncio.run(stripe_webhook(request, self.db))
        self.assertEqual(self.db.query(UserRewards).one().coins, 10000)
        self.assertEqual(self.db.query(AssetTransaction).count(), 2)

    def test_new_invoice_subscription_shape_resolves_user_before_checkout_event(self):
        self.user.stripe_subscription_id = "sub_member"
        self.db.commit()
        invoice = {"parent": {"subscription_details": {"subscription": "sub_member"}}}
        self.assertEqual(_resolve_user_for_invoice(self.db, invoice).id, self.user.id)

    def test_billing_status_recovers_membership_before_checkout_webhook(self):
        self.user.stripe_customer_id = "cus_member"
        self.user.membership_trial_used = True
        self.db.commit()
        subscription = SimpleNamespace(
            id="sub_member", status="active", customer="cus_member", schedule=None,
            metadata={"user_id": str(self.user.id)}, current_period_end=2000000000,
            cancel_at_period_end=False,
        )
        with (
            patch("services.subscriptions.is_stripe_billing_configured", return_value=True),
            patch("services.subscriptions._stripe_configure"),
            patch("services.subscriptions._user_eligible_for_membership_trial", return_value=False),
            patch("services.subscriptions._resolve_plan_from_subscription", return_value=("plus", "monthly")),
            patch("services.subscriptions.stripe.Subscription.list") as subscriptions,
            patch("services.subscriptions.stripe.Subscription.retrieve", return_value=subscription),
        ):
            subscriptions.return_value.auto_paging_iter.return_value = [subscription]
            result = asyncio.run(billing_status(self.user, self.db))
        self.assertEqual(self.user.membership_plan, "plus")
        self.assertEqual(self.user.stripe_subscription_id, "sub_member")
        self.assertTrue(result.data["has_stripe_subscription"])

    def test_billing_status_does_not_adopt_another_users_subscription(self):
        self.user.stripe_customer_id = "cus_member"
        self.user.membership_trial_used = True
        self.db.commit()
        with (
            patch("services.subscriptions.is_stripe_billing_configured", return_value=True),
            patch("services.subscriptions._stripe_configure"),
            patch("services.subscriptions._user_eligible_for_membership_trial", return_value=False),
            patch("services.subscriptions.stripe.Subscription.list") as subscriptions,
        ):
            subscriptions.return_value.auto_paging_iter.return_value = [SimpleNamespace(
                status="active", metadata={"user_id": "999"},
            )]
            result = asyncio.run(billing_status(self.user, self.db))
        self.assertEqual(self.user.membership_plan, "free")
        self.assertFalse(result.data["has_stripe_subscription"])


if __name__ == "__main__":
    unittest.main()
