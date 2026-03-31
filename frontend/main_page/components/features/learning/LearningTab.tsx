"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function LearningTab() {
  const t = useTranslations("learning");
  const [showMentalMathCategories, setShowMentalMathCategories] = useState(false);

  const categoryKeys = [
    "assessment",
    "makingWhole",
    "breakIntoParts",
    "rearrange",
    "roundAndAdjust",
    "leftToRightFlow",
  ] as const;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>

      <section className="rounded-2xl bg-[#FFFFFF] p-5 shadow-md">
        {!showMentalMathCategories ? (
          <>
            <h3 className="mb-4 text-2xl font-semibold text-gray-800">{t("math")}</h3>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => setShowMentalMathCategories(true)}
                className="flex w-52 flex-col items-center rounded-xl bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="h-32 w-full overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    src="/learning/mental_math/mental_math.png"
                    alt={t("mentalMath")}
                    width={208}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="mt-2 text-1xl font-medium text-gray-800">{t("mentalMath")}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 inline-flex items-center gap-2 text-2xl font-semibold text-gray-800">
              <button
                type="button"
                onClick={() => setShowMentalMathCategories(false)}
                className="transition hover:text-blue-700"
              >
                {t("math")}
              </button>
              <span className="text-gray-400">-</span>
              <span>{t("mentalMath")}</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {categoryKeys.map((key) => (
                <div key={key} className="flex w-52 flex-col items-center rounded-xl bg-white p-3 shadow-sm">
                  <div className="h-32 w-full overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src="/learning/mental_math/mental_math.png"
                      alt={t(`mentalMathCategories.${key}`)}
                      width={208}
                      height={128}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="mt-2 text-center text-base font-medium text-gray-800">
                    {t(`mentalMathCategories.${key}`)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
