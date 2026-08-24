"use client";

import LandingButton from "../hero/LandingButton";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface FinalTrainingCtaProps { onStart: () => void; }

export default function FinalTrainingCta({ onStart }: FinalTrainingCtaProps) {
  const t = useTranslations("figmaHome");
  return (
    <section className="w-full overflow-hidden rounded-t-[clamp(2rem,3.125vw,3.75rem)] bg-[#edf4fa] text-center">
      <div className="mx-auto flex w-full flex-col items-center gap-10 px-5 py-[clamp(4rem,6.0417vw,7.25rem)] sm:px-8">
        <div className="mx-auto flex w-full max-w-[89.5rem] flex-col items-center gap-5">
          <div className="flex w-full items-center justify-center gap-[clamp(1rem,2.0833vw,2.5rem)]">
            <Image
              src="/landing/final_training/cta-puzzle.svg"
              alt=""
              width={90}
              height={90}
              aria-hidden="true"
              className="h-[clamp(3.5rem,4.6875vw,5.625rem)] w-[clamp(3.5rem,4.6875vw,5.625rem)] shrink-0 rotate-180 -scale-y-100"
            />
            <h2 className="font-figma-heading text-balance text-[clamp(2.5rem,5vw,6rem)] font-bold leading-[1.05] text-[#1a1a1a]">
              {t("finalTitle")}
            </h2>
          </div>
          <p className="font-app-body mx-auto max-w-[70.25rem] text-balance text-[clamp(1rem,1.25vw,1.5rem)] font-normal leading-normal text-[#1a1a1a]">
            {t("finalDescription")}
          </p>
        </div>
        <LandingButton onClick={onStart} iconSrc="/landing/arrow.svg" className="px-8 py-3">
          {t("heroCta")}
        </LandingButton>
      </div>
    </section>
  );
}
