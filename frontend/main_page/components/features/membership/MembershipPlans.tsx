"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

export type MembershipPlan = "free" | "plus" | "premium";

interface MembershipPlansProps {
  currentPlan: MembershipPlan;
  onPlanChange: (plan: MembershipPlan) => void;
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
  price: string;
  bestValue?: boolean;
  features: PlanFeature[];
};

const planConfigs: PlanConfig[] = [
  {
    key: "free",
    price: "$0",
    features: [
      { titleKey: "features.noDailyDiamonds.title", descriptionKey: "features.noDailyDiamonds.description", enabled: false, marker: "notIncluded" },
      { titleKey: "features.payPerCourse.title", descriptionKey: "features.payPerCourse.description", enabled: true, marker: "lock" },
      { titleKey: "features.adsIncluded.title", enabled: false, marker: "notIncluded" },
    ],
  },
  {
    key: "plus",
    price: "$4.99",
    features: [
      { titleKey: "features.dailyDiamonds.title", descriptionKey: "features.dailyDiamonds.description", enabled: true, icon: "diamond" },
      { titleKey: "features.payPerCourse.title", descriptionKey: "features.payPerCourse.description", enabled: true, marker: "lock" },
      { titleKey: "features.adFree.title", descriptionKey: "features.adFree.description", enabled: true },
      { titleKey: "features.catchUp.title", descriptionKey: "features.catchUp.description", enabled: true },
    ],
  },
  {
    key: "premium",
    price: "$6.99",
    bestValue: true,
    features: [
      { titleKey: "features.premiumRewards.title", descriptionKey: "features.dailyDiamonds.description", enabled: true, icon: "diamond" },
      { titleKey: "features.allContent.title", descriptionKey: "features.allContent.description", enabled: true },
      { titleKey: "features.adFree.title", descriptionKey: "features.adFree.description", enabled: true },
      { titleKey: "features.catchUp.title", descriptionKey: "features.catchUp.description", enabled: true },
    ],
  },
];

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

export default function MembershipPlans({ currentPlan, onPlanChange }: MembershipPlansProps) {
  const t = useTranslations("membership");

  return (
    <section className="mx-auto w-full max-w-6xl px-1 py-6 sm:px-3 lg:py-10">
      <div className="mx-auto mb-7 max-w-2xl text-center sm:mb-9">
        <h1 className="font-app-body text-3xl font-bold leading-tight text-[#0070C8] sm:text-4xl lg:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-2 font-app-body text-sm font-normal leading-6 text-sky-700 sm:text-lg">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
        {planConfigs.map((plan) => {
          const styles = planStyles[plan.key];
          const isCurrent = currentPlan === plan.key;
          const actionLabelKey =
            currentPlan === "premium" && plan.key === "plus" ? "downgradeToPlus" : `actions.${plan.key}`;

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
                    <span className={`font-app-body text-4xl font-bold leading-10 ${styles.price}`}>{plan.price}</span>
                    <span className={`pb-1 font-app-body text-sm font-normal leading-6 sm:text-base ${styles.subtext}`}>{t("perMonth")}</span>
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

              <div className="mt-8 h-[6.25rem] space-y-3">
                <button
                  type="button"
                  onClick={() => onPlanChange(plan.key)}
                  disabled={isCurrent}
                  className={`h-12 w-full rounded-full font-app-body text-base font-semibold leading-6 transition ${
                    isCurrent
                      ? plan.key === "free"
                        ? "cursor-default bg-indigo-50 text-sky-700 opacity-95"
                        : "cursor-default bg-white/20 text-white"
                      : `${styles.button} hover:-translate-y-0.5 hover:shadow-xl`
                  }`}
                >
                  {isCurrent ? t("currentPlan") : t(actionLabelKey)}
                </button>

                {isCurrent && plan.key !== "free" ? (
                  <button
                    type="button"
                    onClick={() => onPlanChange("free")}
                    className="h-10 w-full rounded-full border border-white/30 bg-white/10 font-app-body text-sm font-medium leading-5 text-white transition hover:bg-white/15"
                  >
                    {t("cancelSubscription")}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
