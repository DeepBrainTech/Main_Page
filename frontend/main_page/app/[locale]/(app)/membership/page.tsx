"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import MembershipPlans, {
  type MembershipBillingInterval,
  type MembershipPlan,
} from "@/components/features/membership/MembershipPlans";
import {
  changeStripeSubscription,
  createStripeBillingPortalSession,
  createStripeCheckoutSession,
  fetchAuthMeMembership,
  fetchBillingStatus,
  membershipErrorKeyFromDetail,
  updateMembershipPlan,
} from "@/services/userApi";

type MembershipErrorKey =
  | "loadFailed"
  | "saveFailed"
  | "checkoutFailed"
  | "portalFailed"
  | "cancelViaPortal"
  | "stripeNotConfigured"
  | "alreadySubscribed"
  | "stripeChangeFailed"
  | "subscriptionNoChange"
  | "generic";

export default function MembershipPage() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("membership");

  const [currentPlan, setCurrentPlan] = useState<MembershipPlan>("free");
  const [billingInterval, setBillingInterval] = useState<MembershipBillingInterval>("monthly");
  const [loadError, setLoadError] = useState<MembershipErrorKey | null>(null);
  const [successMessage, setSuccessMessage] = useState<"checkoutSuccess" | "planChangeSuccess" | null>(null);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [m, st] = await Promise.all([fetchAuthMeMembership(), fetchBillingStatus()]);
      const p = m.membership_plan;
      if (p === "free" || p === "plus" || p === "premium") {
        setCurrentPlan(p);
      }
      setBillingInterval(m.membership_billing_interval === "annual" ? "annual" : "monthly");
      setCheckoutEnabled(st.checkout_enabled);
      setHasStripeSubscription(Boolean(m.stripe_subscription_id));
      setLoadError(null);
    } catch {
      setLoadError("loadFailed");
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const c = searchParams.get("checkout");
    if (c === "success") {
      setSuccessMessage("checkoutSuccess");
      void loadAll();
      window.dispatchEvent(new Event("membership-plan-change"));
      router.replace(pathname);
    } else if (c === "canceled") {
      void loadAll();
      router.replace(pathname);
    }
  }, [searchParams, loadAll, router, pathname]);

  const handlePlanChange = async (plan: MembershipPlan) => {
    setLoadError(null);
    setSuccessMessage(null);
    try {
      if (plan === "free") {
        if (hasStripeSubscription) {
          const url = await createStripeBillingPortalSession(locale);
          window.location.href = url;
          return;
        }
        await updateMembershipPlan(plan, "monthly");
        setCurrentPlan(plan);
        setBillingInterval("monthly");
        window.dispatchEvent(new Event("membership-plan-change"));
        return;
      }

      if ((plan === "plus" || plan === "premium") && checkoutEnabled) {
        if (hasStripeSubscription) {
          await changeStripeSubscription({ plan, billing_interval: billingInterval });
          await loadAll();
          setCurrentPlan(plan);
          setSuccessMessage("planChangeSuccess");
          window.dispatchEvent(new Event("membership-plan-change"));
          return;
        }
        const url = await createStripeCheckoutSession({
          plan,
          billing_interval: billingInterval,
          locale,
        });
        window.location.href = url;
        return;
      }

      const interval: MembershipBillingInterval = billingInterval;
      await updateMembershipPlan(plan, interval);
      setCurrentPlan(plan);
      window.dispatchEvent(new Event("membership-plan-change"));
    } catch (e) {
      const detail = e instanceof Error ? e.message : "request_failed";
      const key = membershipErrorKeyFromDetail(detail) as MembershipErrorKey;
      setLoadError(key);
    }
  };

  return (
    <div className="space-y-4">
      {successMessage ? (
        <p className="text-center text-sm font-medium text-emerald-700" role="status">
          {t(successMessage)}
        </p>
      ) : null}
      {loadError ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {t(`errors.${loadError}`)}
        </p>
      ) : null}
      <MembershipPlans
        currentPlan={currentPlan}
        billingInterval={billingInterval}
        onBillingIntervalChange={setBillingInterval}
        onPlanChange={handlePlanChange}
      />
    </div>
  );
}
