"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  TestIntroLayout,
  TestPhasePanel,
  testActionBtnAccent,
  testAnswerBtnIdle,
  testAnswerBtnSelected,
  testFeedbackClass,
  useReportTestChrome,
} from "../test-ui";

type ColorKey = "red" | "green" | "blue";
type TrialType = "congruent" | "incongruent";
type AgeBandId = "children" | "teens" | "youngAdults" | "middleAged" | "seniors";

interface Trial {
  id: string;
  type: TrialType;
  word: ColorKey;
  ink: ColorKey;
}

interface AgeNormRange {
  accMin: number;
  accMax: number;
  rtMin: number;
  rtMax: number;
  intMin: number;
  intMax: number;
}

const COLOR_KEYS: ColorKey[] = ["red", "green", "blue"];
const PRACTICE_TRIAL: Trial = { id: "p-1", type: "incongruent", word: "red", ink: "green" };
const FORMAL_COUNT = 24;

const AGE_NORMS: Record<AgeBandId, AgeNormRange> = {
  children: { accMin: 75, accMax: 88, rtMin: 900, rtMax: 1300, intMin: 180, intMax: 350 }, // 7-12
  teens: { accMin: 85, accMax: 94, rtMin: 700, rtMax: 1000, intMin: 120, intMax: 220 }, // 13-18
  youngAdults: { accMin: 92, accMax: 98, rtMin: 600, rtMax: 850, intMin: 80, intMax: 160 }, // 19-35
  middleAged: { accMin: 88, accMax: 95, rtMin: 700, rtMax: 950, intMin: 100, intMax: 190 }, // 36-60
  seniors: { accMin: 75, accMax: 90, rtMin: 850, rtMax: 1200, intMin: 150, intMax: 300 }, // 61+
};

function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function mean(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
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
  if (age >= 61) return "seniors";
  if (age >= 36 && age <= 60) return "middleAged";
  return null;
}

function shuffleArray<T>(arr: T[]) {
  const data = [...arr];
  for (let i = data.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = data[i];
    data[i] = data[j];
    data[j] = tmp;
  }
  return data;
}

function buildFormalTrials(count = FORMAL_COUNT) {
  const congruent: Trial[] = [];
  const incongruent: Trial[] = [];

  for (let i = 0; i < 12; i += 1) {
    const word = COLOR_KEYS[i % COLOR_KEYS.length];
    congruent.push({ id: `c-${i + 1}`, type: "congruent", word, ink: word });
  }

  for (let i = 0; i < 12; i += 1) {
    const word = COLOR_KEYS[i % COLOR_KEYS.length];
    const ink = COLOR_KEYS[(i + 1) % COLOR_KEYS.length];
    incongruent.push({ id: `i-${i + 1}`, type: "incongruent", word, ink });
  }

  return shuffleArray([...congruent, ...incongruent]).slice(0, count);
}

function computeAgeNormScore(
  accuracyPct: number,
  meanRtMs: number | null,
  interferenceMs: number | null,
  ageBand: AgeBandId | null,
  totalAnswered: number
) {
  if (ageBand == null) {
    return Math.round(clamp(accuracyPct, 0, 100));
  }

  const norm = AGE_NORMS[ageBand];
  const accNorm = clamp((accuracyPct - norm.accMin) / (norm.accMax - norm.accMin), 0, 1);
  const rtNorm = meanRtMs == null ? 0.5 : clamp((norm.rtMax - meanRtMs) / (norm.rtMax - norm.rtMin), 0, 1);
  const intNorm =
    interferenceMs == null
      ? 0.5
      : clamp((norm.intMax - interferenceMs) / (norm.intMax - norm.intMin), 0, 1);

  let score = Math.round(100 * (accNorm * 0.5 + rtNorm * 0.3 + intNorm * 0.2));
  if (totalAnswered < 18) score = Math.round(score * 0.9);
  if (accuracyPct < 60) score = Math.min(score, 45);
  return clamp(score, 0, 100);
}

function colorClass(key: ColorKey) {
  if (key === "red") return "text-red-600";
  if (key === "green") return "text-green-600";
  return "text-blue-600";
}

export default function StroopColor({
  onComplete,
  dateOfBirth,
  difficultyConfig,
}: {
  onComplete: (score: number) => void;
  dateOfBirth?: string | null;
  difficultyConfig?: { formalCount?: number };
}) {
  const t = useTranslations("test.focus");
  const [phase, setPhase] = useState<"intro" | "practice" | "formal">("intro");
  const [selected, setSelected] = useState<ColorKey | null>(null);
  const [practiceCorrect, setPracticeCorrect] = useState<boolean | null>(null);
  const [formalTrials, setFormalTrials] = useState<Trial[]>([]);
  const [formalIndex, setFormalIndex] = useState(0);
  const [formalCorrectCount, setFormalCorrectCount] = useState(0);
  const questionStartTsRef = useRef<number>(0);
  const correctRtMsRef = useRef<number[]>([]);
  const congruentRtMsRef = useRef<number[]>([]);
  const incongruentRtMsRef = useRef<number[]>([]);
  const ageBand = useMemo(() => resolveAgeBand(parseAge(dateOfBirth)), [dateOfBirth]);

  const currentTrial = phase === "formal" ? formalTrials[formalIndex] : phase === "practice" ? PRACTICE_TRIAL : null;

  useReportTestChrome(
    phase === "intro"
      ? { screen: "intro" }
      : {
          screen: "active",
          questionCurrent: phase === "formal" ? formalIndex + 1 : 1,
          questionTotal: phase === "formal" ? formalTrials.length : 1,
        }
  );

  useEffect(() => {
    if (phase === "practice" || phase === "formal") {
      questionStartTsRef.current = performance.now();
    }
  }, [phase, formalIndex]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== "practice" && phase !== "formal") return;
      if (selected !== null) return;
      const key = e.key.toLowerCase();
      if (key === "r") setSelected("red");
      if (key === "g") setSelected("green");
      if (key === "b") setSelected("blue");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, selected]);

  useEffect(() => {
    if ((phase === "practice" || phase === "formal") && selected !== null) {
      handleSubmit();
    }
  }, [phase, selected]);

  const startPractice = () => {
    setPracticeCorrect(null);
    setSelected(null);
    setPhase("practice");
  };

  const startFormal = () => {
    setFormalTrials(buildFormalTrials(difficultyConfig?.formalCount));
    setFormalIndex(0);
    setFormalCorrectCount(0);
    setSelected(null);
    correctRtMsRef.current = [];
    congruentRtMsRef.current = [];
    incongruentRtMsRef.current = [];
    setPhase("formal");
  };

  const handleSubmit = () => {
    if (!currentTrial || selected == null) return;

    const isCorrect = selected === currentTrial.ink;
    const rtMs = Math.max(0, performance.now() - questionStartTsRef.current);
    const isValidRt = rtMs >= 150 && rtMs <= 3000;

    if (phase === "practice") {
      setPracticeCorrect(isCorrect);
      setSelected(null);
      return;
    }

    const nextCorrectCount = formalCorrectCount + (isCorrect ? 1 : 0);
    if (isCorrect && isValidRt) {
      correctRtMsRef.current.push(rtMs);
      if (currentTrial.type === "congruent") congruentRtMsRef.current.push(rtMs);
      if (currentTrial.type === "incongruent") incongruentRtMsRef.current.push(rtMs);
    }

    if (formalIndex + 1 >= formalTrials.length) {
      const accuracyPct = (nextCorrectCount / formalTrials.length) * 100;
      const meanRtMs = mean(correctRtMsRef.current);
      const meanCongruent = mean(congruentRtMsRef.current);
      const meanIncongruent = mean(incongruentRtMsRef.current);
      const interferenceMs =
        meanCongruent == null || meanIncongruent == null ? null : meanIncongruent - meanCongruent;
      const score = computeAgeNormScore(accuracyPct, meanRtMs, interferenceMs, ageBand, formalTrials.length);
      onComplete(score);
      return;
    }

    setFormalCorrectCount(nextCorrectCount);
    setFormalIndex((idx) => idx + 1);
    setSelected(null);
  };

  if (phase === "intro") {
    return (
      <TestIntroLayout
        title={t("stroopTitle")}
        description={t("stroopDesc")}
        onStartPractice={startPractice}
        onStartTest={startFormal}
      />
    );
  }

  if (!currentTrial) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("stroopTitle")}</h4>
        <p className="text-sm text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">
        {phase === "practice" ? t("stroopPracticeTitle") : t("stroopTitle")}
      </h4>
      <span className="mb-3 inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
        {phase === "practice" ? t("practiceBadge") : t("formalBadge")}
      </span>

      {phase === "practice" && <p className="mb-3 text-sm text-gray-600">{t("stroopDesc")}</p>}
      {phase === "formal" && (
        <p className="mb-2 text-xs text-gray-500">
          {t("formalProgress", { current: formalIndex + 1, total: formalTrials.length })}
        </p>
      )}

      <p className="mb-2 text-sm text-gray-600">{t("stroopInstruction")}</p>

      <div className="rounded-2xl border border-[#045e96]/15 bg-[#edf4fc]/50 p-6 text-center">
        <span className={`text-5xl font-bold uppercase tracking-wide ${colorClass(currentTrial.ink)}`}>
          {t(`stroopWord.${currentTrial.word}`)}
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {COLOR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelected(key)}
            className={selected === key ? testAnswerBtnSelected : testAnswerBtnIdle}
          >
            {t(`stroopOption.${key}`)}
          </button>
        ))}
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
