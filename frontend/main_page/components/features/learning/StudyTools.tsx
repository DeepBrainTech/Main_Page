"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

export default function StudyTools() {
  const t = useTranslations("learning.home");

  return (
    <section aria-labelledby="learning-studyTools-heading" className="min-w-0 space-y-6 font-app-body">
      <h2 id="learning-studyTools-heading" className="text-3xl font-medium text-[#106FAA] lg:text-4xl">
        {t("studyToolsHeading")}
      </h2>

      <article className="relative isolate flex min-h-[18.5rem] flex-col items-start overflow-hidden rounded-2xl p-6 text-white shadow-[0_2px_6px_rgba(0,0,0,0.06)]" style={{ backgroundImage: "linear-gradient(117.11deg, #6618CC 5.8239%, #955CE0 97.731%)" }}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-[171.087px] -top-[170px] -z-10 flex size-[388.754px] items-center justify-center">
          <Image src="/learning/study-tool-ring-outer.svg" alt="" width={388.754} height={388.754} className="absolute max-w-none opacity-30" />
          <Image src="/learning/study-tool-ring-middle.svg" alt="" width={282.474} height={282.474} className="absolute max-w-none opacity-30" />
          <Image src="/learning/study-tool-ring-inner.svg" alt="" width={176.609} height={176.609} className="absolute max-w-none opacity-30" />
        </div>
        <p className="text-base font-medium">{t("studyTools.ai.category")}</p>
        <h3 className="mt-5 break-words text-[2rem] font-medium leading-tight">{t("studyTools.ai.title")}</h3>
        <p className="mt-3 text-base leading-5">{t("studyTools.ai.description")}</p>
        <div className="mt-auto pt-6">
          <button type="button" disabled className="flex min-h-9 cursor-not-allowed items-center gap-2 rounded-xl bg-white px-[1.375rem] py-1.5 text-base font-semibold text-[#6F24D0]">
            {t("resourcesComingSoon")}
            <Image src="/learning/study-tool-sparkles.svg" alt="" width={20} height={20} aria-hidden="true" />
          </button>
        </div>
      </article>

      <article className="relative isolate flex min-h-[18.5rem] flex-col items-start overflow-hidden rounded-2xl p-6 text-white shadow-[0_2px_6px_rgba(0,0,0,0.06)]" style={{ backgroundImage: "linear-gradient(149.85deg, #38ACFF 0%, #37A9FE 7.6923%, #36A7FD 15.385%, #35A4FC 23.077%, #34A1FB 30.769%, #339EFB 38.462%, #329CFA 46.154%, #3199F9 53.846%, #3196F8 61.538%, #3093F7 69.231%, #2F90F6 76.923%, #2E8EF5 84.615%, #2E8BF4 92.308%, #2D88F3 100%)" }}>
        <Image src="/learning/study-tool-book.svg" alt="" width={212} height={203.672} aria-hidden="true" className="pointer-events-none absolute -right-[34px] -top-[37px] -z-10 max-w-none" />
        <p className="text-base font-medium">{t("studyTools.practice.category")}</p>
        <h3 className="mt-5 break-words text-[2rem] font-medium leading-tight">{t("studyTools.practice.title")}</h3>
        <p className="mt-3 text-base leading-5">{t("studyTools.practice.description")}</p>
        <div className="mt-auto pt-6">
          <button type="button" disabled className="min-h-9 cursor-not-allowed rounded-xl bg-white px-[1.375rem] py-1.5 text-base font-semibold text-[#3193F7]">
            {t("resourcesComingSoon")}
          </button>
        </div>
      </article>
    </section>
  );
}
