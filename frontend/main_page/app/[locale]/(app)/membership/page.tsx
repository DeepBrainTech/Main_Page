"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import MembershipPlans, {
  type MembershipBillingInterval,
  type MembershipPlan,
} from "@/components/features/membership/MembershipPlans";
import {
  createStripeBillingPortalSession,
  createStripeCheckoutSession,
  fetchAuthMeMembership,
  fetchBillingStatus,
  membershipErrorKeyFromDetail,
} from "@/services/userApi";

type MembershipErrorKey =
  | "loadFailed"
  | "checkoutFailed"
  | "portalFailed"
  | "portalUnavailable"
  | "portalNotAvailable"
  | "stripeNotConfigured"
  | "alreadySubscribed"
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
  const [successMessage, setSuccessMessage] = useState<"checkoutSuccess" | "portalReturn" | null>(null);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);
  const [membershipPeriodEndIso, setMembershipPeriodEndIso] = useState<string | null>(null);
  const [subscriptionCancelAtPeriodEnd, setSubscriptionCancelAtPeriodEnd] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [m, st] = await Promise.all([fetchAuthMeMembership(), fetchBillingStatus()]);
      const p = m.membership_plan;
      if (p === "free" || p === "plus" || p === "premium") {
        setCurrentPlan(p);
      }
      setBillingInterval(m.membership_billing_interval === "annual" ? "annual" : "monthly");
      setHasStripeSubscription(Boolean(m.stripe_subscription_id));
      setCheckoutEnabled(st.checkout_enabled);
      setPortalEnabled(st.portal_enabled);
      setMembershipPeriodEndIso(m.membership_expires_at);
      setSubscriptionCancelAtPeriodEnd(st.subscription_cancel_at_period_end);
      setLoadError(null);
    } catch {
      setLoadError("loadFailed");
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const portal = searchParams.get("portal");
    if (checkout === "success") {
      setSuccessMessage("checkoutSuccess");
      void loadAll();
      window.dispatchEvent(new Event("membership-plan-change"));
      router.replace(pathname);
    } else if (checkout === "canceled") {
      void loadAll();
      router.replace(pathname);
    } else if (portal === "return") {
      setSuccessMessage("portalReturn");
      void loadAll();
      window.dispatchEvent(new Event("membership-plan-change"));
      router.replace(pathname);
    }
  }, [searchParams, loadAll, router, pathname]);

  const openBillingPortal = useCallback(async () => {
    if (!portalEnabled) {
      setLoadError("stripeNotConfigured");
      return;
    }
    setLoadError(null);
    setRedirecting(true);
    try {
      const url = await createStripeBillingPortalSession(locale);
      window.location.href = url;
    } catch (e) {
      const detail = e instanceof Error ? e.message : "request_failed";
      if (process.env.NODE_ENV === "development") {
        console.error("[billing portal]", detail);
      }
      setLoadError(membershipErrorKeyFromDetail(detail) as MembershipErrorKey);
      setRedirecting(false);
    }
  }, [locale, portalEnabled]);

  const handleSubscribe = async (plan: "plus" | "premium") => {
    setLoadError(null);
    setSuccessMessage(null);
    if (!checkoutEnabled) {
      setLoadError("stripeNotConfigured");
      return;
    }
    setRedirecting(true);
    try {
      const url = await createStripeCheckoutSession({
        plan,
        billing_interval: billingInterval,
        locale,
      });
      window.location.href = url;
    } catch (e) {
      const detail = e instanceof Error ? e.message : "request_failed";
      setLoadError(membershipErrorKeyFromDetail(detail) as MembershipErrorKey);
      setRedirecting(false);
    }
  };

  const handlePlanAction = async (plan: MembershipPlan) => {
    if (hasStripeSubscription) {
      await openBillingPortal();
      return;
    }
    if (plan === "plus" || plan === "premium") {
      await handleSubscribe(plan);
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
      {hasStripeSubscription && !portalEnabled ? (
        <p className="text-center text-sm text-amber-700" role="status">
          {t("portalNotAvailable")}
        </p>
      ) : null}
      <MembershipPlans
        currentPlan={currentPlan}
        billingInterval={billingInterval}
        onBillingIntervalChange={setBillingInterval}
        onSubscribe={handleSubscribe}
        onManageBilling={openBillingPortal}
        onPlanAction={handlePlanAction}
        hasStripeSubscription={hasStripeSubscription}
        portalEnabled={portalEnabled}
        checkoutEnabled={checkoutEnabled}
        redirecting={redirecting}
        membershipPeriodEndIso={membershipPeriodEndIso}
        subscriptionCancelAtPeriodEnd={subscriptionCancelAtPeriodEnd}
      />
    </div>
  );
}
