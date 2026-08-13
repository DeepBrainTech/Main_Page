"use client";

import { useEffect, useState } from "react";
import { Link } from "@/lib/i18n-navigation";
import { useTranslations } from "next-intl";
import {
  createEmptyTrainingProgress,
  getLevelProgress,
  isLevelUnlocked,
  loadTrainingProgress,
} from "@/lib/training/progress-local";
import type { TrainingProgressState, TrainingWorldDefinition } from "@/types/training";

export default function WorldPathMap({ world }: { world: TrainingWorldDefinition }) {
  const t = useTranslations("training");
  const [progress, setProgress] = useState<TrainingProgressState>(createEmptyTrainingProgress);

  useEffect(() => {
    setProgress(loadTrainingProgress());
  }, []);

  return (
    <div className="space-y-4 pb-8 font-app-body">
      <div>
        <Link href="/training" className="text-sm font-medium text-[#106FAA] hover:text-[#045E96]">
          ‹ {t("backToWorlds")}
        </Link>
        <h1 className="mt-2 font-['Titan_One'] text-3xl text-[#045E96]">{world.themeFallback}</h1>
        <p className="mt-1 text-sm text-[#106FAA]">
          {t("stageRange", { start: world.stageRange.start, end: world.stageRange.end })}
        </p>
      </div>

      <ol className="space-y-3">
        {world.levels.map((level, index) => {
          const unlocked = isLevelUnlocked(progress, world.id, level.id);
          const { bestStars } = getLevelProgress(progress, world.id, level.id);
          const href = `/training/${world.id}/${level.id}`;

          return (
            <li key={level.id}>
              {unlocked ? (
                <Link
                  href={href}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm transition hover:-translate-y-0.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#106FAA]/70">
                      {t("stageNode", { n: index + 1 })}
                    </p>
                    <p className="truncate font-semibold text-[#045E96]">{level.titleFallback}</p>
                  </div>
                  <span className="shrink-0 text-sm text-[#F5C842]">
                    {"★".repeat(bestStars)}
                    <span className="text-[#C8D4DE]">{"★".repeat(3 - bestStars)}</span>
                  </span>
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 opacity-70">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {t("stageNode", { n: index + 1 })}
                    </p>
                    <p className="truncate font-semibold text-slate-500">{level.titleFallback}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-400">{t("locked")}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
