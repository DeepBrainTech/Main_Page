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
  type StripeChangeInvoice,
  type StripeChangePreview,
  type StripeInvoiceLine,
} from "@/services/userApi";

type MembershipErrorKey =
  | "loadFailed"
  | "saveFailed"
  | "checkoutFailed"
  | "portalFailed"
  | "cancelViaPortal"
  | "billingViaStripe"
  | "stripeNotConfigured"
  | "alreadySubscribed"
  | "stripeChangeFailed"
  | "subscriptionNoChange"
  | "generic";

type StripeDialogState =
  | null
  | { phase: "loading"; plan: "plus" | "premium" }
  | { phase: "ready"; plan: "plus" | "premium"; preview: StripeChangePreview };

function formatMinorUnits(amount: number, currency: string, locale: string): string {
  const cur = currency.length === 3 ? currency.toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: cur }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${cur}`;
  }
}

function splitInvoiceLines(lines: StripeInvoiceLine[]) {
  const positive = lines.filter((l) => l.amount > 0);
  const negative = lines.filter((l) => l.amount < 0);
  return {
    positive,
    negative,
    positiveSum: positive.reduce((s, l) => s + l.amount, 0),
  };
}

function invoiceStatusLabel(status: string, tMem: (key: string) => string): string {
  switch (status) {
    case "paid":
      return tMem("invoiceStatusPaid");
    case "open":
      return tMem("invoiceStatusOpen");
    case "draft":
      return tMem("invoiceStatusDraft");
    case "void":
      return tMem("invoiceStatusVoid");
    case "uncollectible":
      return tMem("invoiceStatusUncollectible");
    default:
      return tMem("invoiceStatusOther");
  }
}

function PlanChangeResultDetails({
  inv,
  t,
  intlLocale,
}: {
  inv: StripeChangeInvoice;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  intlLocale: string;
}) {
  return (
    <div className="mt-2 space-y-1.5 text-emerald-900">
      <p>{t("planChangeInvoiceTotalResult", { amount: formatMinorUnits(inv.total, inv.currency, intlLocale) })}</p>
      {inv.amount_paid > 0 ? (
        <p>{t("planChangeAmountPaid", { amount: formatMinorUnits(inv.amount_paid, inv.currency, intlLocale) })}</p>
      ) : null}
      {inv.amount_due > 0 ? (
        <p>{t("planChangeAmountDueResult", { amount: formatMinorUnits(inv.amount_due, inv.currency, intlLocale) })}</p>
      ) : null}
      <p>{t("planChangeInvoiceStatus", { status: invoiceStatusLabel(inv.status, t) })}</p>
      {inv.hosted_invoice_url ? (
        <a
          href={inv.hosted_invoice_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block font-medium text-sky-800 underline underline-offset-2 hover:text-sky-950"
        >
          {t("planChangeViewInvoice")}
        </a>
      ) : (
        <p className="text-emerald-800">{t("planChangeNoInvoiceDetail")}</p>
      )}
      {inv.lines && inv.lines.length > 0 ? (
        <ul className="mt-2 max-h-32 list-inside list-disc overflow-y-auto text-xs text-emerald-900/90">
          {inv.lines.map((line, i) => (
            <li key={`${line.description}-${i}`}>
              {line.description || "—"} — {formatMinorUnits(line.amount, inv.currency, intlLocale)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function MembershipPage() {
  const locale = useLocale();
  const intlLocale = locale === "zh" ? "zh-CN" : "en-US";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("membership");
  const tCommon = useTranslations("common");

  const [currentPlan, setCurrentPlan] = useState<MembershipPlan>("free");
  const [billingInterval, setBillingInterval] = useState<MembershipBillingInterval>("monthly");
  const [loadError, setLoadError] = useState<MembershipErrorKey | null>(null);
  const [successMessage, setSuccessMessage] = useState<"checkoutSuccess" | null>(null);
  const [planChangeSummary, setPlanChangeSummary] = useState<{
    invoice: StripeChangeInvoice | null;
    changeMode?: "deferred_downgrade" | "immediate_upgrade";
    deferredEffectiveAt?: string | null;
  } | null>(null);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);
  const [membershipPeriodEndIso, setMembershipPeriodEndIso] = useState<string | null>(null);
  const [subscriptionCancelAtPeriodEnd, setSubscriptionCancelAtPeriodEnd] = useState<boolean | null>(null);
  const [stripeDialog, setStripeDialog] = useState<StripeDialogState>(null);
  const [stripeSubmitting, setStripeSubmitting] = useState(false);

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
    const c = searchParams.get("checkout");
    if (c === "success") {
      setSuccessMessage("checkoutSuccess");
      setPlanChangeSummary(null);
      void loadAll();
      window.dispatchEvent(new Event("membership-plan-change"));
      router.replace(pathname);
    } else if (c === "canceled") {
      void loadAll();
      router.replace(pathname);
    }
  }, [searchParams, loadAll, router, pathname]);

  useEffect(() => {
    if (!stripeDialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !stripeSubmitting) setStripeDialog(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stripeDialog, stripeSubmitting]);

  const confirmStripePlanChange = async () => {
    if (!stripeDialog || stripeDialog.phase !== "ready") return;
    const { plan } = stripeDialog;
    setStripeSubmitting(true);
    setLoadError(null);
    try {
      const result = await changeStripeSubscription({ plan, billing_interval: billingInterval });
      setStripeDialog(null);
      await loadAll();
      setSuccessMessage(null);
      setPlanChangeSummary({
        invoice: result.invoice ?? null,
        changeMode: result.change_mode,
        deferredEffectiveAt: result.deferred_effective_at ?? null,
      });
      window.dispatchEvent(new Event("membership-plan-change"));
    } catch (e) {
      const detail = e instanceof Error ? e.message : "request_failed";
      const key = membershipErrorKeyFromDetail(detail) as MembershipErrorKey;
      setLoadError(key);
    } finally {
      setStripeSubmitting(false);
    }
  };

  const handlePlanChange = async (plan: MembershipPlan) => {
    setLoadError(null);
    setSuccessMessage(null);
    setPlanChangeSummary(null);
    try {
      if (plan === "free") {
        if (hasStripeSubscription) {
          const url = await createStripeBillingPortalSession(locale);
          window.location.href = url;
          return;
        }
        if (currentPlan === "free") {
          return;
        }
        setLoadError("billingViaStripe");
        return;
      }

      if ((plan === "plus" || plan === "premium") && checkoutEnabled) {
        if (hasStripeSubscription) {
          setStripeDialog({ phase: "loading", plan });
          try {
            const preview = await previewStripeSubscriptionChange({
              plan,
              billing_interval: billingInterval,
            });
            setStripeDialog({ phase: "ready", plan, preview });
          } catch (e) {
            setStripeDialog(null);
            const detail = e instanceof Error ? e.message : "request_failed";
            const key = membershipErrorKeyFromDetail(detail) as MembershipErrorKey;
            setLoadError(key);
          }
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

      setLoadError("stripeNotConfigured");
      return;
    } catch (e) {
      const detail = e instanceof Error ? e.message : "request_failed";
      const key = membershipErrorKeyFromDetail(detail) as MembershipErrorKey;
      setLoadError(key);
    }
  };

  const preview = stripeDialog?.phase === "ready" ? stripeDialog.preview : null;
  const dialogPlan = stripeDialog?.phase === "ready" || stripeDialog?.phase === "loading" ? stripeDialog.plan : null;

  return (
    <div className="space-y-4">
      {successMessage ? (
        <p className="text-center text-sm font-medium text-emerald-700" role="status">
          {t(successMessage)}
        </p>
      ) : null}
      {planChangeSummary ? (
        <div
          className="mx-auto max-w-lg rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-left text-sm text-emerald-950"
          role="status"
        >
          <p className="font-semibold text-emerald-900">{t("planChangeDoneTitle")}</p>
          {planChangeSummary.changeMode === "deferred_downgrade" && planChangeSummary.deferredEffectiveAt ? (
            <p className="mt-2 text-emerald-800">
              {t("planChangeDeferredSuccess", {
                plan: t("plans.plus"),
                date: new Date(planChangeSummary.deferredEffectiveAt).toLocaleDateString(intlLocale, {
                  dateStyle: "long",
                }),
              })}
            </p>
          ) : planChangeSummary.invoice ? (
            <PlanChangeResultDetails inv={planChangeSummary.invoice} t={t} intlLocale={intlLocale} />
          ) : (
            <p className="mt-2 text-emerald-800">{t("planChangeNoInvoiceDetail")}</p>
          )}
        </div>
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
        membershipPeriodEndIso={membershipPeriodEndIso}
        subscriptionCancelAtPeriodEnd={subscriptionCancelAtPeriodEnd}
      />

      {stripeDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => !stripeSubmitting && setStripeDialog(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 pt-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stripe-plan-change-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
              aria-label={t("planChangeCloseAria")}
              onClick={() => !stripeSubmitting && setStripeDialog(null)}
              disabled={stripeSubmitting}
            >
              <span className="text-xl leading-none" aria-hidden>
                ×
              </span>
            </button>

            <h2 id="stripe-plan-change-title" className="pr-10 text-lg font-semibold text-slate-900">
              {t("planChangeConfirmTitle")}
            </h2>
            {dialogPlan ? (
              <p className="mt-1 text-sm text-slate-600">
                {t("planChangeTargetSummary", {
                  plan: t(`plans.${dialogPlan}`),
                  interval: t(billingInterval === "annual" ? "billingAnnually" : "billingMonthly"),
                })}
              </p>
            ) : null}

            {stripeDialog.phase === "loading" ? (
              <p className="mt-8 text-center text-sm text-slate-600">{t("planChangeLoadingPreview")}</p>
            ) : preview && dialogPlan ? (
              <>
                {preview.change_mode === "deferred_downgrade" ? (
                  <div className="mt-5 space-y-3 text-sm text-slate-800">
                    <p className="leading-relaxed text-slate-800">
                      {t("planChangeDeferredPreviewSummary", {
                        date: preview.subscription_current_period_end
                          ? new Date(preview.subscription_current_period_end * 1000).toLocaleDateString(
                              intlLocale,
                              { dateStyle: "long" },
                            )
                          : "—",
                        plan: t(`plans.${dialogPlan}`),
                        interval: t(billingInterval === "annual" ? "billingAnnually" : "billingMonthly"),
                      })}
                    </p>
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">
                      {t("planChangeDeferredNoChargeToday")}
                    </div>
                    <div className="flex items-start justify-between gap-3 pt-1 text-sm">
                      <span className="text-slate-600">{t("planChangePaymentMethod")}</span>
                      <span className="max-w-[58%] text-right font-medium text-slate-900">
                        {preview.payment_method_label || t("planChangePaymentMethodUnknown")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const { positive, negative, positiveSum } = splitInvoiceLines(preview.lines);
                      const headline = positiveSum > 0 ? positiveSum : Math.max(0, preview.subtotal);
                      return (
                        <div className="mt-5 space-y-1 text-sm text-slate-800">
                          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900">{t(`plans.${dialogPlan}`)}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {billingInterval === "annual"
                                  ? t("planChangeBillingNoteAnnual")
                                  : t("planChangeBillingNoteMonthly")}
                              </p>
                              {positive.length > 1 ? (
                                <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                                  {positive.map((line, i) => (
                                    <li key={`p-${i}`} className="truncate">
                                      {line.description || "—"}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                            <p className="shrink-0 text-base font-semibold tabular-nums text-slate-900">
                              {formatMinorUnits(headline, preview.currency, intlLocale)}
                            </p>
                          </div>

                          {negative.length > 0 ? (
                            <div className="border-b border-slate-200 py-4">
                              <p className="text-sm font-semibold text-slate-900">{t("planChangeAdjustmentTitle")}</p>
                              <ul className="mt-2 space-y-2">
                                {negative.map((line, i) => (
                                  <li key={`n-${i}`} className="flex justify-between gap-3 text-sm">
                                    <span className="min-w-0 flex-1 text-slate-600">
                                      {line.description || t("planChangeAdjustmentTitle")}
                                    </span>
                                    <span className="shrink-0 font-medium tabular-nums text-emerald-600">
                                      {formatMinorUnits(line.amount, preview.currency, intlLocale)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              <p className="mt-2 text-xs text-slate-500">{t("planChangeAdjustmentCreditHint")}</p>
                            </div>
                          ) : null}

                          <div className="flex items-center justify-between gap-3 pt-3">
                            <span className="font-semibold text-slate-900">{t("planChangeTotalDueToday")}</span>
                            <span className="text-lg font-bold tabular-nums text-slate-900">
                              {formatMinorUnits(preview.amount_due, preview.currency, intlLocale)}
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-3 pt-2 text-sm">
                            <span className="text-slate-600">{t("planChangePaymentMethod")}</span>
                            <span className="max-w-[58%] text-right font-medium text-slate-900">
                              {preview.payment_method_label || t("planChangePaymentMethodUnknown")}
                            </span>
                          </div>
                          {preview.subscription_current_period_end ? (
                            <p className="pt-2 text-xs text-slate-500">
                              {t("planChangeNextPeriod", {
                                date: new Date(preview.subscription_current_period_end * 1000).toLocaleDateString(
                                  intlLocale,
                                  { dateStyle: "medium" },
                                ),
                              })}
                            </p>
                          ) : null}
                        </div>
                      );
                    })()}
                  </>
                )}
                <p className="mt-4 text-xs leading-relaxed text-slate-500">{t("planChangeConfirmSubtitle")}</p>
              </>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => !stripeSubmitting && setStripeDialog(null)}
                disabled={stripeSubmitting}
              >
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  preview && preview.change_mode !== "deferred_downgrade" && preview.amount_due > 0
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "bg-sky-600 hover:bg-sky-700"
                }`}
                onClick={() => void confirmStripePlanChange()}
                disabled={stripeSubmitting || stripeDialog.phase !== "ready"}
              >
                {stripeSubmitting
                  ? tCommon("loading")
                  : preview?.change_mode === "deferred_downgrade"
                    ? t("planChangeConfirmDeferred")
                    : preview && preview.amount_due > 0
                      ? t("planChangePayNow")
                      : t("planChangeConfirmNoPayment")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
