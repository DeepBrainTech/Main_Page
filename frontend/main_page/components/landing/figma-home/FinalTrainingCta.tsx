"use client";

import LandingButton from "./LandingButton";
import { useTranslations } from "next-intl";

interface FinalTrainingCtaProps { onStart: () => void; }

export default function FinalTrainingCta({ onStart }: FinalTrainingCtaProps) {
  const t = useTranslations("figmaHome");
  return (
    <section className="bg-white text-center">
      <div className="mx-auto max-w-[120rem] rounded-t-[2.5rem] bg-[#edf4fa] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto w-full max-w-[89.5rem]">
          <h2 className="font-app-body text-balance text-4xl font-bold tracking-[-0.045em] text-[#1a1a1a] sm:text-6xl">{t("finalTitle")}</h2>
          <p className="font-app-body mx-auto mt-6 max-w-4xl text-balance text-lg leading-relaxed text-[#1a1a1a] sm:text-2xl">{t("finalDescription")}</p>
          <LandingButton onClick={onStart} className="mt-10">{t("heroCta")}</LandingButton>
        </div>
      </div>
    </section>
  );
}
