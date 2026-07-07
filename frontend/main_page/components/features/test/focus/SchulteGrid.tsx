"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { TestIntroLayout, useReportTestChrome } from "../test-ui";

interface StageConfig {
  id: string;
  size: number;
  maxNumber: number;
}

const PRACTICE_STAGE: StageConfig = { id: "practice", size: 3, maxNumber: 9 };
const FORMAL_STAGES: StageConfig[] = [
  { id: "formal-1", size: 3, maxNumber: 9 },
  { id: "formal-2", size: 4, maxNumber: 16 },
  { id: "formal-3", size: 5, maxNumber: 25 },
];

function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function shuffleNumbers(maxNumber: number) {
  const arr = Array.from({ length: maxNumber }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function toLevelScore(elapsedMs: number, wrongCount: number, maxNumber: number) {
  // 速度分：按每格平均耗时映射，越快越高。
  const perItemMs = elapsedMs / maxNumber;
  const speedNorm = clamp((1800 - perItemMs) / (1800 - 350), 0, 1);

  // 错误分：错误越少越高。
  const errorNorm = clamp(1 - wrongCount / Math.max(3, Math.round(maxNumber * 0.25)), 0, 1);

  return Math.round(100 * (speedNorm * 0.8 + errorNorm * 0.2));
}

interface SchulteGridProps {
  onComplete: (score: number) => void;
  difficultyConfig?: { gridSizes?: number[] };
}

export default function SchulteGrid({ onComplete, difficultyConfig }: SchulteGridProps) {
  const t = useTranslations("test.focus");
  const activeFormalStages = useMemo<StageConfig[]>(() => {
    const sizes = difficultyConfig?.gridSizes;
    if (!sizes || sizes.length === 0) return FORMAL_STAGES;
    return sizes.map((size) => ({
      id: `formal-${size}`,
      size,
      maxNumber: size * size,
    }));
  }, [difficultyConfig]);

  const [phase, setPhase] = useState<"intro" | "practice" | "formal">("intro");
  const [practiceSeed, setPracticeSeed] = useState(0);
  const [practiceNext, setPracticeNext] = useState(1);
  const [practiceWrong, setPracticeWrong] = useState(0);
  const [practiceStartTs, setPracticeStartTs] = useState(0);
  const [practiceDone, setPracticeDone] = useState(false);

  const [formalIndex, setFormalIndex] = useState(0);
  const [formalNext, setFormalNext] = useState(1);
  const [formalWrong, setFormalWrong] = useState(0);
  const [formalStartTs, setFormalStartTs] = useState(0);
  const [levelScores, setLevelScores] = useState<number[]>([]);

  const practiceCells = useMemo(() => shuffleNumbers(PRACTICE_STAGE.maxNumber), [practiceSeed]);
  const currentFormalStage = activeFormalStages[formalIndex];
  const formalCells = useMemo(
    () => (currentFormalStage ? shuffleNumbers(currentFormalStage.maxNumber) : []),
    [formalIndex]
  );
  const practiceProgressCurrent = clamp(practiceNext - 1, 0, PRACTICE_STAGE.maxNumber);
  const formalProgressCurrent = currentFormalStage
    ? clamp(formalNext - 1, 0, currentFormalStage.maxNumber)
    : 0;

  const startPractice = () => {
    setPracticeSeed((s) => s + 1);
    setPracticeNext(1);
    setPracticeWrong(0);
    setPracticeDone(false);
    const now = performance.now();
    setPracticeStartTs(now);
    setPhase("practice");
  };

  const restartPractice = () => {
    setPracticeSeed((s) => s + 1);
    setPracticeNext(1);
    setPracticeWrong(0);
    setPracticeDone(false);
    const now = performance.now();
    setPracticeStartTs(now);
  };

  const startFormal = () => {
    setFormalIndex(0);
    setLevelScores([]);
    setFormalNext(1);
    setFormalWrong(0);
    const now = performance.now();
    setFormalStartTs(now);
    setPhase("formal");
  };

  const handlePracticeClick = (value: number) => {
    if (practiceDone) return;
    if (value !== practiceNext) {
      setPracticeWrong((n) => n + 1);
      return;
    }

    if (practiceNext >= PRACTICE_STAGE.maxNumber) {
      // 最后一格点击后先推进到完成态，确保显示 9/9 且最后一格变绿。
      setPracticeNext(PRACTICE_STAGE.maxNumber + 1);
      setPracticeDone(true);
      return;
    }
    setPracticeNext((n) => n + 1);
  };

  const beginFormalLevel = (index: number) => {
    setFormalIndex(index);
    setFormalNext(1);
    setFormalWrong(0);
    const now = performance.now();
    setFormalStartTs(now);
  };

  const handleFormalClick = (value: number) => {
    if (!currentFormalStage) return;
    if (value !== formalNext) {
      setFormalWrong((n) => n + 1);
      return;
    }

    const now = performance.now();

    if (formalNext >= currentFormalStage.maxNumber) {
      const elapsed = now - formalStartTs;
      const levelScore = toLevelScore(elapsed, formalWrong, currentFormalStage.maxNumber);
      const nextScores = [...levelScores, levelScore];
      if (formalIndex + 1 >= activeFormalStages.length) {
        // Weighted score: smaller grids contribute less
        const weights = activeFormalStages.map((_, i) => {
          const total = activeFormalStages.length;
          return total === 1 ? 1 : (i + 1) / ((total * (total + 1)) / 2);
        });
        const finalScore = Math.round(
          nextScores.reduce((sum, s, i) => sum + (s ?? 0) * (weights[i] ?? 0), 0)
        );
        onComplete(clamp(finalScore, 0, 100));
        return;
      }
      setLevelScores(nextScores);
      beginFormalLevel(formalIndex + 1);
      return;
    }

    setFormalNext((n) => n + 1);
  };

  if (phase === "intro") {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("schulteTitle")}</h4>
        <p className="mb-4 text-sm text-gray-600">{t("schulteDesc")}</p>
        <button
          type="button"
          onClick={startPractice}
          className="rounded-lg bg-[#5E81AC] px-4 py-2 text-white"
        >
          {t("startPractice")}
        </button>
      </div>
    );
  }

  if (phase === "practice") {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("schultePracticeTitle")}</h4>
      <span className="mb-3 inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
        {t("practiceBadge")}
      </span>
      <p className="mb-2 text-sm text-gray-600">{t("schulteDesc")}</p>
      <div className="flex justify-center">
        <div>
          <p className="mb-3 text-center text-sm text-gray-500">
            {t("schulteTarget", { current: practiceProgressCurrent, total: PRACTICE_STAGE.maxNumber })}
          </p>
          <div className="grid w-fit grid-cols-3 gap-2">
          {practiceCells.map((n) => (
            <button
              key={`p-${n}`}
              type="button"
              onClick={() => handlePracticeClick(n)}
              className={`flex h-12 w-12 items-center justify-center rounded-lg border text-base font-semibold ${
                n < practiceNext ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              {n}
            </button>
          ))}
          </div>
        </div>
      </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className={`text-sm font-semibold ${practiceDone ? "text-emerald-600" : "text-gray-600"}`}>
            {practiceDone ? t("practiceFeedbackCorrect") : t("practiceNoAnswer")}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={restartPractice}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t("schulteRetryPractice")}
            </button>
            <button
              type="button"
              onClick={startFormal}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
            >
              {t("startFormal")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentFormalStage) return null;
  const colClass =
    currentFormalStage.size === 3
      ? "grid-cols-3"
      : currentFormalStage.size === 4
        ? "grid-cols-4"
        : "grid-cols-5";
  const cellSize =
    currentFormalStage.size === 3 ? "h-12 w-12 text-base" : currentFormalStage.size === 4 ? "h-11 w-11 text-sm" : "h-10 w-10 text-sm";

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">{t("schulteTitle")}</h4>
      <span className="mb-3 inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
        {t("formalBadge")}
      </span>
      <p className="mb-2 text-xs text-gray-500">
        {t("formalProgress", { current: formalIndex + 1, total: activeFormalStages.length })}
      </p>
      <div className="flex justify-center">
        <div>
          <p className="mb-3 text-center text-sm text-gray-500">
            {t("schulteTarget", { current: formalProgressCurrent, total: currentFormalStage.maxNumber })}
          </p>
          <div className={`grid w-fit gap-2 ${colClass}`}>
            {formalCells.map((n) => (
              <button
                key={`${currentFormalStage.id}-${n}`}
                type="button"
                onClick={() => handleFormalClick(n)}
                className={`flex items-center justify-center rounded-lg border font-semibold ${
                  n < formalNext ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-gray-300 hover:bg-gray-50"
                } ${cellSize}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
