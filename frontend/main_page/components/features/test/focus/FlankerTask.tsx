"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

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
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `n-l-${i + 1}`,
    type: "neutral" as TrialType,
    center: "left" as Direction,
  })),
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `n-r-${i + 1}`,
    type: "neutral" as TrialType,
    center: "right" as Direction,
  })),
];

const FORMAL_COUNT = 48;
const AGE_NORMS: Record<AgeBandId, AgeNormRange> = {
  children: { accMin: 75, accMax: 90, rtMin: 700, rtMax: 1000, intMin: 120, intMax: 250 }, // 6-9
  preteens: { accMin: 85, accMax: 95, rtMin: 600, rtMax: 900, intMin: 100, intMax: 200 }, // 10-12
  teens: { accMin: 90, accMax: 97, rtMin: 500, rtMax: 750, intMin: 80, intMax: 150 }, // 13-18
  youngAdults: { accMin: 95, accMax: 99, rtMin: 400, rtMax: 650, intMin: 50, intMax: 120 }, // 19-29
  middleAged: { accMin: 90, accMax: 97, rtMin: 450, rtMax: 750, intMin: 70, intMax: 150 }, // 30-59
  seniors: { accMin: 80, accMax: 92, rtMin: 600, rtMax: 1000, intMin: 120, intMax: 250 }, // 60+
};

function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
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
  if (age >= 6 && age <= 9) return "children";
  if (age >= 10 && age <= 12) return "preteens";
  if (age >= 13 && age <= 18) return "teens";
  if (age >= 19 && age <= 29) return "youngAdults";
  // 60 按 Seniors 归组，避免 30-60 与 60+ 重叠。
  if (age >= 60) return "seniors";
  if (age >= 30 && age <= 59) return "middleAged";
  return null;
}

function shuffleTrials<T>(trials: T[]) {
  const arr = [...trials];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function buildStimulus(type: TrialType, center: Direction) {
  const arrow = center === "left" ? "←" : "→";
  if (type === "congruent") return [arrow, arrow, arrow, arrow, arrow];
  if (type === "neutral") return ["—", "—", arrow, "—", "—"];
  const flank = center === "left" ? "→" : "←";
  return [flank, flank, arrow, flank, flank];
}

function computeAgeNormScore(
  accuracyPct: number,
  medianRtMs: number | null,
  interferenceMs: number | null,
  ageBand: AgeBandId | null,
  totalAnswered: number
) {
  if (ageBand == null) {
    return Math.round(clamp(accuracyPct, 0, 100));
  }
  const norm = AGE_NORMS[ageBand];
  const accNorm = clamp((accuracyPct - norm.accMin) / (norm.accMax - norm.accMin), 0, 1);
  const rtNorm = medianRtMs == null ? 0.5 : clamp((norm.rtMax - medianRtMs) / (norm.rtMax - norm.rtMin), 0, 1);
  const intNorm =
    interferenceMs == null
      ? 0.5
      : clamp((norm.intMax - interferenceMs) / (norm.intMax - norm.intMin), 0, 1);

  let score = Math.round(100 * (accNorm * 0.5 + rtNorm * 0.3 + intNorm * 0.2));
  if (totalAnswered < 30) score = Math.round(score * 0.9);
  if (accuracyPct < 60) score = Math.min(score, 45);
  return clamp(score, 0, 100);
}

export default function FlankerTask({
  onComplete,
  dateOfBirth,
}: {
  onComplete: (score: number) => void;
  dateOfBirth?: string | null;
}) {
  const t = useTranslations("test.focus");
  const [phase, setPhase] = useState<"intro" | "practice" | "formal">("intro");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selected, setSelected] = useState<Direction | null>(null);
  const [practiceCorrect, setPracticeCorrect] = useState<boolean | null>(null);
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
    setFormalTrials(shuffleTrials(FORMAL_BASE_TRIALS).slice(0, FORMAL_COUNT));
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
      // 练习阶段固定同一道题，可重复作答。
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
          formalTrials.length
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
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("flankerTitle")}</h4>
        <p className="mb-4 text-sm text-gray-600">{t("flankerDesc")}</p>
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

  if (!currentTrial) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("flankerTitle")}</h4>
        <p className="text-sm text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  const symbols = buildStimulus(currentTrial.type, currentTrial.center);

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">
        {phase === "practice" ? t("flankerPracticeTitle") : t("flankerTitle")}
      </h4>
      <span className="mb-3 inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
        {phase === "practice" ? t("practiceBadge") : t("formalBadge")}
      </span>

      {phase === "practice" && <p className="mb-3 text-sm text-gray-600">{t("flankerDesc")}</p>}
      {phase === "formal" && (
        <p className="mb-2 text-xs text-gray-500">
          {t("formalProgress", { current: formalIndex + 1, total: formalTrials.length })}
        </p>
      )}

      <div className="mb-4 flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        {symbols.map((s, idx) => (
          <span
            key={`${currentTrial.id}-${idx}`}
            className="font-mono text-5xl font-bold text-[#1f5fae]"
          >
            {s}
          </span>
        ))}
      </div>

      <p className="mb-3 text-sm text-gray-600">{t("flankerInstruction")}</p>
      {phase === "practice" && (
        <p className="mb-3 text-xs text-gray-500">{t("flankerShortcutHint")}</p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setSelected("left")}
          className={`rounded-lg border-2 px-4 py-2 ${
            selected === "left" ? "border-[#5E81AC] bg-[#5E81AC] text-white" : "border-gray-300"
          }`}
        >
          {t("flankerLeft")}
        </button>
        <button
          type="button"
          onClick={() => setSelected("right")}
          className={`rounded-lg border-2 px-4 py-2 ${
            selected === "right" ? "border-[#5E81AC] bg-[#5E81AC] text-white" : "border-gray-300"
          }`}
        >
          {t("flankerRight")}
        </button>
      </div>

      {phase === "practice" && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className={`text-sm font-semibold ${practiceCorrect ? "text-emerald-600" : "text-red-600"}`}>
            {practiceCorrect === null
              ? t("practiceNoAnswer")
              : practiceCorrect
                ? t("practiceFeedbackCorrect")
                : t("practiceFeedbackWrong")}
          </p>
          <button
            type="button"
            onClick={startFormal}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
          >
            {t("startFormal")}
          </button>
        </div>
      )}
    </div>
  );
}
