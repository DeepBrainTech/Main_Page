"use client";

import { useCallback, useEffect, useState } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import MembershipPlans, {
  type MembershipBillingInterval,
  type MembershipPlan,
} from "@/components/features/membership/MembershipPlans";
import {
  cancelScheduledStripeSubscriptionChange,
  changeStripeSubscription,
  createStripeBillingPortalSession,
  createStripeCheckoutSession,
  createStripePaymentMethodSetup,
  fetchAuthMeMembership,
  fetchBillingStatus,
  membershipErrorKeyFromDetail,
  previewStripeSubscriptionChange,
  type StripeSubscriptionChangePreview,
  updateStripeSubscriptionPaymentMethod,
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

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise: Promise<Stripe | null> | null = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface PaymentMethodEditorProps {
  clientSecret: string;
  disabled?: boolean;
  onCancel: () => void;
  onSaved: (paymentMethodId: string) => void | Promise<void>;
}

function PaymentMethodEditor({ clientSecret, disabled = false, onCancel, onSaved }: PaymentMethodEditorProps) {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations("membership");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!stripe || !elements || saving || disabled) return;
    const card = elements.getElement(CardElement);
    if (!card) {
      setError(t("planChangePaymentEditFailed"));
      return;
    }

    setSaving(true);
    setError(null);
    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card },
    });
    if (result.error) {
      setError(result.error.message || t("planChangePaymentEditFailed"));
      setSaving(false);
      return;
    }

    const paymentMethod = result.setupIntent.payment_method;
    const paymentMethodId = typeof paymentMethod === "string" ? paymentMethod : paymentMethod?.id;
    if (!paymentMethodId) {
      setError(t("planChangePaymentEditFailed"));
      setSaving(false);
      return;
    }

    try {
      await onSaved(paymentMethodId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-xs">
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <CardElement
          options={{
            hidePostalCode: true,
            style: {
              base: {
                color: "#0f172a",
                fontFamily: "Arial, sans-serif",
                fontSize: "14px",
                "::placeholder": { color: "#94a3b8" },
              },
              invalid: { color: "#dc2626" },
            },
          }}
        />
      </div>
      <p className="mt-2 leading-5 text-slate-500">{t("planChangePaymentSecurityNote")}</p>
      {error ? <p className="mt-2 leading-5 text-red-600">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="h-9 flex-1 rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          onClick={onCancel}
          disabled={saving || disabled}
        >
          {t("changeCancel")}
        </button>
        <button
          type="button"
          className="h-9 flex-1 rounded-full bg-sky-700 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          onClick={() => void handleSave()}
          disabled={!stripe || saving || disabled}
        >
          {saving ? t("planChangeSavingPaymentMethod") : t("planChangeSavePaymentMethod")}
        </button>
      </div>
    </div>
  );
}

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
    | "checkoutSuccess"
    | "checkoutTrialSuccess"
    | "portalReturn"
    | "planChangeUpdated"
    | "planChangeScheduled"
    | "planChangeScheduleCanceled"
    | null
  >(null);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);
  const [membershipPeriodEndIso, setMembershipPeriodEndIso] = useState<string | null>(null);
  const [subscriptionCancelAtPeriodEnd, setSubscriptionCancelAtPeriodEnd] = useState<boolean | null>(null);
  const [pendingPlan, setPendingPlan] = useState<"plus" | "premium" | null>(null);
  const [pendingBillingInterval, setPendingBillingInterval] = useState<MembershipBillingInterval | null>(null);
  const [pendingEffectiveAtIso, setPendingEffectiveAtIso] = useState<string | null>(null);
  const [trialEligible, setTrialEligible] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<"trialing" | "active" | "past_due" | null>(null);
  const [trialEndAtIso, setTrialEndAtIso] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [changePreview, setChangePreview] = useState<StripeSubscriptionChangePreview | null>(null);
  const [confirmingChange, setConfirmingChange] = useState(false);
  const [paymentSetupClientSecret, setPaymentSetupClientSecret] = useState<string | null>(null);
  const [updatingPaymentMethod, setUpdatingPaymentMethod] = useState(false);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);

  const loadAll = useCallback(async (): Promise<"trialing" | "active" | "past_due" | null> => {
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
      setTrialEligible(st.trial_eligible);
      setSubscriptionStatus(st.subscription_status);
      setTrialEndAtIso(st.trial_end_at);
      // Keep toggle aligned with the *active* subscription so the current plan card matches (pending interval alone is a future state).
      setBillingInterval(activeInterval);
      setLoadError(null);
      return st.subscription_status;
    } catch {
      setLoadError("loadFailed");
      return null;
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const portal = searchParams.get("portal");
    if (checkout === "success") {
      void loadAll().then((status) => {
        setSuccessMessage(status === "trialing" ? "checkoutTrialSuccess" : "checkoutSuccess");
      });
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
        setPaymentSetupClientSecret(null);
        setPaymentMethodError(null);
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

  const handleCancelScheduledPlanChange = async () => {
    setLoadError(null);
    setSuccessMessage(null);
    setRedirecting(true);
    try {
      await cancelScheduledStripeSubscriptionChange();
      await loadAll();
      window.dispatchEvent(new Event("membership-plan-change"));
      setSuccessMessage("planChangeScheduleCanceled");
    } catch (e) {
      const detail = e instanceof Error ? e.message : "request_failed";
      const key = membershipErrorKeyFromDetail(detail);
      setLoadError((key === "generic" ? "stripeChangeFailed" : key) as MembershipErrorKey);
    } finally {
      setRedirecting(false);
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

  const startEditingPaymentMethod = async () => {
    if (!changePreview) return;
    if (!stripePromise) {
      setPaymentMethodError(t("planChangeStripeJsMissing"));
      return;
    }
    setPaymentMethodError(null);
    setUpdatingPaymentMethod(true);
    try {
      const clientSecret = await createStripePaymentMethodSetup();
      setPaymentSetupClientSecret(clientSecret);
    } catch (e) {
      const detail = e instanceof Error ? e.message : "request_failed";
      const key = membershipErrorKeyFromDetail(detail);
      setPaymentMethodError(t(`errors.${key === "generic" ? "stripeChangeFailed" : key}`));
    } finally {
      setUpdatingPaymentMethod(false);
    }
  };

  const savePaymentMethod = async (paymentMethodId: string) => {
    if (!changePreview) return;
    setPaymentMethodError(null);
    setUpdatingPaymentMethod(true);
    try {
      await updateStripeSubscriptionPaymentMethod(paymentMethodId);
      const preview = await previewStripeSubscriptionChange({
        plan: changePreview.plan,
        billing_interval: changePreview.billing_interval,
        locale,
      });
      setChangePreview(preview);
      setPaymentSetupClientSecret(null);
    } catch (e) {
      const detail = e instanceof Error ? e.message : "request_failed";
      const key = membershipErrorKeyFromDetail(detail);
      setPaymentMethodError(t(`errors.${key === "generic" ? "stripeChangeFailed" : key}`));
      throw e;
    } finally {
      setUpdatingPaymentMethod(false);
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
  const changeConfirmLabel =
    changePreview?.action === "immediate" && changePreview.amount_due > 0
      ? t("planChangePayNow")
      : t("changeConfirmButton");

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

            {changePreview.action === "immediate" && changePreview.amount_due > 0 ? (
              <div className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-slate-500">{t("planChangePaymentMethod")}</div>
                    <div className="mt-1 truncate font-semibold text-slate-900">
                      {changePreview.payment_method_display || t("planChangePaymentMethodUnknown")}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    onClick={() => void startEditingPaymentMethod()}
                    disabled={confirmingChange || updatingPaymentMethod}
                  >
                    {updatingPaymentMethod && !paymentSetupClientSecret
                      ? t("planChangeLoadingPaymentMethod")
                      : t("planChangeEditPaymentMethod")}
                  </button>
                </div>
                <p className="mt-2 leading-5 text-slate-500">{t("planChangePaymentSecurityNote")}</p>
                {paymentMethodError ? <p className="mt-2 leading-5 text-red-600">{paymentMethodError}</p> : null}
                {paymentSetupClientSecret && stripePromise ? (
                  <Elements stripe={stripePromise}>
                    <PaymentMethodEditor
                      clientSecret={paymentSetupClientSecret}
                      disabled={confirmingChange || updatingPaymentMethod}
                      onCancel={() => {
                        setPaymentSetupClientSecret(null);
                        setPaymentMethodError(null);
                      }}
                      onSaved={savePaymentMethod}
                    />
                  </Elements>
                ) : null}
              </div>
            ) : null}

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
                disabled={confirmingChange || Boolean(paymentSetupClientSecret)}
              >
                {confirmingChange ? t("changeConfirming") : changeConfirmLabel}
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
        onCancelScheduledPlanChange={handleCancelScheduledPlanChange}
        hasStripeSubscription={hasStripeSubscription}
        portalEnabled={portalEnabled}
        checkoutEnabled={checkoutEnabled}
        redirecting={redirecting}
        membershipPeriodEndIso={membershipPeriodEndIso}
        subscriptionCancelAtPeriodEnd={subscriptionCancelAtPeriodEnd}
        pendingPlan={pendingPlan}
        pendingBillingInterval={pendingBillingInterval}
        pendingEffectiveAtIso={pendingEffectiveAtIso}
        trialEligible={trialEligible}
        subscriptionStatus={subscriptionStatus}
        trialEndAtIso={trialEndAtIso}
        notice={notice}
      />
    </div>
  );
}
