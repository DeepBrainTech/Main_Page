"use client";

import { useTranslations } from "next-intl";

interface FinalCtaSectionProps {
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
}

/**
 * Landing 收尾号召区块
 */
export default function FinalCtaSection({
  onPrimaryClick,
  onSecondaryClick,
}: FinalCtaSectionProps) {
  const t = useTranslations("beforeloginV2.finalCta");

  return (
    <section className="px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl rounded-3xl bg-white/65 px-6 py-8 text-center shadow-md backdrop-blur-sm">
        <h2 className="text-2xl font-black text-[#0B4F84] sm:text-3xl">{t("title")}</h2>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={onPrimaryClick}
            className="rounded-full bg-[#E76F51] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#d45d3f]"
          >
            {t("primaryCta")}
          </button>
          <button
            onClick={onSecondaryClick}
            className="rounded-full border border-[#7a9fbc] bg-white px-6 py-2.5 text-sm font-bold text-[#0B4F84] transition hover:bg-[#eef4fa]"
          >
            {t("secondaryCta")}
          </button>
        </div>
      </div>
    </section>
  );
}
