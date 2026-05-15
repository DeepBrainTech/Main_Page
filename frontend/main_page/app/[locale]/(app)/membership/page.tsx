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
  previewStripeSubscriptionChange,
  type StripeSubscriptionChangePreview,
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
  const [changePreview, setChangePreview] = useState<StripeSubscriptionChangePreview | null>(null);
  const [confirmingChange, setConfirmingChange] = useState(false);

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
        const preview = await previewStripeSubscriptionChange({
          plan,
          billing_interval: billingInterval,
          locale,
        });
        setChangePreview(preview);
      } catch (e) {
        const detail = e instanceof Error ? e.message : "request_failed";
        const key = membershipErrorKeyFromDetail(detail);
        setLoadError((key === "generic" ? "stripeChangeFailed" : key) as MembershipErrorKey);
      } finally {
        setRedirecting(false);
      }
      return;
    }
    if (plan === "plus" || plan === "premium") {
      await handleSubscribe(plan);
    }
  };

  const confirmPlanChange = async () => {
    if (!changePreview) return;
    setLoadError(null);
    setSuccessMessage(null);
    setConfirmingChange(true);
    try {
      const result = await changeStripeSubscription({
        plan: changePreview.plan,
        billing_interval: changePreview.billing_interval,
        locale,
        proration_date: changePreview.proration_date,
      });
        if (result.action === "payment_pending" && result.hosted_invoice_url) {
          window.location.href = result.hosted_invoice_url;
          return;
        }
      setChangePreview(null);
        await loadAll();
        window.dispatchEvent(new Event("membership-plan-change"));
        setSuccessMessage(result.action === "scheduled" ? "planChangeScheduled" : "planChangeUpdated");
      } catch (e) {
        const detail = e instanceof Error ? e.message : "request_failed";
        const key = membershipErrorKeyFromDetail(detail);
        setLoadError((key === "generic" ? "stripeChangeFailed" : key) as MembershipErrorKey);
      } finally {
      setConfirmingChange(false);
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
      {changePreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="w-full max-w-md rounded-lg bg-white p-5 font-app-body shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{t("changeConfirmTitle")}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {t("changeConfirmTarget", {
                    plan: t(`plans.${changePreview.plan}`),
                    interval: t(changePreview.billing_interval === "annual" ? "billingAnnually" : "billingMonthly"),
                  })}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                onClick={() => setChangePreview(null)}
                disabled={confirmingChange}
                aria-label={t("planChangeCloseAria")}
              >
                X
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              {changePreview.action === "immediate" ? (
                <>
                  <div className="text-sm text-slate-600">{t("changeDueToday")}</div>
                  <div className="mt-1 text-3xl font-bold text-slate-950">{changePreview.amount_due_display}</div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{t("changeImmediateHint")}</p>
                </>
              ) : (
                <>
                  <div className="text-sm text-slate-600">{t("changeDueToday")}</div>
                  <div className="mt-1 text-3xl font-bold text-slate-950">{changePreview.amount_due_display}</div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {t("changeScheduledHint", { date: changePreview.effective_at ? new Date(changePreview.effective_at).toLocaleDateString() : "" })}
                  </p>
                </>
              )}
            </div>

            {changePreview.lines.length > 0 ? (
              <div className="mt-4 max-h-40 overflow-auto rounded-lg border border-slate-200">
                {changePreview.lines.map((line, index) => (
                  <div key={`${line.description}-${index}`} className="flex justify-between gap-3 border-b border-slate-100 px-3 py-2 text-xs last:border-b-0">
                    <span className="text-slate-600">{line.description || t("changeLineItem")}</span>
                    <span className="shrink-0 font-semibold text-slate-900">{line.amount_display}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="h-11 flex-1 rounded-full border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={() => setChangePreview(null)}
                disabled={confirmingChange}
              >
                {t("changeCancel")}
              </button>
              <button
                type="button"
                className="h-11 flex-1 rounded-full bg-sky-700 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                onClick={() => void confirmPlanChange()}
                disabled={confirmingChange}
              >
                {confirmingChange ? t("changeConfirming") : t("changeConfirmButton")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
