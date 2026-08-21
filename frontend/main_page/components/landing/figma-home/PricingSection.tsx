"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import CheckerBackground from "./CheckerBackground";

export default function PricingSection() {
  const [annual, setAnnual] = useState(true);
  const t = useTranslations("membership");
  const home = useTranslations("figmaHome");
  const suffix = annual ? t("perYear") : t("perMonth");
  const features = [home("featureRewards"), home("featureContent"), home("featureInterruptions"), home("featureCatchUp")];

  return (
    <section className="relative overflow-hidden bg-white px-5 py-20 sm:px-8 lg:py-28">
      <CheckerBackground />
      <div className="relative mx-auto w-[calc(100%-2.5rem)] max-w-[92.8125rem] sm:w-[calc(100%-4rem)]">
        <div className="text-center">
          <h2 className="font-app-body text-4xl font-bold tracking-[-0.04em] text-[#1a1a1a] sm:text-5xl">{home("pricingTitle")}</h2>
          <p className="font-app-body mt-5 text-lg text-[#1a1a1a] sm:text-2xl">{home("pricingSubtitle")}</p>
          <div className="mt-8 inline-flex rounded-full bg-[#e5edf4] p-1 text-sm font-semibold text-[#1a1a1a]">
            <button type="button" onClick={() => setAnnual(false)} className={`rounded-full px-5 py-2 transition ${!annual ? "bg-white shadow-sm" : ""}`}>{t("billingMonthly")}</button>
            <button type="button" onClick={() => setAnnual(true)} className={`rounded-full px-5 py-2 transition ${annual ? "bg-white shadow-sm" : ""}`}>{t("billingAnnually")}</button>
          </div>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[{ name: home("free"), price: "$0", tone: "bg-white text-[#1a1a1a]" }, { name: home("plus"), price: annual ? "$59" : "$6", tone: "bg-[#045e96] text-white", featured: true }, { name: home("premium"), price: annual ? "$99" : "$10", tone: "bg-[#1a1a1a] text-white" }].map((plan) => (
            <article key={plan.name} className={`relative rounded-[2rem] border border-black/10 p-8 shadow-sm ${plan.tone}`}>
              {plan.featured && <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border-2 border-[#df8d12] bg-[#ffb423] px-5 py-2 text-sm font-bold text-[#5b3303]">{t("bestValue")}</span>}
              <h3 className="font-app-body text-3xl font-bold">{plan.name}</h3>
              <p className="font-app-body mt-4 text-5xl font-bold">{plan.price}<span className="ml-2 text-base font-medium opacity-75">{suffix}</span></p>
              <p className="font-app-body mt-4 text-sm opacity-80">{t("freeTrialBadge")}</p>
              <ul className="font-app-body mt-8 space-y-4 text-base">
                {features.map((feature) => <li key={feature} className="flex gap-3"><span aria-hidden="true">✓</span>{feature}</li>)}
              </ul>
              <button type="button" className="font-app-body mt-10 w-full rounded-full bg-white px-5 py-3 font-bold text-[#045e96] transition hover:bg-[#edf4fa]">{t("startFreeTrial")}</button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
