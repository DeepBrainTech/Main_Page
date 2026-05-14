"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export type MembershipPlan = "free" | "plus" | "premium";
export type MembershipBillingInterval = "monthly" | "annual";

interface MembershipPlansProps {
  currentPlan: MembershipPlan;
  billingInterval: MembershipBillingInterval;
  onBillingIntervalChange: (interval: MembershipBillingInterval) => void;
  onPlanChange: (plan: MembershipPlan) => void | Promise<void>;
  /** When subscription is cancel-at-period-end, call Stripe to resume renewal billing. */
  onResumeSubscription?: () => void | Promise<void>;
  /** Paid + Stripe: cancel at period end via API (no Customer Portal redirect). */
  onCancelPaidSubscription?: () => void | Promise<void>;
  /** ISO datetime for current paid period end (renewal / access end). */
  membershipPeriodEndIso?: string | null;
  /** From Stripe: true if cancel at period end; false if active renewal; null if unknown. */
  subscriptionCancelAtPeriodEnd?: boolean | null;
  /** From Stripe: true if a multi-phase schedule implies a future plan change (e.g. deferred downgrade). */
  subscriptionSchedulePendingChange?: boolean | null;
  /** Billing interval of the active paid subscription (from server); may differ from tab while browsing. */
  subscribedBillingInterval?: MembershipBillingInterval | null;
}

type PlanFeature = {
  titleKey: string;
  descriptionKey?: string;
  enabled: boolean;
  marker?: "check" | "lock" | "notIncluded";
  icon?: "diamond" | "coin";
};

type PlanConfig = {
  key: MembershipPlan;
  bestValue?: boolean;
  features: PlanFeature[];
};

const planConfigs: PlanConfig[] = [
  {
    key: "free",
    features: [
      { titleKey: "features.noDailyDiamonds.title", descriptionKey: "features.noDailyDiamonds.description", enabled: false, marker: "notIncluded" },
      { titleKey: "features.payPerCourse.title", descriptionKey: "features.payPerCourse.description", enabled: true, marker: "lock" },
    ],
  },
  {
    key: "plus",
    features: [
      { titleKey: "features.dailyDiamonds.title", descriptionKey: "features.dailyDiamonds.description", enabled: true, icon: "diamond" },
      { titleKey: "features.payPerCourse.title", descriptionKey: "features.payPerCourse.description", enabled: true, marker: "lock" },
      { titleKey: "features.catchUp.title", descriptionKey: "features.catchUp.description", enabled: true },
    ],
  },
  {
    key: "premium",
    bestValue: true,
    features: [
      { titleKey: "features.premiumRewards.title", descriptionKey: "features.dailyDiamonds.description", enabled: true, icon: "diamond" },
      { titleKey: "features.allContent.title", descriptionKey: "features.allContent.description", enabled: true },
      { titleKey: "features.catchUp.title", descriptionKey: "features.catchUp.description", enabled: true },
    ],
  },
];

const planDisplayPrices: Record<MembershipPlan, { monthly: string; annual: string }> = {
  free: { monthly: "$0", annual: "$0" },
  plus: { monthly: "$4.99", annual: "$49.99" },
  premium: { monthly: "$6.99", annual: "$69.99" },
};

const planStyles = {
  free: {
    card: "border-slate-200 bg-white text-sky-700",
    title: "text-cyan-950",
    price: "text-sky-700",
    subtext: "text-sky-700/75",
    featureTitle: "text-[#045E96]",
    featureDescription: "text-[#106FAA]",
    icon: "border-sky-200 bg-sky-50 text-sky-700",
    button: "bg-indigo-50 text-sky-700",
  },
  plus: {
    card: "border-sky-400 bg-[linear-gradient(135deg,#38ACFF_0%,#2D88F3_100%)] text-white shadow-xl shadow-sky-300/35",
    title: "text-white",
    price: "text-white",
    subtext: "text-white/80",
    featureTitle: "text-white",
    featureDescription: "text-white/80",
    icon: "border-white/25 bg-white/15 text-white",
    button: "bg-white text-[#2D88F3] shadow-lg shadow-sky-800/20",
  },
  premium: {
    card: "border-sky-700 bg-[linear-gradient(135deg,#106FAA_0%,#0075FF_100%)] text-white shadow-xl shadow-sky-700/25",
    title: "text-white",
    price: "text-white",
    subtext: "text-white/80",
    featureTitle: "text-white",
    featureDescription: "text-white/80",
    icon: "border-white/25 bg-white/15 text-white",
    button: "bg-white text-[#0373D3] shadow-lg shadow-sky-950/20",
  },
};

/** Defer close so the same pointer event cannot activate elements under the modal. */
function scheduleCancelDialogClose(close: () => void) {
  setTimeout(close, 0);
}

function formatMembershipPeriodDate(iso: string, siteLocale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const intl = siteLocale.startsWith("zh") ? "zh-CN" : "en-US";
  return new Intl.DateTimeFormat(intl, { month: "2-digit", day: "2-digit", year: "numeric" }).format(d);
}

export default function MembershipPlans({
  currentPlan,
  billingInterval,
  onBillingIntervalChange,
  onPlanChange,
  onResumeSubscription,
  onCancelPaidSubscription,
  membershipPeriodEndIso = null,
  subscriptionCancelAtPeriodEnd = null,
  subscriptionSchedulePendingChange = null,
  subscribedBillingInterval = null,
}: MembershipPlansProps) {
  const locale = useLocale();
  const t = useTranslations("membership");
  const tCommon = useTranslations("common");
  const periodKey = billingInterval === "annual" ? "perYear" : "perMonth";
  const [pendingCancelPlan, setPendingCancelPlan] = useState<MembershipPlan | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [resumeSubmitting, setResumeSubmitting] = useState(false);

  useEffect(() => {
    if (!pendingCancelPlan) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !cancelSubmitting) {
        scheduleCancelDialogClose(() => setPendingCancelPlan(null));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingCancelPlan, cancelSubmitting]);

  const loseKeys =
    pendingCancelPlan === "premium"
      ? (["losePremium1", "losePremium2", "losePremium3"] as const)
      : (["losePlus1", "losePlus2"] as const);

  const handleConfirmCancel = async () => {
    if (!pendingCancelPlan || cancelSubmitting) return;
    setCancelSubmitting(true);
    try {
      if (onCancelPaidSubscription) {
        await onCancelPaidSubscription();
      } else {
        await onPlanChange("free");
      }
      setPendingCancelPlan(null);
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleResumeClick = async () => {
    if (!onResumeSubscription || resumeSubmitting) return;
    setResumeSubmitting(true);
    try {
      await onResumeSubscription();
    } finally {
      setResumeSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-1 py-6 sm:px-3 lg:py-10">
      <div className="mx-auto mb-7 max-w-2xl text-center sm:mb-9">
        <h1 className="font-app-body text-3xl font-bold leading-tight text-[#0070C8] sm:text-4xl lg:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-2 font-app-body text-sm font-normal leading-6 text-sky-700 sm:text-lg">{t("subtitle")}</p>
      </div>

      <div className="mb-8 flex justify-center px-2" role="tablist" aria-label={t("billingToggleAria")}>
        <div className="flex h-12 w-full max-w-[489px] items-center gap-0 rounded-2xl border-[0.82px] border-slate-300/40 bg-white/55 p-1 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            role="tab"
            aria-selected={billingInterval === "monthly"}
            className={`flex h-10 min-w-0 flex-1 items-center justify-center rounded-2xl px-6 font-app-body text-base font-semibold leading-6 transition sm:px-10 ${
              billingInterval === "monthly"
                ? "bg-gradient-to-r from-sky-700 to-blue-600 text-white shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1)] shadow-md outline outline-[0.82px] outline-offset-[-0.82px] outline-slate-300/30"
                : "text-sky-700 hover:text-sky-900"
            }`}
            onClick={() => onBillingIntervalChange("monthly")}
          >
            {t("billingMonthly")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={billingInterval === "annual"}
            className={`flex h-10 min-w-0 flex-1 items-center justify-center rounded-2xl px-6 font-app-body text-base font-semibold leading-6 transition sm:px-10 ${
              billingInterval === "annual"
                ? "bg-gradient-to-r from-sky-700 to-blue-600 text-white shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1)] shadow-md outline outline-[0.82px] outline-offset-[-0.82px] outline-slate-300/30"
                : "text-sky-700 hover:text-sky-900"
            }`}
            onClick={() => onBillingIntervalChange("annual")}
          >
            {t("billingAnnually")}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
        {planConfigs.map((plan) => {
          const styles = planStyles[plan.key];
          const isCurrent = currentPlan === plan.key;
          const isFreePreview = plan.key === "free" && currentPlan !== "free";
          const actionLabelKey =
            currentPlan === "premium" && plan.key === "plus" ? "downgradeToPlus" : `actions.${plan.key}`;
          const price = planDisplayPrices[plan.key][billingInterval === "annual" ? "annual" : "monthly"];

          const isCanceledAtPeriodEnd = subscriptionCancelAtPeriodEnd === true;
          const hasPendingScheduleChange = subscriptionSchedulePendingChange === true;
          const showRenewRow =
            isCurrent &&
            (plan.key === "plus" || plan.key === "premium") &&
            Boolean(membershipPeriodEndIso || hasPendingScheduleChange || isCanceledAtPeriodEnd);
          const periodDateLabel = membershipPeriodEndIso ? formatMembershipPeriodDate(membershipPeriodEndIso, locale) : "";
          const showResumeRow =
            Boolean(onResumeSubscription) && (isCanceledAtPeriodEnd || hasPendingScheduleChange);
          const resumePrimaryLabel =
            hasPendingScheduleChange && !isCanceledAtPeriodEnd ? t("undoScheduledPlanChange") : t("resumeSubscription");
          const blockDowngradePlusWhileCanceling =
            currentPlan === "premium" && plan.key === "plus" && isCanceledAtPeriodEnd;
          const showCrossGradeBillingCta =
            isCurrent &&
            (plan.key === "plus" || plan.key === "premium") &&
            subscribedBillingInterval != null &&
            subscribedBillingInterval !== billingInterval;
          const primaryPlanButtonLabel = isFreePreview
            ? t("freePlan")
            : isCurrent
              ? showCrossGradeBillingCta
                ? billingInterval === "annual"
                  ? t("upgradeToAnnual")
                  : t("upgradeToMonthly")
                : t("currentPlan")
              : t(actionLabelKey);

          return (
            <article
              key={plan.key}
              className={`relative flex min-h-[34rem] flex-col rounded-3xl border-2 p-5 font-app-body sm:p-6 ${styles.card}`}
            >
              {plan.bestValue ? (
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-600 bg-amber-400 px-5 py-1.5 text-xs font-bold leading-4 text-yellow-900">
                  {t("bestValue")}
                </div>
              ) : null}

              <div>
                <div>
                  <h2 className={`text-2xl font-semibold leading-8 ${styles.title}`}>{t(`plans.${plan.key}`)}</h2>
                  <div className="mt-3 flex items-end gap-1.5">
                    <span className={`font-app-body text-4xl font-bold leading-10 ${styles.price}`}>{price}</span>
                    <span className={`pb-1 font-app-body text-sm font-normal leading-6 sm:text-base ${styles.subtext}`}>{t(periodKey)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-1 flex-col gap-4">
                {plan.features.map((feature) => (
                  <div key={feature.titleKey} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-xs font-bold" aria-hidden>
                      {feature.marker === "lock" ? (
                        <Image src="/membership/lock.svg" alt="" width={16} height={16} className="h-4 w-4" />
                      ) : feature.enabled ? (
                        <Image src="/membership/include.svg" alt="" width={16} height={16} className="h-4 w-4" />
                      ) : (
                        <Image
                          src="/membership/notinclude.svg"
                          alt=""
                          width={16}
                          height={16}
                          className="h-4 w-4"
                        />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className={`flex flex-wrap items-center gap-1.5 font-app-body text-base font-semibold leading-6 ${styles.featureTitle}`}>
                        {feature.icon === "diamond" ? (
                          <Image src="/dashboard/dimond.svg" alt="" width={16} height={16} className="h-4 w-4 shrink-0" />
                        ) : null}
                        <span>{t(feature.titleKey)}</span>
                        {feature.titleKey === "features.premiumRewards.title" ? (
                          <>
                            <Image src="/dashboard/coin.svg" alt="" width={16} height={16} className="h-4 w-4 shrink-0" />
                            <span>{t("features.premiumRewards.coins")}</span>
                          </>
                        ) : null}
                      </div>
                      {feature.descriptionKey ? (
                        <p className={`mt-1 font-app-body text-sm font-normal leading-5 ${styles.featureDescription}`}>{t(feature.descriptionKey)}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className={`mt-auto flex w-full flex-col gap-3 pt-8 ${showRenewRow ? "min-h-[7.75rem]" : "min-h-[6.25rem]"} justify-end`}
              >
                {showRenewRow ? (
                  <div className="text-center font-['Outfit'] text-base font-normal leading-6 text-amber-300">
                    {periodDateLabel ? (
                      isCanceledAtPeriodEnd ? (
                        <span>{t("planExpiresOn", { date: periodDateLabel })}</span>
                      ) : (
                        <span>{t("planRenewOn", { date: periodDateLabel })}</span>
                      )
                    ) : null}
                    {isCanceledAtPeriodEnd ? (
                      <p className="mt-1.5 px-1 font-app-body text-xs font-normal leading-5 text-amber-200/90">
                        {t("resumeSubscriptionHint")}
                      </p>
                    ) : null}
                    {hasPendingScheduleChange ? (
                      <p className={`px-1 font-app-body text-xs font-normal leading-5 text-amber-200/90 ${periodDateLabel ? "mt-1.5" : "mt-0"}`}>
                        {t("scheduledPlanChangeHint")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => onPlanChange(plan.key)}
                  disabled={(isCurrent && !showCrossGradeBillingCta) || isFreePreview || blockDowngradePlusWhileCanceling}
                  title={blockDowngradePlusWhileCanceling ? t("downgradeToPlusBlockedTitle") : undefined}
                  className={`h-12 w-full rounded-full font-app-body text-base font-semibold leading-6 transition ${
                    (isCurrent && !showCrossGradeBillingCta) || isFreePreview || blockDowngradePlusWhileCanceling
                      ? plan.key === "free"
                        ? "cursor-default bg-indigo-50 text-sky-700 opacity-95"
                        : "cursor-default bg-white/20 text-white disabled:cursor-not-allowed disabled:opacity-55"
                      : `${styles.button} hover:-translate-y-0.5 hover:shadow-xl`
                  }`}
                >
                  {primaryPlanButtonLabel}
                </button>

                {isCurrent && plan.key !== "free" ? (
                  showResumeRow ? (
                    <button
                      type="button"
                      onClick={() => void handleResumeClick()}
                      disabled={resumeSubmitting}
                      className="h-10 w-full rounded-full border border-emerald-300/50 bg-emerald-500/15 font-app-body text-sm font-medium leading-5 text-white transition hover:bg-emerald-500/25 disabled:opacity-60"
                    >
                      {resumeSubmitting ? tCommon("loading") : resumePrimaryLabel}
                    </button>
                  ) : !isCanceledAtPeriodEnd ? (
                    <button
                      type="button"
                      onClick={() => setPendingCancelPlan(plan.key)}
                      className="h-10 w-full rounded-full border border-white/30 bg-white/10 font-app-body text-sm font-medium leading-5 text-white transition hover:bg-white/15"
                    >
                      {t("cancelSubscription")}
                    </button>
                  ) : null
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {pendingCancelPlan ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            aria-label={t("cancelDialog.closeAria")}
            onClick={() => {
              if (!cancelSubmitting) scheduleCancelDialogClose(() => setPendingCancelPlan(null));
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            className="relative z-10 w-full max-w-[min(100vw-2rem,524px)] rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1)] shadow-lg outline outline-2 outline-offset-[-2px] outline-slate-200 sm:p-8"
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-md p-1 text-neutral-700 opacity-70 transition hover:bg-slate-100 hover:opacity-100"
              onClick={() => {
                if (!cancelSubmitting) scheduleCancelDialogClose(() => setPendingCancelPlan(null));
              }}
              aria-label={t("cancelDialog.closeAria")}
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                <Image src="/membership/attention.svg" alt="" width={32} height={32} className="h-8 w-8" aria-hidden />
              </div>
              <h2 id="cancel-dialog-title" className="mt-4 font-app-body text-2xl font-bold leading-8 text-cyan-950">
                {t("cancelDialog.title")}
              </h2>
              <p className="mt-2 max-w-md font-app-body text-base font-normal leading-6 text-sky-700">
                {t("cancelDialog.description", { plan: t(`plans.${pendingCancelPlan}`) })}
              </p>
            </div>

            <div className="mt-6 rounded-2xl border-2 border-amber-400/30 bg-orange-50 px-4 py-4">
              <p className="font-app-body text-sm font-medium leading-5 text-sky-700">{t("cancelDialog.loseHeading")}</p>
              <ul className="mt-2 space-y-2">
                {loseKeys.map((key) => (
                  <li key={key} className="flex items-start gap-2 font-app-body text-sm font-normal leading-5 text-sky-700">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                      <Image src="/membership/notinclude.svg" alt="" width={16} height={16} className="h-4 w-4" />
                    </span>
                    <span>{t(`cancelDialog.${key}`)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                className="h-14 w-full rounded-full bg-gradient-to-r from-sky-700 via-sky-700 to-blue-600 font-app-body text-base font-bold leading-6 text-white shadow-md transition hover:brightness-105"
                onClick={() => scheduleCancelDialogClose(() => setPendingCancelPlan(null))}
              >
                {t("cancelDialog.keepPlan", { plan: t(`plans.${pendingCancelPlan}`) })}
              </button>
              <button
                type="button"
                disabled={cancelSubmitting}
                className="h-12 w-full rounded-full bg-indigo-50 font-app-body text-base font-semibold leading-6 text-sky-700 transition hover:bg-indigo-100 disabled:opacity-60"
                onClick={() => void handleConfirmCancel()}
              >
                {cancelSubmitting ? tCommon("loading") : t("cancelDialog.confirmCancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
