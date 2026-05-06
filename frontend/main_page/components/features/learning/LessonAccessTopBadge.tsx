"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { LearningAccess } from "@/lib/learningUnlock";

type LessonAccessTopBadgeProps = {
  access: LearningAccess;
  /** Lesson 0 (assessment) and Lesson 1 (making whole) always show the Free label */
  isAlwaysFreeLesson: boolean;
};

/**
 * Top-right label on Mental Math lesson cards: Free, timed days left, Full Access, or PREMIUM.
 */
export default function LessonAccessTopBadge({ access, isAlwaysFreeLesson }: LessonAccessTopBadgeProps) {
  const t = useTranslations("learning.home");

  if (isAlwaysFreeLesson) {
    return (
      <span className="absolute right-2 top-2 rounded-md bg-[#4ADE80] px-2 py-0.5 text-sm font-semibold text-white">
        {t("statusFree")}
      </span>
    );
  }

  if (access.bundleUnlocked) {
    if (access.badge === "premium") {
      return (
        <div className="absolute right-2 top-2 z-[1] flex items-center gap-[5px] rounded-[5px] bg-lime-950 px-2 py-1">
          <span className="relative h-3.5 w-3.5 shrink-0 overflow-hidden">
            <Image src="/membership/crown.svg" alt="" width={14} height={14} className="object-contain" aria-hidden />
          </span>
          <span className="text-center text-sm font-bold leading-none text-amber-400">{t("accessBadgePremium")}</span>
        </div>
      );
    }
    if (access.badge === "full") {
      return (
        <div className="absolute right-2 top-2 z-[1] flex h-6 min-w-[5rem] items-center justify-center rounded-[5px] bg-indigo-50 px-2">
          <span className="text-center text-sm font-semibold leading-none text-sky-700">{t("accessBadgeFullAccess")}</span>
        </div>
      );
    }
    if (access.badge === "timed" && access.daysLeft !== null) {
      return (
        <div className="absolute right-2 top-2 z-[1] flex h-6 min-w-[6rem] items-center justify-center rounded-[5px] bg-amber-100 px-2">
          <span className="text-center text-sm font-semibold leading-none text-amber-600">
            {t("accessBadgeDaysLeft", { days: access.daysLeft })}
          </span>
        </div>
      );
    }
  }

  return null;
}
