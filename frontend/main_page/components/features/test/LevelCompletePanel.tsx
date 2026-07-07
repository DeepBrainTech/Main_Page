"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { computeStars, computeMapStars } from "@/config/difficultyLevels";
import { TOTAL_MAP_LEVELS } from "@/config/mapLevels";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import type { SubTestKey } from "@/types/progression";

export interface LevelCompleteSubTestResult {
  subTestKey: string;
  dimension: CognitiveDimensionKey;
  difficulty: number;
  rawScore: number;
  mapScore: number;
  stars: 0 | 1 | 2 | 3;
  total?: number;
  correct?: number;
  wrong?: number;
  completed?: number;
  avgRtMs?: number | null;
  medianRtMs?: number | null;
  bestRtMs?: number | null;
}

export interface LevelCompletePowerGain {
  dimension: CognitiveDimensionKey;
  before: number;
  after: number;
  gain: number;
}

interface LevelCompletePanelProps {
  subTestKey: SubTestKey;
  level: number;
  score: number;
  previousBestScore: number;
  onContinue: () => void;
  onBack: () => void;
  mapLevel?: number;
  powerScoreBefore?: number;
  powerScoreAfter?: number;
  subTestResults?: LevelCompleteSubTestResult[];
  powerGains?: LevelCompletePowerGain[];
}

function StarIcon({ filled, delay }: { filled: boolean; delay: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-12 w-12 transition-all duration-300 ${
        visible
          ? filled
            ? "scale-110 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]"
            : "scale-100 text-slate-200"
          : "scale-50 opacity-0"
      }`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function ScoreCounter({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 30;
    const interval = duration / steps;
    let step = 0;
    const id = setInterval(() => {
      step += 1;
      setDisplay(Math.round((step / steps) * target));
      if (step >= steps) clearInterval(id);
    }, interval);
    return () => clearInterval(id);
  }, [target]);

  return <>{display}</>;
}

function BrainIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M9 4.5A3.5 3.5 0 0 0 5.5 8v.2A3.5 3.5 0 0 0 4 14.7V15a4 4 0 0 0 7.4 2.1" strokeLinecap="round" />
      <path d="M15 4.5A3.5 3.5 0 0 1 18.5 8v.2A3.5 3.5 0 0 1 20 14.7V15a4 4 0 0 1-7.4 2.1" strokeLinecap="round" />
      <path d="M12 5v14M8 9.5c1.2.1 2.1.7 2.7 1.8M16 9.5c-1.2.1-2.1.7-2.7 1.8M8.2 15.5c.9-.3 1.8-.2 2.6.3M15.8 15.5c-.9-.3-1.8-.2-2.6.3" strokeLinecap="round" />
    </svg>
  );
}

function MiniStars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${count} stars`}>
      {[1, 2, 3].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 ${i <= count ? "text-yellow-400" : "text-slate-200"}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

const HEADLINE_COLORS: Record<string, string> = {
  firstTime: "text-sky-600",
  newRecord: "text-emerald-600",
  complete: "text-[#003366]",
};

const HEADLINE_BG: Record<string, string> = {
  firstTime: "from-sky-50 to-white",
  newRecord: "from-emerald-50 to-white",
  complete: "from-slate-50 to-white",
};

export default function LevelCompletePanel({
  subTestKey: _subTestKey,
  level,
  score,
  previousBestScore,
  onContinue,
  onBack,
  mapLevel,
  powerScoreBefore,
  powerScoreAfter,
  subTestResults = [],
  powerGains = [],
}: LevelCompletePanelProps) {
  const t = useTranslations("test");
  const tDimensions = useTranslations("dimensions");
  const tCommon = useTranslations("common");
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(id);
  }, []);

  const stars = mapLevel !== undefined ? computeMapStars(score, mapLevel) : computeStars(score, level);
  const isMapLevel = mapLevel !== undefined;
  const isNewRecord = score > previousBestScore && previousBestScore > 0;
  const isFirstTime = previousBestScore === 0;
  const delta = score - previousBestScore;
  const hasSubTestDetails = subTestResults.length > 0;
  const visiblePowerGains = powerGains.filter((item) => item.gain > 0);
  const hasPowerGains = powerGains.length > 0;

  const headlineKey = isFirstTime ? "firstTime" : isNewRecord ? "newRecord" : "complete";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10 font-app-body">
      <div
        className={`w-full max-w-md transition-all duration-500 ${
          entered ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div
          className={`rounded-t-3xl bg-gradient-to-b ${HEADLINE_BG[headlineKey]} px-8 pb-6 pt-8 text-center shadow-lg shadow-slate-900/10`}
        >
          <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white ${HEADLINE_COLORS[headlineKey]}`}>
            <BrainIcon />
          </div>
          <div className={`text-2xl font-bold ${HEADLINE_COLORS[headlineKey]}`}>
            {t(`levelComplete.${headlineKey}` as Parameters<typeof t>[0])}
          </div>
          <div className="mt-1 text-sm font-medium text-slate-400">
            {mapLevel !== undefined
              ? t("levelComplete.mapLevelLabel", { level: mapLevel })
              : t("levelComplete.levelLabel", { level, label: t(`challenge.difficultyLevel${level}` as Parameters<typeof t>[0]) })}
          </div>
        </div>

        <div className="rounded-b-3xl bg-white px-8 pb-8 pt-6 text-center shadow-lg shadow-slate-900/10">
          <div className="mb-5 flex justify-center gap-2">
            {[1, 2, 3].map((i) => (
              <StarIcon key={i} filled={i <= stars} delay={300 + i * 180} />
            ))}
          </div>

          {isMapLevel ? (
            <div className="mt-1">
              <div className="text-2xl font-bold text-[#003366]">
                {t(`levelComplete.starResult${stars}` as Parameters<typeof t>[0])}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-400">
                {t("levelComplete.averageScoreLabel")}
              </div>
            </div>
          ) : (
            <>
              <div className="text-6xl font-bold leading-none text-[#003366] tabular-nums">
                <ScoreCounter target={score} />
              </div>
              <div className="mt-2 text-sm font-medium text-slate-400">
                {t("levelComplete.scoreLabel")}
              </div>
            </>
          )}

          {hasPowerGains && (
            <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-left">
              <div className="text-xs font-semibold uppercase tracking-wide text-sky-500">
                {t("levelComplete.powerDetailsTitle")}
              </div>

              {visiblePowerGains.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {visiblePowerGains.map((item) => (
                    <div key={item.dimension} className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-sky-900">{tDimensions(item.dimension)}</span>
                      <span className="text-sky-700">
                        {item.before} → {item.after}
                        <span className="ml-2 font-bold text-emerald-600">+{item.gain}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm font-medium text-sky-700">
                  {t("levelComplete.noPowerGains")}
                </div>
              )}
            </div>
          )}

          {hasSubTestDetails && (
            <div className="mt-5 text-left">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("levelComplete.detailsTitle")}
              </div>
              <div className="space-y-2">
                {subTestResults.map((item, index) => (
                  <div key={`${item.subTestKey}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-800">
                          {t(`subTestLabel.${item.subTestKey}` as Parameters<typeof t>[0])}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-400">
                          {tDimensions(item.dimension)}
                        </div>
                      </div>
                      <div className="shrink-0 pt-1">
                        <div className="flex justify-end">
                          <MiniStars count={item.stars} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      {item.total !== undefined && (
                        <div className="rounded-xl bg-white px-2 py-2">
                          <div className="font-bold text-slate-800 tabular-nums">{item.total}</div>
                          <div className="mt-0.5 text-slate-400">{t("levelComplete.questions")}</div>
                        </div>
                      )}
                      {item.correct !== undefined && (
                        <div className="rounded-xl bg-white px-2 py-2">
                          <div className="font-bold text-emerald-600 tabular-nums">{item.correct}</div>
                          <div className="mt-0.5 text-slate-400">{t("levelComplete.correct")}</div>
                        </div>
                      )}
                      {item.wrong !== undefined && (
                        <div className="rounded-xl bg-white px-2 py-2">
                          <div className="font-bold text-rose-500 tabular-nums">{item.wrong}</div>
                          <div className="mt-0.5 text-slate-400">{t("levelComplete.wrong")}</div>
                        </div>
                      )}
                      {item.completed !== undefined && item.total === undefined && (
                        <div className="rounded-xl bg-white px-2 py-2">
                          <div className="font-bold text-slate-800 tabular-nums">{item.completed}</div>
                          <div className="mt-0.5 text-slate-400">{t("levelComplete.completed")}</div>
                        </div>
                      )}
                      {item.avgRtMs != null && (
                        <div className="rounded-xl bg-white px-2 py-2">
                          <div className="font-bold text-slate-800 tabular-nums">{Math.round(item.avgRtMs)}ms</div>
                          <div className="mt-0.5 text-slate-400">{t("levelComplete.avgReaction")}</div>
                        </div>
                      )}
                      {item.bestRtMs != null && (
                        <div className="rounded-xl bg-white px-2 py-2">
                          <div className="font-bold text-slate-800 tabular-nums">{Math.round(item.bestRtMs)}ms</div>
                          <div className="mt-0.5 text-slate-400">{t("levelComplete.bestReaction")}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isMapLevel && !isFirstTime && (
            <div
              className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                delta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
              }`}
            >
              <span aria-hidden="true">{delta >= 0 ? "↑" : "↓"}</span>
              {delta >= 0
                ? t("levelComplete.improved", { delta })
                : t("levelComplete.vsLast", { delta: Math.abs(delta) })}
            </div>
          )}

          {stars >= 1 && ((mapLevel !== undefined && mapLevel < TOTAL_MAP_LEVELS) || (mapLevel === undefined && level < 5)) && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700">
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M10 2a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4Zm2 6H8V6a2 2 0 1 1 4 0v2Z" />
              </svg>
              {t("levelComplete.nextUnlocked", { nextLevel: (mapLevel ?? level) + 1 })}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onContinue}
              className="w-full rounded-full bg-[#EE664A] py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md transition hover:bg-[#e0553a] active:scale-[0.98]"
            >
              {mapLevel !== undefined ? t("levelComplete.continueMap") : t("levelComplete.continue")}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full rounded-full bg-slate-100 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-200"
            >
              {tCommon("back")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
