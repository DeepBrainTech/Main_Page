"use client";

import { useEffect, useState } from "react";
import { Link } from "@/lib/i18n-navigation";
import { useTranslations } from "next-intl";
import { TRAINING_TOTAL_STAGES, TRAINING_WORLDS } from "@/config/training/catalog";
import {
  createEmptyTrainingProgress,
  getLevelProgress,
  isLevelUnlocked,
  loadTrainingProgress,
} from "@/lib/training/progress-local";
import type { TrainingProgressState } from "@/types/training";

export default function TrainingTab() {
  const t = useTranslations("training");
  const [progress, setProgress] = useState<TrainingProgressState>(createEmptyTrainingProgress);

  useEffect(() => {
    setProgress(loadTrainingProgress());
  }, []);

  return (
    <div className="space-y-6 pb-8 font-app-body">
      <header>
        <h1 className="font-['Titan_One'] text-3xl text-[#045E96] sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#106FAA] sm:text-base">{t("subtitle")}</p>
        <p className="mt-1 text-xs text-[#106FAA]/80">
          {t("catalogSummary", { worlds: TRAINING_WORLDS.length, stages: TRAINING_TOTAL_STAGES })}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {TRAINING_WORLDS.map((world) => {
          const firstLevel = world.levels[0];
          const unlocked = firstLevel
            ? isLevelUnlocked(progress, world.id, firstLevel.id)
            : false;
          const cleared = world.levels.filter(
            (l) => getLevelProgress(progress, world.id, l.id).bestStars >= 1,
          ).length;

          return (
            <div
              key={world.id}
              className={`rounded-[24px] border border-white/60 p-5 shadow-[0px_10px_15px_rgba(0,0,0,0.08)] ${
                unlocked ? "bg-white/90" : "bg-slate-50/90 opacity-80"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-[#106FAA]/70">
                {t("worldLabel", { n: world.order })}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#045E96]">{world.themeFallback}</h2>
              <p className="mt-1 text-sm text-[#106FAA]">
                {t("stageRange", {
                  start: world.stageRange.start,
                  end: world.stageRange.end,
                })}
              </p>
              <p className="mt-2 text-xs text-[#106FAA]/80">
                {t("worldProgress", { cleared, total: world.levels.length })}
              </p>
              {unlocked ? (
                <Link
                  href={`/training/${world.id}`}
                  className="mt-4 inline-flex rounded-full bg-[#045E96] px-4 py-2 text-sm font-semibold text-white"
                >
                  {t("enterWorld")}
                </Link>
              ) : (
                <span className="mt-4 inline-flex rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-500">
                  {t("locked")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
