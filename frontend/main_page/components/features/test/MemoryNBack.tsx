"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type NBackMode = "grid" | "letter";

interface MemoryNBackProps {
  onComplete: (score: number) => void;
}

interface FormalStats {
  tp: number;
  tn: number;
  fp: number;
  fn: number;
}

const PRACTICE_INTERVAL_MS = 2000;
const FORMAL_INTERVAL_MS = 2000;
const MATCH_RATE = 0.35;
const FORMAL_BASE_SEED = 20260316;
const FIXED_LEVEL = 2;
const FORMAL_LEVELS: number[] = Array.from({ length: 20 }, () => FIXED_LEVEL);
const LEVEL_WEIGHTS: Record<number, number> = {
  1: 1.0,
  2: 1.3,
  3: 1.7,
};

function clampScore(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function getPool(mode: NBackMode) {
  return mode === "letter"
    ? ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"]
    : Array.from({ length: 9 }, (_, i) => String(i));
}

// 使用可复现伪随机，保证固定 seed 下题目序列可复现。
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function createStimulus(
  mode: NBackMode,
  level: number,
  history: string[],
  wantMatch: boolean,
  rand: () => number
) {
  const pool = getPool(mode);
  const canMatch = history.length >= level;
  const shouldMatch = canMatch && wantMatch;
  const target = canMatch ? history[history.length - level] : null;

  if (shouldMatch && target) {
    return { current: target, isMatch: true };
  }

  let candidate = pool[Math.floor(rand() * pool.length)];
  while (target && candidate === target && pool.length > 1) {
    candidate = pool[Math.floor(rand() * pool.length)];
  }

  return { current: candidate, isMatch: false };
}

export default function MemoryNBack({ onComplete }: MemoryNBackProps) {
  const t = useTranslations("test.memory");

  const [phase, setPhase] = useState<"intro" | "practice" | "formal" | "result">("intro");

  const [practiceMode, setPracticeMode] = useState<NBackMode>("grid");
  const [practiceRunning, setPracticeRunning] = useState(false);
  const [practiceStream, setPracticeStream] = useState<string[]>([]);
  const [practiceCurrent, setPracticeCurrent] = useState<string | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState<"correct" | "wrong" | "wait" | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [formalMode, setFormalMode] = useState<NBackMode>("grid");
  const [formalFixedMode, setFormalFixedMode] = useState<NBackMode>("grid");
  const [formalHistory, setFormalHistory] = useState<string[]>([]);
  const [formalCurrent, setFormalCurrent] = useState<string | null>(null);
  const [isFormalRunning, setIsFormalRunning] = useState(false);
  const [hasMarkedSame, setHasMarkedSame] = useState(false);
  const hasMarkedSameRef = useRef(false);

  const [stats, setStats] = useState<FormalStats>({ tp: 0, tn: 0, fp: 0, fn: 0 });
  const [rawScore, setRawScore] = useState(0);
  const [ageNormScore, setAgeNormScore] = useState(0);
  const [percentileLikeScore, setPercentileLikeScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const practiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formalRandRef = useRef<() => number>(() => Math.random());

  // 正式阶段计分累积器。
  const scoredCorrectCountRef = useRef(0);
  const weightedTotalRef = useRef(0);
  const weightedCorrectRef = useRef(0);
  const nonMatchScoredRef = useRef(0);
  const falseAlarmScoredRef = useRef(0);

  const totalQuestions = FORMAL_LEVELS.length;

  const resetPractice = () => {
    setPracticeStream([]);
    setPracticeCurrent(null);
    setPracticeRunning(true);
    setPracticeFeedback(null);
  };

  const startFormal = () => {
    setCurrentIndex(0);
    setFormalFixedMode(practiceMode);
    setFormalMode(practiceMode);
    setFormalHistory([]);
    setFormalCurrent(null);
    setHasMarkedSame(false);
    hasMarkedSameRef.current = false;

    setStats({ tp: 0, tn: 0, fp: 0, fn: 0 });
    setRawScore(0);
    setAgeNormScore(0);
    setPercentileLikeScore(0);
    setDisplayScore(0);

    // 固定 seed；不同模式给不同偏移，避免两模式题面完全一致。
    formalRandRef.current = mulberry32(
      FORMAL_BASE_SEED + (practiceMode === "grid" ? 0 : 10007)
    );

    scoredCorrectCountRef.current = 0;
    weightedTotalRef.current = 0;
    weightedCorrectRef.current = 0;
    nonMatchScoredRef.current = 0;
    falseAlarmScoredRef.current = 0;

    setIsFormalRunning(false);
    setPhase("formal");
  };

  const beginFormalRun = () => {
    setIsFormalRunning(true);
  };

  // 练习阶段：按固定节拍自动播放 stimulus，支持即时自测反馈。
  useEffect(() => {
    if (phase !== "practice" || !practiceRunning) {
      if (practiceTimerRef.current) {
        clearTimeout(practiceTimerRef.current);
        practiceTimerRef.current = null;
      }
      return;
    }

    const pool = getPool(practiceMode);
    practiceTimerRef.current = setTimeout(() => {
      setPracticeStream((prev) => {
        const idx = prev.length;
        const canMatch = idx >= FIXED_LEVEL;
        const shouldMatch = canMatch && Math.random() < MATCH_RATE;

        let next = pool[Math.floor(Math.random() * pool.length)];
        if (shouldMatch) {
          next = prev[idx - FIXED_LEVEL];
        } else if (canMatch) {
          const target = prev[idx - FIXED_LEVEL];
          while (next === target && pool.length > 1) {
            next = pool[Math.floor(Math.random() * pool.length)];
          }
        }

        setPracticeCurrent(next);
        setPracticeFeedback(null);
        return [...prev, next];
      });
    }, PRACTICE_INTERVAL_MS);

    return () => {
      if (practiceTimerRef.current) {
        clearTimeout(practiceTimerRef.current);
        practiceTimerRef.current = null;
      }
    };
  }, [phase, practiceRunning, practiceMode, practiceStream.length]);

  // 正式阶段：固定题单（20 题，全部 2-back）。
  useEffect(() => {
    if (phase !== "formal" || !isFormalRunning) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (currentIndex >= totalQuestions) {
      return;
    }

    const mode: NBackMode = formalFixedMode;
    const level = FIXED_LEVEL;
    const wantMatch = formalRandRef.current() < MATCH_RATE;
    const generated = createStimulus(mode, level, formalHistory, wantMatch, formalRandRef.current);

    setFormalMode(mode);
    setFormalCurrent(generated.current);
    setHasMarkedSame(false);
    hasMarkedSameRef.current = false;

    timerRef.current = setTimeout(() => {
      const clickedSame = hasMarkedSameRef.current;
      const isCorrect =
        (clickedSame && generated.isMatch) || (!clickedSame && !generated.isMatch);

      setStats((prev) => {
        const next = { ...prev };
        if (clickedSame && generated.isMatch) next.tp += 1;
        else if (!clickedSame && !generated.isMatch) next.tn += 1;
        else if (clickedSame && !generated.isMatch) next.fp += 1;
        else next.fn += 1;
        return next;
      });

      const weight = LEVEL_WEIGHTS[level];
      if (isCorrect) scoredCorrectCountRef.current += 1;
      weightedTotalRef.current += weight;
      if (isCorrect) weightedCorrectRef.current += weight;

      if (!generated.isMatch) {
        nonMatchScoredRef.current += 1;
        if (clickedSame) falseAlarmScoredRef.current += 1;
      }

      const isLast = currentIndex + 1 >= totalQuestions;
      if (isLast) {
        const weightedAccuracy =
          weightedTotalRef.current > 0
            ? weightedCorrectRef.current / weightedTotalRef.current
            : 0;
        const falseAlarmRate =
          nonMatchScoredRef.current > 0
            ? falseAlarmScoredRef.current / nonMatchScoredRef.current
            : 0;

        let penaltyFactor = 1;
        if (falseAlarmRate > 0.5) penaltyFactor = 0.7;
        else if (falseAlarmRate > 0.35) penaltyFactor = 0.85;

        const computedRaw = scoredCorrectCountRef.current;
        const computedAgeNorm = computedRaw;
        const computedPercentile = Math.round(weightedAccuracy * 100);
        const computedDisplay = clampScore(
          Math.round(computedPercentile * penaltyFactor),
          0,
          100
        );

        setRawScore(computedRaw);
        setAgeNormScore(computedAgeNorm);
        setPercentileLikeScore(computedPercentile);
        setDisplayScore(computedDisplay);

        onComplete(computedDisplay);
        setIsFormalRunning(false);
        setPhase("result");
      } else {
        setCurrentIndex((idx) => idx + 1);
      }

      setFormalHistory((prev) => [...prev, generated.current]);
    }, FORMAL_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    phase,
    isFormalRunning,
    currentIndex,
    formalHistory,
    formalFixedMode,
    onComplete,
    totalQuestions,
  ]);

  const handlePracticeSame = () => {
    if (!practiceRunning || !practiceCurrent) return;

    const idx = practiceStream.length - 1;
    if (idx < FIXED_LEVEL) {
      setPracticeFeedback("wait");
      return;
    }

    const actual = practiceStream[idx] === practiceStream[idx - FIXED_LEVEL];
    setPracticeFeedback(actual ? "correct" : "wrong");
  };

  const handleFormalSame = () => {
    if (!isFormalRunning) return;
    setHasMarkedSame(true);
    hasMarkedSameRef.current = true;
  };

  // 空格键作为 Match 快捷键；默认不按键即表示 Different。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      if (phase === "practice" && practiceRunning) {
        event.preventDefault();
        handlePracticeSame();
      } else if (phase === "formal" && isFormalRunning) {
        event.preventDefault();
        handleFormalSame();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, practiceRunning, isFormalRunning, practiceStream, practiceCurrent]);

  const renderSequence = (
    mode: NBackMode,
    level: number,
    current: string | null,
    showHint = true
  ) => {
    const value = current ?? "";
    const hasValue = value !== "";

    if (mode === "grid") {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium ${
                  hasValue && String(i) === value
                    ? "border-[#5E81AC] bg-[#5E81AC] text-white animate-pulse"
                    : "border-gray-200 bg-gray-50 text-gray-400"
                }`}
              />
            ))}
          </div>
          {showHint && <p className="text-xs text-gray-500">{t("nBackHintGrid", { level })}</p>}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center">
          <div className="flex h-[136px] w-[136px] items-center justify-center rounded-xl border-2 border-[#5E81AC] bg-white text-5xl font-bold text-[#5E81AC] animate-pulse">
            {value || "\u00A0"}
          </div>
        </div>
        {showHint && <p className="text-xs text-gray-500">{t("nBackHintLetter", { level })}</p>}
      </div>
    );
  };

  if (phase === "intro") {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("nBackTitle")}</h4>
        <p className="mb-3 text-sm text-gray-600">{t("nBackIntro1")}</p>
        <button
          type="button"
          onClick={() => {
            setPhase("practice");
            resetPractice();
          }}
          className="rounded-lg bg-[#5E81AC] px-4 py-2 text-sm font-medium text-white hover:bg-[#4E719C]"
        >
          {t("startPractice")}
        </button>
      </div>
    );
  }

  if (phase === "practice") {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("nBackPracticeTitle")}</h4>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#5E81AC]">
          {t("nBackPracticeBadge")}
        </p>
        <p className="mb-4 text-sm text-gray-600">{t("nBackPracticeDesc")}</p>
        <p className="mb-4 text-xs text-gray-500">{t("nBackFixedLevelHint", { level: FIXED_LEVEL })}</p>

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setPracticeMode("grid");
              resetPractice();
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              practiceMode === "grid"
                ? "bg-[#5E81AC] text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t("practiceModeGrid")}
          </button>
          <button
            type="button"
            onClick={() => {
              setPracticeMode("letter");
              resetPractice();
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              practiceMode === "letter"
                ? "bg-[#5E81AC] text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t("practiceModeLetter")}
          </button>
        </div>

        <div className="mb-4">{renderSequence(practiceMode, FIXED_LEVEL, practiceCurrent)}</div>

        <p className="mb-3 text-sm font-medium text-gray-700">
          {t("nBackQuestion", { level: FIXED_LEVEL })}
        </p>
        <p className="mb-2 text-xs text-gray-500">{t("practiceStreamHint")}</p>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={resetPractice}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t("resetPractice")}
          </button>
          <button
            type="button"
            onClick={handlePracticeSame}
            className="rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
          >
            {t("answerSame")}
          </button>
          <button
            type="button"
            onClick={startFormal}
            className="ml-auto rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            {t("startFormal")}
          </button>
        </div>

        {practiceRunning && <p className="text-xs text-gray-500">{t("answerSameWhenMatch")}</p>}
        {practiceFeedback && (
          <p
            className={`mt-2 text-xs font-medium ${
              practiceFeedback === "correct"
                ? "text-emerald-600"
                : practiceFeedback === "wrong"
                  ? "text-red-600"
                  : "text-gray-500"
            }`}
          >
            {practiceFeedback === "correct"
              ? t("practiceFeedbackCorrect")
              : practiceFeedback === "wrong"
                ? t("practiceFeedbackWrong")
                : t("practiceFeedbackWait")}
          </p>
        )}
      </div>
    );
  }

  if (phase === "formal") {
    const progressPercent = isFormalRunning
      ? Math.round((Math.min(currentIndex + 1, totalQuestions) / totalQuestions) * 100)
      : 0;

    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 text-center font-semibold text-gray-800">{t("nBackTitle")}</h4>
        <p className="mb-3 text-center text-xs text-gray-500">
          {t("nBackFixedLevelHint", { level: FIXED_LEVEL })}
        </p>
        <div className="mb-4 flex justify-center">
          {renderSequence(formalMode, FIXED_LEVEL, formalCurrent, false)}
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleFormalSame}
              disabled={!isFormalRunning}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                hasMarkedSame
                  ? "bg-[#5E81AC] text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              } ${!isFormalRunning ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {t("answerSame")}
            </button>
            {!isFormalRunning && (
              <button
                type="button"
                onClick={beginFormalRun}
                className="rounded-lg bg-[#5E81AC] px-5 py-2 text-sm font-medium text-white hover:bg-[#4E719C]"
              >
                {t("startNow")}
              </button>
            )}
          </div>
          <div
            className="w-full max-w-xs"
            aria-label={t("formalProgress", { current: progressPercent, total: 100 })}
          >
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-[#5E81AC] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">{t("nBackResultTitle")}</h4>
      <p className="mb-4 text-sm text-gray-600">{t("nBackResultDesc")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">{t("rawScoreLabel")}</p>
          <p className="text-lg font-semibold text-gray-800">{rawScore}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">{t("ageNormScoreLabel")}</p>
          <p className="text-lg font-semibold text-gray-800">{ageNormScore}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">{t("percentileLikeScoreLabel")}</p>
          <p className="text-lg font-semibold text-gray-800">{percentileLikeScore}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">{t("displayScoreLabel")}</p>
          <p className="text-lg font-semibold text-[#5E81AC]">{displayScore}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <p className="text-xs text-gray-500">TP: {stats.tp}</p>
        <p className="text-xs text-gray-500">TN: {stats.tn}</p>
        <p className="text-xs text-gray-500">FP: {stats.fp}</p>
        <p className="text-xs text-gray-500">FN: {stats.fn}</p>
      </div>
      <p className="mt-4 text-xs text-gray-500">{t("displayScoreHint")}</p>
    </div>
  );
}
