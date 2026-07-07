"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCognitiveScores } from "@/hooks/useCognitiveScores";
import { useMapProgress } from "@/hooks/useMapProgress";
import type { MapLevelConfig } from "@/config/mapLevels";
import { MAP_LEVELS, TOTAL_MAP_LEVELS } from "@/config/mapLevels";
import BrainpowerPanel from "@/components/features/dashboard/BrainpowerPanel";
import { MapChallengeRunner } from "./ChallengeRunner";
import TrainingMap from "./TrainingMap";

interface TestTabProps {
  dateOfBirth?: string | null;
}

type View =
  | { mode: "hub" }
  | { mode: "map-challenge"; mapLevel: MapLevelConfig };

export default function TestTab({ dateOfBirth }: TestTabProps) {
  const t = useTranslations("test");
  const { scores, loading: scoresLoading, refresh: refreshScores } = useCognitiveScores();
  const {
    progressMap,
    loading: progressLoading,
    reload: reloadProgress,
    getStars,
    isUnlocked,
    maxUnlockedLevel,
  } = useMapProgress();

  const [view, setView] = useState<View>({ mode: "hub" });

  useEffect(() => {
    void reloadProgress();
  }, [reloadProgress]);

  const loading = scoresLoading || progressLoading;
  const completedLevels = Object.values(progressMap).filter((r) => r.stars >= 1).length;

  if (view.mode === "map-challenge") {
    return (
      <MapChallengeRunner
        key={`map-${view.mapLevel.level}`}
        mapLevel={view.mapLevel}
        previousBestScore={progressMap[view.mapLevel.level]?.best_score ?? 0}
        previousBestStars={progressMap[view.mapLevel.level]?.stars ?? 0}
        cognitiveScores={scores}
        dateOfBirth={dateOfBirth}
        onComplete={async () => {
          await Promise.all([reloadProgress(), refreshScores()]);
          setView({ mode: "hub" });
        }}
        onBack={async () => {
          await Promise.all([reloadProgress(), refreshScores()]);
          setView({ mode: "hub" });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 font-app-body lg:gap-10 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-5">
        <div className="overflow-hidden rounded-3xl bg-white shadow-md">
          <div className="bg-gradient-to-r from-[#003366] to-[#1565C0] px-6 py-5 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {t("mapTitle")}
                </h2>
                <p className="mt-0.5 text-sm text-sky-200/80">
                  {t("mapSubtitle", { completed: completedLevels, total: TOTAL_MAP_LEVELS })}
                </p>
              </div>
              {!loading && (
                <button
                  type="button"
                  onClick={() => {
                    const target = MAP_LEVELS.find((level) => isUnlocked(level.level) && getStars(level.level) === 0) ?? MAP_LEVELS[0];
                    setView({ mode: "map-challenge", mapLevel: target });
                  }}
                  className="shrink-0 rounded-full bg-[#EE664A] px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#e0553a] active:scale-[0.98]"
                >
                  {t("mapContinueBtn")}
                </button>
              )}
            </div>
          </div>

          <div className="px-4 py-4 sm:px-6">
            {loading ? (
              <div className="flex gap-6 overflow-hidden py-8">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-slate-100" />
                ))}
              </div>
            ) : (
              <TrainingMap
                progressMap={progressMap}
                maxUnlockedLevel={maxUnlockedLevel}
                onSelectLevel={(cfg) => {
                  if (isUnlocked(cfg.level)) setView({ mode: "map-challenge", mapLevel: cfg });
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="w-full shrink-0 xl:sticky xl:top-24 xl:max-w-[min(100%,calc(28rem*1.1))]">
        <BrainpowerPanel scores={scores} />
      </div>
    </div>
  );
}
