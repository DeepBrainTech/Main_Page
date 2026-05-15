"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

export type MembershipPlan = "free" | "plus" | "premium";
export type MembershipBillingInterval = "monthly" | "annual";

interface MembershipPlansProps {
  currentPlan: MembershipPlan;
  currentBillingInterval: MembershipBillingInterval | null;
  billingInterval: MembershipBillingInterval;
  onBillingIntervalChange: (interval: MembershipBillingInterval) => void;
  onSubscribe: (plan: "plus" | "premium") => void | Promise<void>;
  onManageBilling: () => void | Promise<void>;
  onPlanAction: (plan: MembershipPlan) => void | Promise<void>;
  hasStripeSubscription: boolean;
  portalEnabled: boolean;
  checkoutEnabled: boolean;
  redirecting?: boolean;
  membershipPeriodEndIso?: string | null;
  subscriptionCancelAtPeriodEnd?: boolean | null;
  pendingPlan?: "plus" | "premium" | null;
  pendingBillingInterval?: MembershipBillingInterval | null;
  pendingEffectiveAtIso?: string | null;
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
    button: "bg-indigo-50 text-sky-700",
  },
  plus: {
    card: "border-sky-400 bg-[linear-gradient(135deg,#38ACFF_0%,#2D88F3_100%)] text-white shadow-xl shadow-sky-300/35",
    title: "text-white",
    price: "text-white",
    subtext: "text-white/80",
    featureTitle: "text-white",
    featureDescription: "text-white/80",
    button: "bg-white text-[#2D88F3] shadow-lg shadow-sky-800/20",
  },
  premium: {
    card: "border-sky-700 bg-[linear-gradient(135deg,#106FAA_0%,#0075FF_100%)] text-white shadow-xl shadow-sky-700/25",
    title: "text-white",
    price: "text-white",
    subtext: "text-white/80",
    featureTitle: "text-white",
    featureDescription: "text-white/80",
    button: "bg-white text-[#0373D3] shadow-lg shadow-sky-950/20",
  },
};

function formatMembershipPeriodDate(iso: string, siteLocale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const intl = siteLocale.startsWith("zh") ? "zh-CN" : "en-US";
  return new Intl.DateTimeFormat(intl, { month: "2-digit", day: "2-digit", year: "numeric" }).format(d);
}

export default function MembershipPlans({
  currentPlan,
  currentBillingInterval,
  billingInterval,
  onBillingIntervalChange,
  onSubscribe,
  onManageBilling,
  onPlanAction,
  hasStripeSubscription,
  portalEnabled,
  checkoutEnabled,
  redirecting = false,
  membershipPeriodEndIso = null,
  subscriptionCancelAtPeriodEnd = null,
  pendingPlan = null,
  pendingBillingInterval = null,
  pendingEffectiveAtIso = null,
}: MembershipPlansProps) {
  const locale = useLocale();
  const t = useTranslations("membership");
  const tCommon = useTranslations("common");
  const periodKey = billingInterval === "annual" ? "perYear" : "perMonth";

  const isCanceledAtPeriodEnd = subscriptionCancelAtPeriodEnd === true;
  const pendingDateLabel = pendingEffectiveAtIso ? formatMembershipPeriodDate(pendingEffectiveAtIso, locale) : "";

  return (
    <section className="mx-auto w-full max-w-6xl px-1 py-6 sm:px-3 lg:py-10">
      <div className="mx-auto mb-7 max-w-2xl text-center sm:mb-9">
        <h1 className="font-app-body text-3xl font-bold leading-tight text-[#0070C8] sm:text-4xl lg:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-2 font-app-body text-sm font-normal leading-6 text-sky-700 sm:text-lg">{t("subtitle")}</p>
        {hasStripeSubscription ? (
          <p className="mt-3 font-app-body text-sm text-sky-600">{t("manageBillingHint")}</p>
        ) : null}
      </div>

      {hasStripeSubscription ? (
        <div className="mb-6 flex justify-center px-2">
          <button
            type="button"
            disabled={!portalEnabled || redirecting}
            onClick={() => void onManageBilling()}
            className="h-12 min-w-[min(100%,20rem)] rounded-full bg-gradient-to-r from-sky-700 to-blue-600 px-8 font-app-body text-base font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {redirecting ? tCommon("loading") : t("manageBillingPrimary")}
          </button>
        </div>
      ) : null}

      <div className="mb-8 flex flex-col items-center gap-1.5 px-2">
        <div
          className="flex h-12 w-full max-w-[489px] items-center gap-0 rounded-2xl border-[0.82px] border-slate-300/40 bg-white/55 p-1 shadow-sm backdrop-blur-sm"
          role="tablist"
          aria-label={t("billingToggleAria")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={billingInterval === "monthly"}
            disabled={redirecting}
            className={`flex h-10 min-w-0 flex-1 items-center justify-center rounded-2xl px-6 font-app-body text-base font-semibold leading-6 transition sm:px-10 ${
              billingInterval === "monthly"
                ? "bg-gradient-to-r from-sky-700 to-blue-600 text-white shadow-md"
                : "text-sky-700 hover:text-sky-900"
            } disabled:cursor-not-allowed disabled:opacity-60`}
            onClick={() => onBillingIntervalChange("monthly")}
          >
            {t("billingMonthly")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={billingInterval === "annual"}
            disabled={redirecting}
            className={`flex h-10 min-w-0 flex-1 items-center justify-center rounded-2xl px-6 font-app-body text-base font-semibold leading-6 transition sm:px-10 ${
              billingInterval === "annual"
                ? "bg-gradient-to-r from-sky-700 to-blue-600 text-white shadow-md"
                : "text-sky-700 hover:text-sky-900"
            } disabled:cursor-not-allowed disabled:opacity-60`}
            onClick={() => onBillingIntervalChange("annual")}
          >
            {t("billingAnnually")}
          </button>
        </div>
        {hasStripeSubscription ? (
          <p className="max-w-md text-center font-app-body text-xs text-sky-600">{t("billingTabChangeHint")}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
        {planConfigs.map((plan) => {
          const styles = planStyles[plan.key];
          const isCurrent = currentPlan === plan.key && currentBillingInterval === billingInterval;
          const isFreePreview = plan.key === "free" && currentPlan !== "free";
          const price = planDisplayPrices[plan.key][billingInterval === "annual" ? "annual" : "monthly"];
          const periodDateLabel = membershipPeriodEndIso ? formatMembershipPeriodDate(membershipPeriodEndIso, locale) : "";
          const showStatusRow =
            isCurrent && (plan.key === "plus" || plan.key === "premium") && Boolean(periodDateLabel || isCanceledAtPeriodEnd);

          let buttonLabel: string;
          let buttonDisabled = redirecting;
          let handleClick: () => void = () => void onPlanAction(plan.key);
          const pendingMatches =
            pendingPlan === plan.key && pendingBillingInterval === billingInterval && Boolean(pendingDateLabel);

          if (hasStripeSubscription) {
            if (plan.key === "free") {
              buttonLabel = t("cancelInPortal");
              buttonDisabled = buttonDisabled || !portalEnabled;
              handleClick = () => void onManageBilling();
            } else if (isCurrent) {
              if (isCanceledAtPeriodEnd) {
                buttonLabel = t("resumeInPortal");
                buttonDisabled = buttonDisabled || !portalEnabled;
                handleClick = () => void onManageBilling();
              } else {
                buttonLabel = t("currentPlan");
                buttonDisabled = true;
              }
            } else if (pendingMatches) {
              buttonLabel = t("scheduledButton", { date: pendingDateLabel });
              buttonDisabled = true;
            } else {
              buttonLabel = t("switchPlan", { plan: t(`plans.${plan.key}`) });
              handleClick = () => void onPlanAction(plan.key);
            }
          } else if (plan.key === "free" || isFreePreview) {
            buttonLabel = t("freePlan");
            buttonDisabled = true;
          } else {
            buttonLabel = t(`actions.${plan.key}`);
            buttonDisabled = buttonDisabled || !checkoutEnabled;
            handleClick = () => void onSubscribe(plan.key as "plus" | "premium");
          }

          const showLoadingOnButton = redirecting && !buttonDisabled;

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
                <h2 className={`text-2xl font-semibold leading-8 ${styles.title}`}>{t(`plans.${plan.key}`)}</h2>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className={`font-app-body text-4xl font-bold leading-10 ${styles.price}`}>{price}</span>
                  <span className={`pb-1 font-app-body text-sm font-normal leading-6 sm:text-base ${styles.subtext}`}>
                    {t(periodKey)}
                  </span>
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
                        <Image src="/membership/notinclude.svg" alt="" width={16} height={16} className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div
                        className={`flex flex-wrap items-center gap-1.5 font-app-body text-base font-semibold leading-6 ${styles.featureTitle}`}
                      >
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
                        <p className={`mt-1 font-app-body text-sm font-normal leading-5 ${styles.featureDescription}`}>
                          {t(feature.descriptionKey)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className={`mt-auto flex w-full flex-col gap-3 pt-8 ${showStatusRow ? "min-h-[7.75rem]" : "min-h-[6.25rem]"} justify-end`}
              >
                {showStatusRow ? (
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
                        {t("portalCancelHint")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={handleClick}
                  disabled={buttonDisabled}
                  className={`h-12 w-full rounded-full font-app-body text-base font-semibold leading-6 transition ${
                    buttonDisabled
                      ? plan.key === "free"
                        ? "cursor-default bg-indigo-50 text-sky-700 opacity-95"
                        : "cursor-default bg-white/20 text-white disabled:cursor-not-allowed disabled:opacity-55"
                      : `${styles.button} hover:-translate-y-0.5 hover:shadow-xl`
                  }`}
                >
                  {showLoadingOnButton ? tCommon("loading") : buttonLabel}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
