"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { computeStars, computeMapStars } from "@/config/difficultyLevels";
import type { SubTestKey } from "@/types/progression";

interface LevelCompletePanelProps {
  subTestKey: SubTestKey;
  level: number;
  score: number;
  previousBestScore: number;
  onContinue: () => void;
  onBack: () => void;
  /** If set, use map-level star thresholds instead of sub-test difficulty thresholds */
  mapLevel?: number;
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
}: LevelCompletePanelProps) {
  const t = useTranslations("test");
  const tCommon = useTranslations("common");
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(id);
  }, []);

  const stars = mapLevel !== undefined ? computeMapStars(score, mapLevel) : computeStars(score, level);
  const isNewRecord = score > previousBestScore && previousBestScore > 0;
  const isFirstTime = previousBestScore === 0;
  const delta = score - previousBestScore;

  const headlineKey = isFirstTime ? "firstTime" : isNewRecord ? "newRecord" : "complete";
  const headlineEmoji = isFirstTime ? "🧠" : isNewRecord ? "🏆" : "✅";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10 font-app-body">
      <div
        className={`w-full max-w-sm transition-all duration-500 ${
          entered ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        {/* Header gradient strip */}
        <div
          className={`rounded-t-3xl bg-gradient-to-b ${HEADLINE_BG[headlineKey]} px-8 pt-8 pb-6 text-center shadow-lg shadow-slate-900/10`}
        >
          <div className="text-5xl mb-3">{headlineEmoji}</div>
          <div className={`text-2xl font-bold ${HEADLINE_COLORS[headlineKey]}`}>
            {t(`levelComplete.${headlineKey}` as Parameters<typeof t>[0])}
          </div>
          <div className="mt-1 text-sm font-medium text-slate-400">
            {t("levelComplete.levelLabel", { level, label: t(`challenge.difficultyLevel${level}` as Parameters<typeof t>[0]) })}
          </div>
        </div>

        {/* Score + stars */}
        <div className="rounded-b-3xl bg-white px-8 pb-8 pt-6 shadow-lg shadow-slate-900/10 text-center">
          {/* Stars row */}
          <div className="flex justify-center gap-2 mb-5">
            {[1, 2, 3].map((i) => (
              <StarIcon key={i} filled={i <= stars} delay={300 + i * 180} />
            ))}
          </div>

          {/* Score */}
          <div className="text-6xl font-bold text-[#003366] tabular-nums leading-none">
            <ScoreCounter target={score} />
          </div>
          <div className="mt-2 text-sm text-slate-400 font-medium">{t("levelComplete.scoreLabel")}</div>

          {/* Delta vs last */}
          {!isFirstTime && (
            <div
              className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                delta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
              }`}
            >
              {delta >= 0 ? "↑" : "↓"}
              {delta >= 0
                ? t("levelComplete.improved", { delta })
                : t("levelComplete.vsLast", { delta: Math.abs(delta) })}
            </div>
          )}

          {/* Unlock next level hint */}
          {stars >= 1 && level < 5 && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700">
              <span className="text-base">🔓</span>
              {t("levelComplete.nextUnlocked", { nextLevel: level + 1 })}
            </div>
          )}

          {/* Buttons */}
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onContinue}
              className="w-full rounded-full bg-[#EE664A] py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md transition hover:bg-[#e0553a] active:scale-[0.98]"
            >
              {t("levelComplete.continue")}
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
