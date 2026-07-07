"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import { useCognitiveScores } from "@/hooks/useCognitiveScores";
import { useMapProgress } from "@/hooks/useMapProgress";
import type { MapLevelConfig } from "@/config/mapLevels";
import { TOTAL_MAP_LEVELS, MAP_LEVELS } from "@/config/mapLevels";
import BrainpowerPanel from "@/components/features/dashboard/BrainpowerPanel";
import { MapChallengeRunner } from "./ChallengeRunner";
import TestRunner from "./TestRunner";
import TestStartModal from "./TestStartModal";
import TrainingMap from "./TrainingMap";
import { TEST_DIMENSION_ICON_SRC, TEST_DIMENSION_RING } from "./testDimensionAssets";
import { TEST_HUB_GRID_ORDER } from "./testHubUtils";

interface TestTabProps {
  dateOfBirth?: string | null;
}

type View =
  | { mode: "hub" }
  | { mode: "map-challenge"; mapLevel: MapLevelConfig }
  | { mode: "classic"; dimension: CognitiveDimensionKey };

export default function TestTab({ dateOfBirth }: TestTabProps) {
  const t = useTranslations("test");
  const tDim = useTranslations("dimensions");
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
  const [classicModal, setClassicModal] = useState<CognitiveDimensionKey | null>(null);

  // Load map progress on mount
  useEffect(() => {
    void reloadProgress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = scoresLoading || progressLoading;
  const completedLevels = Object.values(progressMap).filter((r) => r.stars >= 1).length;

  // ── Map challenge view ────────────────────────────────────────────────────
  if (view.mode === "map-challenge") {
    const { mapLevel } = view as { mode: "map-challenge"; mapLevel: MapLevelConfig };
    return (
      <MapChallengeRunner
        key={`map-${mapLevel.level}`}
        mapLevel={mapLevel}
        previousBestScore={progressMap[mapLevel.level]?.best_score ?? 0}
        dateOfBirth={dateOfBirth}
        onComplete={() => {
          void reloadProgress();
          void refreshScores();
          setView({ mode: "hub" });
        }}
        onBack={() => {
          void reloadProgress();
          setView({ mode: "hub" });
        }}
      />
    );
  }

  // ── Classic (full test) view ──────────────────────────────────────────────
  if (view.mode === "classic") {
    const { dimension } = view as { mode: "classic"; dimension: CognitiveDimensionKey };
    return (
      <TestRunner
        dimension={dimension}
        onBack={() => { void refreshScores(); setView({ mode: "hub" }); }}
        dateOfBirth={dateOfBirth}
      />
    );
  }

  // ── Hub view ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8 font-app-body lg:gap-10 xl:flex-row xl:items-start">
      {classicModal !== null && (
        <TestStartModal
          dimension={classicModal}
          onClose={() => setClassicModal(null)}
          onConfirm={() => {
            setView({ mode: "classic", dimension: classicModal });
            setClassicModal(null);
          }}
        />
      )}

      {/* ── Left column ── */}
      <div className="min-w-0 flex-1 space-y-5">

        {/* ── Training Map Card ── */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-md">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#003366] to-[#1565C0] px-6 py-5 sm:px-7">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {t("mapTitle")}
                </h2>
                <p className="mt-0.5 text-sm text-sky-200/80">
                  {t("mapSubtitle", { completed: completedLevels, total: TOTAL_MAP_LEVELS })}
                </p>
              </div>
              {/* Continue button — jumps to the current active level */}
              {!loading && (
                <button
                  type="button"
                  onClick={() => {
                    const target = MAP_LEVELS.find((l) => isUnlocked(l.level) && getStars(l.level) === 0)
                      ?? MAP_LEVELS[0];
                    setView({ mode: "map-challenge", mapLevel: target });
                  }}
                  className="shrink-0 rounded-full bg-[#EE664A] px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#e0553a] active:scale-[0.98]"
                >
                  {t("mapContinueBtn")}
                </button>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="px-4 py-4 sm:px-6 max-h-[70vh] overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="space-y-4 py-8">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="mx-auto h-14 w-14 rounded-full bg-slate-100 animate-pulse" />
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

        {/* ── Classic mode entry ── */}
        <div className="rounded-3xl bg-white p-6 shadow-md sm:p-7">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#003366]">{t("challenge.dimensionProgress")}</h3>
            <span className="text-xs text-slate-400">{t("classicModeHint")}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TEST_HUB_GRID_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setClassicModal(key)}
                className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full transition group-hover:scale-105"
                  style={{ backgroundColor: TEST_DIMENSION_RING[key] }}
                >
                  <Image src={TEST_DIMENSION_ICON_SRC[key]} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                </span>
                <span className="mt-2.5 text-sm font-bold text-[#003366]">{tDim(key)}</span>
                <span className="mt-1 text-[11px] text-slate-400">{t("classicTestBtn")}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right column: Brain Power ── */}
      <div className="w-full shrink-0 xl:sticky xl:top-24 xl:max-w-[min(100%,calc(28rem*1.1))]">
        <BrainpowerPanel scores={scores} />
      </div>
    </div>
  );
}
