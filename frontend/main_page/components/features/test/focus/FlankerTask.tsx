"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  TestIntroLayout,
  TestPhasePanel,
  testAnswerBtnIdle,
  testAnswerBtnSelected,
  testActionBtnAccent,
  testFeedbackClass,
  useReportTestChrome,
} from "../test-ui";

type Direction = "left" | "right";
type TrialType = "congruent" | "incongruent" | "neutral";
type AgeBandId = "children" | "preteens" | "teens" | "youngAdults" | "middleAged" | "seniors";

interface Trial {
  id: string;
  type: TrialType;
  center: Direction;
}

interface AgeNormRange {
  accMin: number;
  accMax: number;
  rtMin: number;
  rtMax: number;
  intMin: number;
  intMax: number;
}

const PRACTICE_TRIALS: Trial[] = [{ id: "p-1", type: "incongruent", center: "right" }];

const FORMAL_BASE_TRIALS: Trial[] = [
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `c-l-${i + 1}`,
    type: "congruent" as TrialType,
    center: "left" as Direction,
  })),
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `c-r-${i + 1}`,
    type: "congruent" as TrialType,
    center: "right" as Direction,
  })),
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `i-l-${i + 1}`,
    type: "incongruent" as TrialType,
    center: "left" as Direction,
  })),
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `i-r-${i + 1}`,
    type: "incongruent" as TrialType,
    center: "right" as Direction,
  })),
];

const FORMAL_COUNT = 60;

const AGE_NORMS: Record<AgeBandId, AgeNormRange> = {
  children: { accMin: 70, accMax: 95, rtMin: 450, rtMax: 900, intMin: 50, intMax: 200 },
  preteens: { accMin: 75, accMax: 96, rtMin: 400, rtMax: 800, intMin: 40, intMax: 180 },
  teens: { accMin: 80, accMax: 97, rtMin: 350, rtMax: 700, intMin: 30, intMax: 150 },
  youngAdults: { accMin: 85, accMax: 98, rtMin: 300, rtMax: 600, intMin: 20, intMax: 120 },
  middleAged: { accMin: 80, accMax: 96, rtMin: 350, rtMax: 700, intMin: 30, intMax: 150 },
  seniors: { accMin: 70, accMax: 92, rtMin: 450, rtMax: 900, intMin: 50, intMax: 200 },
};

interface FlankerTaskProps {
  onComplete: (score: number) => void;
  dateOfBirth?: string | null;
  difficultyConfig?: { trialWindowMs?: number; formalCount?: number };
}

function parseAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

function resolveAgeBand(age: number | null): AgeBandId {
  if (age == null) return "youngAdults";
  if (age < 10) return "children";
  if (age < 13) return "preteens";
  if (age < 18) return "teens";
  if (age < 45) return "youngAdults";
  if (age < 65) return "middleAged";
  return "seniors";
}

function clampScore(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function normalizeLinear(value: number, min: number, max: number) {
  if (max <= min) return 50;
  return clampScore(((value - min) / (max - min)) * 100, 0, 100);
}

function normalizeReverse(value: number, min: number, max: number) {
  return 100 - normalizeLinear(value, min, max);
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function shuffleTrials(trials: Trial[]) {
  const out = [...trials];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildStimulus(type: TrialType, center: Direction) {
  const arrow = center === "left" ? "←" : "→";
  const flank = type === "neutral" ? "·" : arrow;
  return [flank, flank, arrow, flank, flank];
}

function computeAgeNormScore(
  accuracyPct: number,
  medianRtMs: number | null,
  interferenceMs: number | null,
  ageBand: AgeBandId,
  trialCount: number,
  totalFormalCount = FORMAL_COUNT
) {
  const norm = AGE_NORMS[ageBand];
  const accScore = normalizeLinear(accuracyPct, norm.accMin, norm.accMax);
  const rtScore = medianRtMs == null ? 50 : normalizeReverse(medianRtMs, norm.rtMin, norm.rtMax);
  const intScore =
    interferenceMs == null ? 50 : normalizeReverse(interferenceMs, norm.intMin, norm.intMax);
  const base = accScore * 0.5 + rtScore * 0.3 + intScore * 0.2;
  const coverage = clampScore((trialCount / totalFormalCount) * 100, 0, 100);
  return Math.round(base * 0.85 + coverage * 0.15);
}

export default function FlankerTask({ onComplete, dateOfBirth, difficultyConfig }: FlankerTaskProps) {
  const t = useTranslations("test.focus");
  const [phase, setPhase] = useState<"intro" | "practice" | "formal">("intro");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceCorrect, setPracticeCorrect] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<Direction | null>(null);
  const [formalTrials, setFormalTrials] = useState<Trial[]>([]);
  const [formalIndex, setFormalIndex] = useState(0);
  const [formalCorrectCount, setFormalCorrectCount] = useState(0);
  const questionStartTsRef = useRef<number>(0);
  const correctRtMsRef = useRef<number[]>([]);
  const congruentRtMsRef = useRef<number[]>([]);
  const incongruentRtMsRef = useRef<number[]>([]);
  const ageBand = useMemo(() => resolveAgeBand(parseAge(dateOfBirth)), [dateOfBirth]);

  const currentTrial =
    phase === "formal" ? formalTrials[formalIndex] : phase === "practice" ? PRACTICE_TRIALS[practiceIndex] : null;

  useReportTestChrome(
    phase === "intro"
      ? { screen: "intro" }
      : {
          screen: "active",
          questionCurrent: phase === "formal" ? formalIndex + 1 : practiceIndex + 1,
          questionTotal: phase === "formal" ? formalTrials.length : PRACTICE_TRIALS.length,
        }
  );

  useEffect(() => {
    if (phase === "practice" || phase === "formal") {
      questionStartTsRef.current = performance.now();
    }
  }, [phase, practiceIndex, formalIndex]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== "practice" && phase !== "formal") return;
      if (selected !== null) return;
      if (e.key === "ArrowLeft") setSelected("left");
      if (e.key === "ArrowRight") setSelected("right");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, selected]);

  useEffect(() => {
    if ((phase === "formal" || phase === "practice") && selected !== null) {
      handleSubmit();
    }
  }, [phase, selected]);

  const startPractice = () => {
    setPracticeIndex(0);
    setPracticeCorrect(null);
    setSelected(null);
    setPhase("practice");
  };

  const startFormal = () => {
    setFormalTrials(shuffleTrials(FORMAL_BASE_TRIALS).slice(0, difficultyConfig?.formalCount ?? FORMAL_COUNT));
    setFormalIndex(0);
    setFormalCorrectCount(0);
    correctRtMsRef.current = [];
    congruentRtMsRef.current = [];
    incongruentRtMsRef.current = [];
    setSelected(null);
    setPhase("formal");
  };

  const handleSubmit = () => {
    if (!currentTrial || selected === null) return;
    const isCorrect = selected === currentTrial.center;
    const rtMs = Math.max(0, performance.now() - questionStartTsRef.current);
    const isValidRt = rtMs >= 150 && rtMs <= 3000;

    if (phase === "practice") {
      setPracticeCorrect(isCorrect);
      setSelected(null);
      return;
    }

    if (phase === "formal") {
      const nextCorrectCount = formalCorrectCount + (isCorrect ? 1 : 0);
      if (isCorrect && isValidRt) {
        correctRtMsRef.current.push(rtMs);
        if (currentTrial.type === "congruent") congruentRtMsRef.current.push(rtMs);
        if (currentTrial.type === "incongruent") incongruentRtMsRef.current.push(rtMs);
      }

      if (formalIndex + 1 >= formalTrials.length) {
        const accuracyPct = (nextCorrectCount / formalTrials.length) * 100;
        const medianRtMs = median(correctRtMsRef.current);
        const medianCongruent = median(congruentRtMsRef.current);
        const medianIncongruent = median(incongruentRtMsRef.current);
        const interferenceMs =
          medianCongruent == null || medianIncongruent == null ? null : medianIncongruent - medianCongruent;

        const score = computeAgeNormScore(
          accuracyPct,
          medianRtMs,
          interferenceMs,
          ageBand,
          formalTrials.length,
          difficultyConfig?.formalCount ?? FORMAL_COUNT
        );
        onComplete(score);
        return;
      }

      setFormalCorrectCount(nextCorrectCount);
      setFormalIndex((idx) => idx + 1);
      setSelected(null);
    }
  };

  if (phase === "intro") {
    return (
      <TestIntroLayout
        title={t("flankerTitle")}
        description={t("flankerDesc")}
        onStartPractice={startPractice}
        onStartTest={startFormal}
      />
    );
  }

  if (!currentTrial) {
    return (
      <TestPhasePanel title={t("flankerTitle")}>
        <p>{t("loading")}</p>
      </TestPhasePanel>
    );
  }

  const symbols = buildStimulus(currentTrial.type, currentTrial.center);

  return (
    <TestPhasePanel
      title={phase === "practice" ? t("flankerPracticeTitle") : t("flankerTitle")}
      badge={phase === "practice" ? t("practiceBadge") : t("formalBadge")}
      meta={
        phase === "formal"
          ? t("formalProgress", { current: formalIndex + 1, total: formalTrials.length })
          : undefined
      }
      footer={
        phase === "practice" ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p
              className={`${testFeedbackClass} ${
                practiceCorrect ? "text-emerald-600" : practiceCorrect === false ? "text-red-600" : ""
              }`}
            >
              {practiceCorrect === null
                ? t("practiceNoAnswer")
                : practiceCorrect
                  ? t("practiceFeedbackCorrect")
                  : t("practiceFeedbackWrong")}
            </p>
            <button type="button" onClick={startFormal} className={testActionBtnAccent}>
              {t("startFormal")}
            </button>
          </div>
        ) : undefined
      }
    >
      {phase === "practice" && <p>{t("flankerDesc")}</p>}

      <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#045e96]/15 bg-[#edf4fc]/50 p-6">
        {symbols.map((s, idx) => (
          <span key={`${currentTrial.id}-${idx}`} className="font-mono text-5xl font-bold text-[#045e96]">
            {s}
          </span>
        ))}
      </div>

      <p>{t("flankerInstruction")}</p>
      {phase === "practice" && <p className="text-[#045e96]/70">{t("flankerShortcutHint")}</p>}

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => setSelected("left")}
          className={selected === "left" ? testAnswerBtnSelected : testAnswerBtnIdle}
        >
          {t("flankerLeft")}
        </button>
        <button
          type="button"
          onClick={() => setSelected("right")}
          className={selected === "right" ? testAnswerBtnSelected : testAnswerBtnIdle}
        >
          {t("flankerRight")}
        </button>
      </div>
    </TestPhasePanel>
  );
}
