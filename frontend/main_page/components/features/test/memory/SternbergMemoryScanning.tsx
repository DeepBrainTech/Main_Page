"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type SetSize = 3 | 5 | 7;

interface SternbergMemoryScanningProps {
  onComplete: (score: number) => void;
  dateOfBirth?: string | null;
}

interface Trial {
  setSize: SetSize;
  memorySet: string[];
  probe: string;
  isTarget: boolean;
}

interface AggregateStats {
  correct: number;
  total: number;
  rtSum: number;
  rtCount: number;
  correctRtPairs: Array<{ setSize: SetSize; rtMs: number }>;
}

type AgeBandId = "children" | "teens" | "youngAdults" | "middleAged" | "seniors";

const SYMBOL_POOL = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
const FORMAL_COUNTS: Record<SetSize, number> = {
  3: 8,
  5: 8,
  7: 8,
};
const MEMORIZE_MS = 4000;
const DELAY_MS = 800;
const FEEDBACK_MS = 700;
const PRACTICE_SEED = 20260319;
const FORMAL_SEED = 20260320;

const AGE_NORMS_STERNBERG: Record<AgeBandId, { slopeMsPerItem: [number, number]; interceptMs: [number, number] }> = {
  children: { slopeMsPerItem: [35, 65], interceptMs: [600, 800] },
  teens: { slopeMsPerItem: [35, 45], interceptMs: [450, 550] },
  youngAdults: { slopeMsPerItem: [30, 40], interceptMs: [350, 450] },
  middleAged: { slopeMsPerItem: [35, 50], interceptMs: [400, 550] },
  seniors: { slopeMsPerItem: [50, 75], interceptMs: [600, 900] },
};

function clampScore(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// 固定 seed 的伪随机，保证题目可复现。
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildTrial(rand: () => number, setSize: SetSize, isTarget: boolean): Trial {
  const memorySet = shuffle(SYMBOL_POOL, rand).slice(0, setSize);
  const probe = isTarget
    ? memorySet[Math.floor(rand() * memorySet.length)]
    : shuffle(
        SYMBOL_POOL.filter((item) => !memorySet.includes(item)),
        rand
      )[0];
  return { setSize, memorySet, probe, isTarget };
}

function buildPracticeTrials(seed: number): Trial[] {
  const rand = mulberry32(seed);
  // 练习阶段只保留 1 题（最简单负荷）。
  return [buildTrial(rand, 3, true)];
}

function buildFormalTrials(seed: number): Trial[] {
  const rand = mulberry32(seed);
  const sizes: SetSize[] = [3, 5, 7];
  const trials: Trial[] = [];

  sizes.forEach((size) => {
    const block: Trial[] = [];
    const total = FORMAL_COUNTS[size];
    for (let i = 0; i < total; i += 1) {
      block.push(buildTrial(rand, size, i < total / 2));
    }
    trials.push(...shuffle(block, rand));
  });

  return trials;
}

function normalizeLinear(value: number, min: number, max: number) {
  if (max <= min) return 50;
  return clampScore(((value - min) / (max - min)) * 100, 0, 100);
}

function normalizeReverse(value: number, min: number, max: number) {
  return 100 - normalizeLinear(value, min, max);
}

function parseAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return null;
  const [yearStr, monthStr, dayStr] = dateOfBirth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return null;
  const now = new Date();
  let age = now.getFullYear() - year;
  const monthDiff = now.getMonth() + 1 - month;
  const dayDiff = now.getDate() - day;
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age >= 0 ? age : null;
}

function resolveAgeBand(age: number | null): AgeBandId | null {
  if (age == null) return null;
  if (age >= 8 && age <= 12) return "children";
  if (age >= 13 && age <= 18) return "teens";
  if (age >= 19 && age <= 30) return "youngAdults";
  if (age >= 60) return "seniors";
  if (age >= 31 && age <= 59) return "middleAged";
  return null;
}

function regressSlopeIntercept(points: Array<{ setSize: number; rtMs: number }>) {
  if (points.length < 3) return null;
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (const p of points) {
    sumX += p.setSize;
    sumY += p.rtMs;
    sumXY += p.setSize * p.rtMs;
    sumX2 += p.setSize * p.setSize;
  }
  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-6) return null;
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export default function SternbergMemoryScanning({ onComplete, dateOfBirth }: SternbergMemoryScanningProps) {
  const t = useTranslations("test.memory");

  const practiceTrials = useMemo(() => buildPracticeTrials(PRACTICE_SEED), []);
  const formalTrials = useMemo(() => buildFormalTrials(FORMAL_SEED), []);

  const [phase, setPhase] = useState<
    "intro" | "practice" | "formal"
  >("intro");
  const [stage, setStage] = useState<"memorize" | "delay" | "probe" | "feedback">("memorize");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [formalIndex, setFormalIndex] = useState(0);
  const [isFormalRunning, setIsFormalRunning] = useState(false);
  const [practiceCorrect, setPracticeCorrect] = useState<boolean | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [memorizeRemainMs, setMemorizeRemainMs] = useState(MEMORIZE_MS);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const probeStartRef = useRef<number>(0);
  const aggRef = useRef<AggregateStats>({
    correct: 0,
    total: 0,
    rtSum: 0,
    rtCount: 0,
    correctRtPairs: [],
  });

  const currentPracticeTrial = practiceTrials[Math.min(practiceIndex, practiceTrials.length - 1)];
  const currentFormalTrial = formalTrials[Math.min(formalIndex, formalTrials.length - 1)];
  const currentTrial = phase === "practice" ? currentPracticeTrial : currentFormalTrial;

  const resetAggregator = () => {
    aggRef.current = {
      correct: 0,
      total: 0,
      rtSum: 0,
      rtCount: 0,
      correctRtPairs: [],
    };
  };

  const startPractice = () => {
    setPracticeIndex(0);
    setPracticeCorrect(null);
    setSelectedAnswer(null);
    setMemorizeRemainMs(MEMORIZE_MS);
    setStage("memorize");
    setPhase("practice");
  };

  const startFormal = () => {
    setFormalIndex(0);
    setIsFormalRunning(false);
    setPracticeCorrect(null);
    setSelectedAnswer(null);
    setMemorizeRemainMs(MEMORIZE_MS);
    setStage("memorize");
    resetAggregator();
    setPhase("formal");
  };

  const beginFormalRun = () => {
    setSelectedAnswer(null);
    setPracticeCorrect(null);
    setMemorizeRemainMs(MEMORIZE_MS);
    setStage("memorize");
    setIsFormalRunning(true);
  };

  const finalizeFormal = () => {
    const accuracy = aggRef.current.total > 0 ? aggRef.current.correct / aggRef.current.total : 0;
    const avgRt = aggRef.current.rtCount > 0 ? aggRef.current.rtSum / aggRef.current.rtCount : 0;
    const regression = regressSlopeIntercept(aggRef.current.correctRtPairs);
    const slopeMs = regression?.slope ?? 55;
    const interceptMs = regression?.intercept ?? (avgRt > 0 ? avgRt : 750);

    const accuracyScore = accuracy * 100;
    const slopeScore = normalizeReverse(slopeMs, 25, 90);
    const interceptScore = normalizeReverse(interceptMs, 300, 1100);
    const abilityScore = Math.round(accuracyScore * 0.5 + slopeScore * 0.3 + interceptScore * 0.2);

    const ageBand = resolveAgeBand(parseAge(dateOfBirth));
    const agePercentile =
      ageBand == null
        ? null
        : Math.round(
            accuracyScore * 0.5 +
              normalizeReverse(
                slopeMs,
                AGE_NORMS_STERNBERG[ageBand].slopeMsPerItem[0],
                AGE_NORMS_STERNBERG[ageBand].slopeMsPerItem[1]
              ) *
                0.3 +
              normalizeReverse(
                interceptMs,
                AGE_NORMS_STERNBERG[ageBand].interceptMs[0],
                AGE_NORMS_STERNBERG[ageBand].interceptMs[1]
              ) *
                0.2
          );

    const computedDisplay = clampScore(
      Math.round(abilityScore * 0.7 + (agePercentile ?? abilityScore) * 0.3),
      0,
      100
    );

    onComplete(computedDisplay);
    setIsFormalRunning(false);
  };

  const recordFormalAnswer = (answer: boolean | null, rtMs: number | null) => {
    const isCorrect = answer !== null && answer === currentFormalTrial.isTarget;
    aggRef.current.total += 1;
    if (isCorrect) aggRef.current.correct += 1;
    if (rtMs !== null) {
      aggRef.current.rtSum += rtMs;
      aggRef.current.rtCount += 1;
      if (isCorrect && rtMs >= 150 && rtMs <= 3000) {
        aggRef.current.correctRtPairs.push({ setSize: currentFormalTrial.setSize, rtMs });
      }
    }
  };

  const moveFormalNext = () => {
    if (formalIndex + 1 >= formalTrials.length) {
      finalizeFormal();
    } else {
      setFormalIndex((idx) => idx + 1);
      setSelectedAnswer(null);
      setMemorizeRemainMs(MEMORIZE_MS);
      setStage("memorize");
    }
  };

  const movePracticeNext = (correct: boolean) => {
    setPracticeCorrect(correct);
    setStage("feedback");
  };

  const handleAnswer = (answerInSet: boolean) => {
    if (stage !== "probe") return;
    const rtMs = Math.max(0, performance.now() - probeStartRef.current);
    setSelectedAnswer(answerInSet);

    if (phase === "practice") {
      movePracticeNext(answerInSet === currentPracticeTrial.isTarget);
      return;
    }

    recordFormalAnswer(answerInSet, rtMs);
    moveFormalNext();
  };

  useEffect(() => {
    if (phase !== "practice" && phase !== "formal") {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    if (phase === "formal" && !isFormalRunning) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (stage === "memorize") {
      const endAt = Date.now() + MEMORIZE_MS;
      setMemorizeRemainMs(MEMORIZE_MS);
      countdownRef.current = setInterval(() => {
        const remain = Math.max(0, endAt - Date.now());
        setMemorizeRemainMs(remain);
      }, 100);
      timerRef.current = setTimeout(() => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setMemorizeRemainMs(0);
        setStage("delay");
      }, MEMORIZE_MS);
    } else if (stage === "delay") {
      timerRef.current = setTimeout(() => {
        probeStartRef.current = performance.now();
        setStage("probe");
      }, DELAY_MS);
    } else if (stage === "feedback" && phase === "practice") {
      timerRef.current = setTimeout(() => {
        // 练习模式固定循环当前题：显示反馈后重开同一题。
        setSelectedAnswer(null);
        setPracticeCorrect(null);
        setMemorizeRemainMs(MEMORIZE_MS);
        setStage("memorize");
      }, FEEDBACK_MS);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [phase, stage, isFormalRunning, practiceIndex, practiceTrials.length]);

  const renderMemorySet = (items: string[]) => (
    <div className="flex flex-wrap justify-center gap-2">
      {items.map((item, idx) => (
        <div
          key={`${item}-${idx}`}
          className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#5E81AC] bg-white text-lg font-semibold text-[#5E81AC]"
        >
          {item}
        </div>
      ))}
    </div>
  );

  if (phase === "intro") {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("sternbergTitle")}</h4>
        <p className="mb-4 text-sm text-gray-600">{t("sternbergIntro")}</p>
        <button
          type="button"
          onClick={startPractice}
          className="rounded-lg bg-[#5E81AC] px-4 py-2 text-sm font-medium text-white hover:bg-[#4E719C]"
        >
          {t("startPractice")}
        </button>
      </div>
    );
  }

  if (phase === "practice" || phase === "formal") {
    const isPractice = phase === "practice";
    const progressCurrent = isPractice ? practiceIndex + 1 : formalIndex + 1;
    const progressTotal = isPractice ? practiceTrials.length : formalTrials.length;

    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">
          {isPractice ? t("sternbergPracticeTitle") : t("sternbergTitle")}
        </h4>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#5E81AC]">
          {isPractice ? t("nBackPracticeBadge") : t("sternbergFormalBadge")}
        </p>
        <div className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold text-gray-700">
          <span>{t("sternbergProgress", { current: progressCurrent, total: progressTotal })}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            {t("sternbergSetSize", { size: currentTrial.setSize })}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            {Math.max(0, memorizeRemainMs / 1000).toFixed(1)}s
          </span>
        </div>
        {isPractice && stage === "feedback" && (
          <div
            className={`mb-2 text-center text-xs font-semibold ${
              practiceCorrect ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {practiceCorrect ? t("practiceFeedbackCorrect") : t("practiceFeedbackWrong")}
          </div>
        )}
        <div className="mb-4 min-h-[180px] rounded-xl bg-gray-50 p-4">
          {stage === "memorize" && (
            <div className="space-y-3">
              <p className="text-center text-xs font-medium text-gray-600">{t("sternbergMemorizeLabel")}</p>
              {renderMemorySet(currentTrial.memorySet)}
            </div>
          )}
          {stage === "delay" && (
            <div className="flex h-[120px] items-center justify-center">
              <p className="text-sm text-gray-500">{t("sternbergDelayLabel")}</p>
            </div>
          )}
          {stage === "probe" && (
            <div className="space-y-4">
              <p className="text-center text-sm font-medium text-gray-700">{t("sternbergProbeQuestion")}</p>
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-[#5E81AC] bg-white text-2xl font-bold text-[#5E81AC]">
                  {currentTrial.probe}
                </div>
              </div>
            </div>
          )}
          {stage === "feedback" && (
            <div className="space-y-4">
              <p className="text-center text-sm font-medium text-gray-700">{t("sternbergProbeQuestion")}</p>
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-[#5E81AC] bg-white text-2xl font-bold text-[#5E81AC]">
                  {currentTrial.probe}
                </div>
              </div>
            </div>
          )}
        </div>

        {!isPractice && !isFormalRunning && (
          <div className="mb-4 flex justify-center">
            <button
              type="button"
              onClick={beginFormalRun}
              className="rounded-lg bg-[#5E81AC] px-5 py-2 text-sm font-medium text-white hover:bg-[#4E719C]"
            >
              {t("startNow")}
            </button>
          </div>
        )}

        {stage === "probe" && (isPractice || isFormalRunning) && (
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => handleAnswer(true)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                selectedAnswer === true
                  ? "bg-[#5E81AC] text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t("sternbergAnswerYes")}
            </button>
            <button
              type="button"
              onClick={() => handleAnswer(false)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                selectedAnswer === false
                  ? "bg-[#5E81AC] text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t("sternbergAnswerNo")}
            </button>
          </div>
        )}

        {isPractice && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={startFormal}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              {t("startFormal")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
