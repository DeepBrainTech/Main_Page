"use client";

import { Link } from "@/lib/i18n-navigation";
import { useTranslations } from "next-intl";
import type { TrainingLevelDefinition, TrainingStars } from "@/types/training";

export default function LevelResultCard({
  stars,
  dimensionLabels,
  onRetry,
  worldHref,
}: {
  stars: TrainingStars;
  dimensionLabels: string[];
  onRetry: () => void;
  worldHref: string;
}) {
  const t = useTranslations("training");

  return (
    <div className="space-y-4 rounded-[24px] border border-white/60 bg-white/90 p-6 shadow-[0px_10px_15px_rgba(0,0,0,0.08)]">
      <p className="font-['Titan_One'] text-2xl text-[#045E96]">
        {"★".repeat(stars)}
        <span className="text-[#C8D4DE]">{"★".repeat(3 - stars)}</span>
      </p>
      <p className="text-sm text-[#106FAA]">{t("resultHint")}</p>
      {dimensionLabels.length > 0 ? (
        <p className="text-sm text-[#045E96]">
          {t("taggedDimensions")}: {dimensionLabels.join(" · ")}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-[#DDEDFF] px-5 py-2 text-sm font-semibold text-[#045E96]"
        >
          {t("retry")}
        </button>
        <Link
          href={worldHref}
          className="inline-flex rounded-full bg-[#045E96] px-5 py-2 text-sm font-semibold text-white"
        >
          {t("backToWorld")}
        </Link>
      </div>
    </div>
  );
}

export type { TrainingLevelDefinition };
