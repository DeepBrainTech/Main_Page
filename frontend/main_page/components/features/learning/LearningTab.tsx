"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

export default function LearningTab() {
  const t = useTranslations("learning");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>

      <section className="rounded-2xl bg-[#FFFFFF] p-5 shadow-md">
        <h3 className="mb-4 text-2xl font-semibold text-gray-800">{t("math")}</h3>

        <div className="flex flex-wrap gap-4">
          <div className="flex w-52 flex-col items-center rounded-xl bg-white p-3 shadow-sm">
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
          </div>
        </div>
      </section>
    </div>
  );
}
