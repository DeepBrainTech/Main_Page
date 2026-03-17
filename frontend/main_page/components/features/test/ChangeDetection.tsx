"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface ChangeDetectionProps {
  onComplete: (score: number) => void;
  dateOfBirth?: string | null;
}

interface Trial {
  setSize: 4 | 6 | 8;
  hasChange: boolean;
  sample: number[];
  probe: number[];
}

interface SignalStats {
  hits: number;
  misses: number;
  fa: number;
  cr: number;
}

interface AggregateStats {
  bySize: Record<4 | 6 | 8, SignalStats>;
  correct: number;
  total: number;
  rtSum: number;
  rtCount: number;
  correctRtMs: number[];
}

type AgeBandId = "children" | "teens" | "youngAdults" | "middleAged" | "seniors";

const GRID_CELLS = 16;
const FORMAL_COUNTS: Record<4 | 6 | 8, number> = {
  4: 7,
  6: 7,
  8: 6,
};
const SAMPLE_MS = 5000;
const BLANK_MS = 1200;
const PRACTICE_FEEDBACK_MS = 700;
const FORMAL_SEED = 20260317;
const PRACTICE_SEED = 20260318;

const COLORS = ["#EF4444", "#3B82F6", "#22C55E", "#F59E0B", "#8B5CF6", "#06B6D4"];

const AGE_NORMS_K: Record<AgeBandId, [number, number]> = {
  children: [1.5, 3.2],
  teens: [3.0, 4.2],
  youngAdults: [3.5, 4.5],
  middleAged: [3.0, 3.8],
  seniors: [1.8, 2.8],
};

function clampScore(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// 使用固定 seed 的伪随机，保证题目可复现。
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

function buildTrial(rand: () => number, setSize: 4 | 6 | 8, hasChange: boolean): Trial {
  const sample = Array.from({ length: GRID_CELLS }, () => -1);
  const positions = shuffle(Array.from({ length: GRID_CELLS }, (_, i) => i), rand).slice(0, setSize);

  positions.forEach((pos) => {
    sample[pos] = Math.floor(rand() * COLORS.length);
  });

  const probe = [...sample];
  if (hasChange) {
    const changedPos = positions[Math.floor(rand() * positions.length)];
    const prevColor = probe[changedPos];
    let nextColor = prevColor;
    while (nextColor === prevColor) {
      nextColor = Math.floor(rand() * COLORS.length);
    }
    probe[changedPos] = nextColor;
  }

  return { setSize, hasChange, sample, probe };
}

function buildFormalTrials(seed: number): Trial[] {
  const rand = mulberry32(seed);
  const sizes: Array<4 | 6 | 8> = [4, 6, 8];
  const trials: Trial[] = [];

  sizes.forEach((size) => {
    const total = FORMAL_COUNTS[size];
    const block: Trial[] = [];
    for (let i = 0; i < total; i += 1) {
      const hasChange = i < Math.floor(total / 2);
      block.push(buildTrial(rand, size, hasChange));
    }
    // 按 4 -> 6 -> 8 递进；每个负荷段内做随机顺序。
    trials.push(...shuffle(block, rand));
  });

  return trials;
}

function buildPracticeTrial(seed: number): Trial {
  const rand = mulberry32(seed);
  return buildTrial(rand, 4, true);
}

function zApprox(p: number) {
  const x = clampScore(p, 1e-6, 1 - 1e-6);
  const a1 = -39.6968302866538;
  const a2 = 220.946098424521;
  const a3 = -275.928510446969;
  const a4 = 138.357751867269;
  const a5 = -30.6647980661472;
  const a6 = 2.50662827745924;
  const b1 = -54.4760987982241;
  const b2 = 161.585836858041;
  const b3 = -155.698979859887;
  const b4 = 66.8013118877197;
  const b5 = -13.2806815528857;
  const c1 = -0.00778489400243029;
  const c2 = -0.322396458041136;
  const c3 = -2.40075827716184;
  const c4 = -2.54973253934373;
  const c5 = 4.37466414146497;
  const c6 = 2.93816398269878;
  const d1 = 0.00778469570904146;
  const d2 = 0.32246712907004;
  const d3 = 2.445134137143;
  const d4 = 3.75440866190742;
  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (x < pLow) {
    const q = Math.sqrt(-2 * Math.log(x));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
  if (x <= pHigh) {
    const q = x - 0.5;
    const r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - x));
  return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
}

function calcK(size: 4 | 6 | 8, stats: SignalStats) {
  const nChange = stats.hits + stats.misses;
  const nNoChange = stats.fa + stats.cr;
  const hitRate = (stats.hits + 0.5) / (nChange + 1);
  const faRate = (stats.fa + 0.5) / (nNoChange + 1);
  const k = clampScore(size * (hitRate - faRate), 0, size);
  const dPrime = zApprox(hitRate) - zApprox(faRate);
  return { k, hitRate, faRate, dPrime };
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function normalizeLinear(value: number, min: number, max: number) {
  if (max <= min) return 50;
  return clampScore(((value - min) / (max - min)) * 100, 0, 100);
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
  if (age >= 7 && age <= 12) return "children";
  if (age >= 13 && age <= 18) return "teens";
  if (age >= 19 && age <= 35) return "youngAdults";
  if (age >= 36 && age <= 60) return "middleAged";
  if (age >= 65) return "seniors";
  return null;
}

function computeAgePercentile(kOverall: number, ageBand: AgeBandId | null) {
  if (ageBand == null) return null;
  const [low, high] = AGE_NORMS_K[ageBand];
  return Math.round(normalizeLinear(kOverall, low, high));
}

export default function ChangeDetection({ onComplete, dateOfBirth }: ChangeDetectionProps) {
  const t = useTranslations("test.memory");

  const practiceTrial = useMemo(() => buildPracticeTrial(PRACTICE_SEED), []);
  const formalTrials = useMemo(() => buildFormalTrials(FORMAL_SEED), []);

  const [phase, setPhase] = useState<"intro" | "practice" | "formal" | "result">("intro");
  const [stage, setStage] = useState<"sample" | "blank" | "probe" | "feedback">("sample");
  const [formalIndex, setFormalIndex] = useState(0);
  const [isFormalRunning, setIsFormalRunning] = useState(false);
  const [practiceCorrect, setPracticeCorrect] = useState<boolean | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [sampleRemainMs, setSampleRemainMs] = useState(SAMPLE_MS);

  const [rawScore, setRawScore] = useState(0);
  const [ageNormScore, setAgeNormScore] = useState(0);
  const [percentileLikeScore, setPercentileLikeScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [avgRtMs, setAvgRtMs] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const probeStartRef = useRef<number>(0);
  const aggRef = useRef<AggregateStats>({
    bySize: {
      4: { hits: 0, misses: 0, fa: 0, cr: 0 },
      6: { hits: 0, misses: 0, fa: 0, cr: 0 },
      8: { hits: 0, misses: 0, fa: 0, cr: 0 },
    },
    correct: 0,
    total: 0,
    rtSum: 0,
    rtCount: 0,
    correctRtMs: [],
  });

  const currentTrial = phase === "practice" ? practiceTrial : formalTrials[Math.min(formalIndex, formalTrials.length - 1)];

  const resetAggregator = () => {
    aggRef.current = {
      bySize: {
        4: { hits: 0, misses: 0, fa: 0, cr: 0 },
        6: { hits: 0, misses: 0, fa: 0, cr: 0 },
        8: { hits: 0, misses: 0, fa: 0, cr: 0 },
      },
      correct: 0,
      total: 0,
      rtSum: 0,
      rtCount: 0,
      correctRtMs: [],
    };
  };

  const startPractice = () => {
    setPracticeCorrect(null);
    setSelectedAnswer(null);
    setSampleRemainMs(SAMPLE_MS);
    setStage("sample");
    setPhase("practice");
  };

  const startFormal = () => {
    setFormalIndex(0);
    setIsFormalRunning(false);
    setSelectedAnswer(null);
    setSampleRemainMs(SAMPLE_MS);
    setStage("sample");
    resetAggregator();
    setPhase("formal");
  };

  const beginFormalRun = () => {
    setSelectedAnswer(null);
    setSampleRemainMs(SAMPLE_MS);
    setStage("sample");
    setIsFormalRunning(true);
  };

  const finalizeFormal = () => {
    const k4 = calcK(4, aggRef.current.bySize[4]);
    const k6 = calcK(6, aggRef.current.bySize[6]);
    const k8 = calcK(8, aggRef.current.bySize[8]);

    const n4 = aggRef.current.bySize[4].hits + aggRef.current.bySize[4].misses + aggRef.current.bySize[4].fa + aggRef.current.bySize[4].cr;
    const n6 = aggRef.current.bySize[6].hits + aggRef.current.bySize[6].misses + aggRef.current.bySize[6].fa + aggRef.current.bySize[6].cr;
    const n8 = aggRef.current.bySize[8].hits + aggRef.current.bySize[8].misses + aggRef.current.bySize[8].fa + aggRef.current.bySize[8].cr;
    const weightedTotal = n4 + n6 + n8;
    const kOverall =
      weightedTotal > 0
        ? (k4.k * n4 + k6.k * n6 + k8.k * n8) / weightedTotal
        : (k4.k + k6.k + k8.k) / 3;

    const rtMedian = median(aggRef.current.correctRtMs);
    const kScore = normalizeLinear(kOverall, 0, 5);
    const rtScore = rtMedian == null ? 50 : clampScore(((1600 - rtMedian) / 1200) * 100, 0, 100);
    const abilityScore = Math.round(kScore * 0.7 + rtScore * 0.3);
    const ageBand = resolveAgeBand(parseAge(dateOfBirth));
    const agePercentile = computeAgePercentile(kOverall, ageBand);
    const blendedDisplay =
      agePercentile == null
        ? abilityScore
        : Math.round(abilityScore * 0.7 + agePercentile * 0.3);

    const computedRaw = Number(kOverall.toFixed(2));
    const computedAgeNorm = agePercentile ?? abilityScore;
    const computedPercentile = abilityScore;
    const computedDisplay = clampScore(blendedDisplay, 0, 100);
    const rtAvg = aggRef.current.rtCount > 0 ? Math.round(aggRef.current.rtSum / aggRef.current.rtCount) : 0;

    setRawScore(computedRaw);
    setAgeNormScore(computedAgeNorm);
    setPercentileLikeScore(computedPercentile);
    setDisplayScore(computedDisplay);
    setAvgRtMs(rtAvg);

    onComplete(computedDisplay);
    setIsFormalRunning(false);
    setPhase("result");
  };

  const recordFormal = (answerChanged: boolean | null, rtMs: number | null) => {
    const { setSize, hasChange } = currentTrial;
    const stats = aggRef.current.bySize[setSize];

    const isCorrect = answerChanged !== null && answerChanged === hasChange;
    if (hasChange) {
      if (answerChanged) stats.hits += 1;
      else stats.misses += 1;
    } else {
      if (answerChanged) stats.fa += 1;
      else stats.cr += 1;
    }

    aggRef.current.total += 1;
    if (isCorrect) aggRef.current.correct += 1;
    if (rtMs !== null) {
      aggRef.current.rtSum += rtMs;
      aggRef.current.rtCount += 1;
      if (isCorrect) aggRef.current.correctRtMs.push(rtMs);
    }
  };

  const handleAnswer = (answerChanged: boolean) => {
    if (stage !== "probe") return;
    const rtMs = Math.max(0, performance.now() - probeStartRef.current);
    setSelectedAnswer(answerChanged);

    if (phase === "practice") {
      const correct = answerChanged === currentTrial.hasChange;
      setPracticeCorrect(correct);
      setStage("feedback");
      return;
    }

    recordFormal(answerChanged, rtMs);
    if (formalIndex + 1 >= formalTrials.length) {
      finalizeFormal();
    } else {
      setFormalIndex((idx) => idx + 1);
      setSampleRemainMs(SAMPLE_MS);
      setStage("sample");
      setSelectedAnswer(null);
    }
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
    if (phase === "formal" && !isFormalRunning) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (stage === "sample") {
      const endAt = Date.now() + SAMPLE_MS;
      setSampleRemainMs(SAMPLE_MS);
      countdownRef.current = setInterval(() => {
        const remain = Math.max(0, endAt - Date.now());
        setSampleRemainMs(remain);
      }, 100);
      timerRef.current = setTimeout(() => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setSampleRemainMs(0);
        setStage("blank");
      }, SAMPLE_MS);
    } else if (stage === "blank") {
      timerRef.current = setTimeout(() => {
        probeStartRef.current = performance.now();
        setStage("probe");
      }, BLANK_MS);
    } else if (stage === "feedback" && phase === "practice") {
      timerRef.current = setTimeout(() => {
        setPracticeCorrect(null);
        setSelectedAnswer(null);
        setSampleRemainMs(SAMPLE_MS);
        setStage("sample");
      }, PRACTICE_FEEDBACK_MS);
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
  }, [phase, stage, formalIndex, formalTrials.length, isFormalRunning]);

  const renderBoard = (board: number[]) => (
    <div className="grid grid-cols-4 gap-2">
      {board.map((colorIdx, idx) => (
        <div key={idx} className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-white">
          {colorIdx >= 0 ? <span className="h-7 w-7 rounded-md" style={{ backgroundColor: COLORS[colorIdx] }} /> : null}
        </div>
      ))}
    </div>
  );

  if (phase === "intro") {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("cdTitle")}</h4>
        <p className="mb-4 text-sm text-gray-600">{t("cdIntro")}</p>
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
    const progressCurrent = isPractice ? 1 : formalIndex + 1;
    const progressTotal = isPractice ? 1 : formalTrials.length;

    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{isPractice ? t("cdPracticeTitle") : t("cdTitle")}</h4>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#5E81AC]">
          {isPractice ? t("nBackPracticeBadge") : t("cdFormalBadge")}
        </p>
        <div className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold text-gray-700">
          <span>{t("cdProgressSimple", { current: progressCurrent, total: progressTotal })}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            {((stage === "sample" && (isPractice || isFormalRunning) ? sampleRemainMs : 0) / 1000).toFixed(1)}s
          </span>
        </div>
        {isPractice && stage === "feedback" && (
          <div className={`mb-2 text-center text-xs font-semibold ${practiceCorrect ? "text-emerald-600" : "text-red-600"}`}>
            {practiceCorrect ? t("practiceFeedbackCorrect") : t("practiceFeedbackWrong")}
          </div>
        )}
        <div className="relative mb-4 flex min-h-[220px] items-center justify-center rounded-xl bg-gray-50">
          {stage === "sample" && renderBoard(currentTrial.sample)}
          {stage === "blank" && renderBoard(Array.from({ length: GRID_CELLS }, () => -1))}
          {stage === "probe" && renderBoard(currentTrial.probe)}
          {stage === "feedback" && renderBoard(currentTrial.probe)}
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
              {t("cdAnswerChanged")}
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
              {t("cdAnswerNoChange")}
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

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">{t("cdResultTitle")}</h4>
      <p className="mb-4 text-sm text-gray-600">{t("cdResultDesc")}</p>
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
      <p className="mt-3 text-xs text-gray-500">{t("cdAvgRt", { value: avgRtMs })}</p>
      <p className="mt-2 text-xs text-gray-500">{t("displayScoreHint")}</p>
    </div>
  );
}
