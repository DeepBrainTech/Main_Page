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
} from "@/services/userApi";

type MembershipErrorKey =
  | "loadFailed"
  | "checkoutFailed"
  | "portalFailed"
  | "portalUnavailable"
  | "portalNotAvailable"
  | "stripeNotConfigured"
  | "alreadySubscribed"
  | "saveFailed"
  | "stripeChangeFailed"
  | "subscriptionNoChange"
  | "planSwitchNeedResume"
  | "generic";

export default function MembershipPage() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("membership");

  const [currentPlan, setCurrentPlan] = useState<MembershipPlan>("free");
  const [currentBillingInterval, setCurrentBillingInterval] = useState<MembershipBillingInterval | null>(null);
  const [billingInterval, setBillingInterval] = useState<MembershipBillingInterval>("monthly");
  const [loadError, setLoadError] = useState<MembershipErrorKey | null>(null);
  const [successMessage, setSuccessMessage] = useState<
    "checkoutSuccess" | "portalReturn" | "planChangeUpdated" | "planChangeScheduled" | null
  >(null);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);
  const [membershipPeriodEndIso, setMembershipPeriodEndIso] = useState<string | null>(null);
  const [subscriptionCancelAtPeriodEnd, setSubscriptionCancelAtPeriodEnd] = useState<boolean | null>(null);
  const [pendingPlan, setPendingPlan] = useState<"plus" | "premium" | null>(null);
  const [pendingBillingInterval, setPendingBillingInterval] = useState<MembershipBillingInterval | null>(null);
  const [pendingEffectiveAtIso, setPendingEffectiveAtIso] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [m, st] = await Promise.all([fetchAuthMeMembership(), fetchBillingStatus()]);
      const p = m.membership_plan;
      if (p === "free" || p === "plus" || p === "premium") {
        setCurrentPlan(p);
      }
      const activeInterval = m.membership_billing_interval === "annual" ? "annual" : "monthly";
      setCurrentBillingInterval(activeInterval);
      setHasStripeSubscription(Boolean(m.stripe_subscription_id));
      setCheckoutEnabled(st.checkout_enabled);
      setPortalEnabled(st.portal_enabled);
      setMembershipPeriodEndIso(m.membership_expires_at);
      setSubscriptionCancelAtPeriodEnd(st.subscription_cancel_at_period_end);
      const nextPlan =
        st.pending_plan ?? (m.membership_pending_plan === "plus" || m.membership_pending_plan === "premium" ? m.membership_pending_plan : null);
      const nextInterval =
        st.pending_billing_interval ??
        (m.membership_pending_billing_interval === "monthly" || m.membership_pending_billing_interval === "annual"
          ? m.membership_pending_billing_interval
          : null);
      setPendingPlan(nextPlan);
      setPendingBillingInterval(nextInterval);
      setPendingEffectiveAtIso(st.pending_effective_at ?? m.membership_pending_effective_at);
      setBillingInterval(nextInterval ?? activeInterval);
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
      if (plan !== "plus" && plan !== "premium") {
        await openBillingPortal();
        return;
      }
      setLoadError(null);
      setSuccessMessage(null);
      setRedirecting(true);
      try {
        const result = await changeStripeSubscription({
          plan,
          billing_interval: billingInterval,
          locale,
        });
        if (result.action === "payment_pending" && result.hosted_invoice_url) {
          window.location.href = result.hosted_invoice_url;
          return;
        }
        await loadAll();
        window.dispatchEvent(new Event("membership-plan-change"));
        setSuccessMessage(result.action === "scheduled" ? "planChangeScheduled" : "planChangeUpdated");
      } catch (e) {
        const detail = e instanceof Error ? e.message : "request_failed";
        setLoadError(membershipErrorKeyFromDetail(detail) as MembershipErrorKey);
      } finally {
        setRedirecting(false);
      }
      return;
    }
    if (plan === "plus" || plan === "premium") {
      await handleSubscribe(plan);
    }
  };

  const hasNotice = Boolean(successMessage || loadError || (hasStripeSubscription && !portalEnabled));
  const notice = hasNotice ? (
    <div className="space-y-2">
      {successMessage ? (
        <p className="mx-auto max-w-2xl rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700" role="status">
          {t(successMessage)}
        </p>
      ) : null}
      {loadError ? (
        <p className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600" role="alert">
          {t(`errors.${loadError}`)}
        </p>
      ) : null}
      {hasStripeSubscription && !portalEnabled ? (
        <p className="mx-auto max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-700" role="status">
          {t("portalNotAvailable")}
        </p>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <MembershipPlans
        currentPlan={currentPlan}
        currentBillingInterval={currentBillingInterval}
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
        pendingPlan={pendingPlan}
        pendingBillingInterval={pendingBillingInterval}
        pendingEffectiveAtIso={pendingEffectiveAtIso}
        notice={notice}
      />
    </div>
  );
}
