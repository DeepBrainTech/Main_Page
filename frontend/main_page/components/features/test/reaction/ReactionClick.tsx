"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Phase = "intro" | "practice" | "formal" | "result";
type ScreenState = "idle" | "waiting" | "ready" | "tooSoon" | "recorded";
type AgeBandId = "teens" | "youngAdults" | "midAge" | "olderAdults";

interface AgeNormRange {
  min: number;
  max: number;
}

interface ReactionSummary {
  trials: number[];
  medianRt: number;
  meanRt: number;
  bestRt: number;
  score: number;
  ageBand: AgeBandId | null;
}

const FORMAL_TRIAL_COUNT = 3;
const TOO_SOON_FLASH_MS = 900;
const INTER_TRIAL_DELAY_MS = 800;

const AGE_NORMS: Record<AgeBandId, AgeNormRange> = {
  teens: { min: 400, max: 560 },
  youngAdults: { min: 190, max: 250 },
  midAge: { min: 250, max: 350 },
  olderAdults: { min: 350, max: 500 },
};

function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
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
  if (age >= 13 && age <= 19) return "teens";
  if (age >= 20 && age <= 30) return "youngAdults";
  if (age >= 31 && age <= 50) return "midAge";
  if (age >= 60) return "olderAdults";
  return null;
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function computeStabilityScore(values: number[]) {
  if (values.length <= 1) return 100;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  return Math.round(100 * clamp((120 - std) / 120, 0, 1));
}

function mapReactionToScore(rtMs: number, ageBand: AgeBandId | null) {
  if (ageBand == null) {
    return Math.round(100 * clamp((450 - rtMs) / (450 - 220), 0, 1));
  }

  const norm = AGE_NORMS[ageBand];
  const normalized = clamp((norm.max - rtMs) / (norm.max - norm.min), 0, 1);
  return Math.round(20 + normalized * 80);
}

export default function ReactionClick({
  onComplete,
  dateOfBirth,
}: {
  onComplete: (score: number) => void;
  dateOfBirth?: string | null;
}) {
  const t = useTranslations("test.reaction");
  const [phase, setPhase] = useState<Phase>("intro");
  const [screenState, setScreenState] = useState<ScreenState>("idle");
  const [formalIndex, setFormalIndex] = useState(0);
  const [trialResults, setTrialResults] = useState<number[]>([]);
  const [practiceResult, setPracticeResult] = useState<number | null>(null);
  const [summary, setSummary] = useState<ReactionSummary | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  const ageBand = useMemo(() => resolveAgeBand(parseAge(dateOfBirth)), [dateOfBirth]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const clearPendingTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleRound = () => {
    clearPendingTimer();
    lockRef.current = false;
    startTimeRef.current = null;
    setScreenState("waiting");

    const delay = 2000 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      setScreenState("ready");
      startTimeRef.current = performance.now();
    }, delay);
  };

  const finishFormal = (results: number[]) => {
    const medianRt = Math.round(median(results));
    const meanRt = Math.round(mean(results));
    const bestRt = Math.round(Math.min(...results));
    const medianScore = mapReactionToScore(medianRt, ageBand);
    const bestScore = mapReactionToScore(bestRt, ageBand);
    const stabilityScore = computeStabilityScore(results);
    const finalScore = Math.round(medianScore * 0.7 + bestScore * 0.2 + stabilityScore * 0.1);

    setSummary({
      trials: results,
      medianRt,
      meanRt,
      bestRt,
      score: clamp(finalScore, 0, 100),
      ageBand,
    });
    setScreenState("idle");
    setPhase("result");
  };

  const startPractice = () => {
    setPracticeResult(null);
    setTrialResults([]);
    setFormalIndex(0);
    setSummary(null);
    setPhase("practice");
    scheduleRound();
  };

  const startFormal = () => {
    setTrialResults([]);
    setFormalIndex(0);
    setSummary(null);
    setPhase("formal");
    scheduleRound();
  };

  const flashTooSoon = () => {
    clearPendingTimer();
    lockRef.current = true;
    startTimeRef.current = null;
    setScreenState("tooSoon");
    timerRef.current = setTimeout(() => {
      lockRef.current = false;
      if (phase === "practice" || phase === "formal") scheduleRound();
    }, TOO_SOON_FLASH_MS);
  };

  const recordReaction = (rtMs: number) => {
    clearPendingTimer();
    lockRef.current = true;
    setScreenState("recorded");

    if (phase === "practice") {
      setPracticeResult(rtMs);
      return;
    }

    const nextResults = [...trialResults, rtMs];
    setTrialResults(nextResults);

    if (formalIndex + 1 >= FORMAL_TRIAL_COUNT) {
      finishFormal(nextResults);
      return;
    }

    timerRef.current = setTimeout(() => {
      lockRef.current = false;
      setFormalIndex((value) => value + 1);
      scheduleRound();
    }, INTER_TRIAL_DELAY_MS);
  };

  const handleClick = () => {
    if (phase !== "practice" && phase !== "formal") return;
    if (lockRef.current) return;

    if (screenState === "waiting") {
      flashTooSoon();
      return;
    }

    if (screenState !== "ready" || startTimeRef.current == null) return;

    const rtMs = Math.round(Math.max(0, performance.now() - startTimeRef.current));
    recordReaction(rtMs);
  };

  const screenClass =
    screenState === "waiting"
      ? "bg-gray-300 text-gray-800"
      : screenState === "ready"
        ? "bg-emerald-500 text-white"
        : screenState === "tooSoon"
          ? "bg-red-500 text-white"
          : screenState === "recorded"
            ? "bg-sky-500 text-white"
            : "bg-gray-200 text-gray-700";

  const screenLabel =
    screenState === "waiting"
      ? t("waiting")
      : screenState === "ready"
        ? t("clickNow")
        : screenState === "tooSoon"
          ? t("tooSoon")
          : screenState === "recorded"
            ? t("recorded")
            : t("readyToStart");

  if (phase === "intro") {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("title")}</h4>
        <p className="mb-3 text-sm text-gray-600">{t("desc")}</p>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>{t("rulePractice")}</li>
          <li>{t("ruleFormal")}</li>
          <li>{t("ruleNoEarly")}</li>
          <li>{t("ruleReference")}</li>
        </ul>
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

  if (phase === "result" && summary) {
    const ageBandLabel =
      summary.ageBand == null ? t("ageBandUnknown") : t(`ageBand.${summary.ageBand}`);

    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("resultTitle")}</h4>
        <p className="mb-4 text-sm text-gray-600">{t("resultDesc")}</p>

        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500">{t("finalScore")}</p>
            <p className="text-3xl font-bold text-[#1f5fae]">{summary.score}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500">{t("ageGroupLabel")}</p>
            <p className="text-lg font-semibold text-gray-800">{ageBandLabel}</p>
          </div>
        </div>

        <div className="mb-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">{t("trialCol")}</th>
                <th className="py-2 font-medium">{t("rtCol")}</th>
              </tr>
            </thead>
            <tbody>
              {summary.trials.map((trial, index) => (
                <tr key={`${trial}-${index}`} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-2 pr-3 text-gray-700">{t("trialLabel", { index: index + 1 })}</td>
                  <td className="py-2 text-gray-800">{trial} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{t("medianLabel")}</p>
            <p className="text-lg font-semibold text-gray-800">{summary.medianRt} ms</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{t("meanLabel")}</p>
            <p className="text-lg font-semibold text-gray-800">{summary.meanRt} ms</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{t("bestLabel")}</p>
            <p className="text-lg font-semibold text-gray-800">{summary.bestRt} ms</p>
          </div>
        </div>

        <p className="mb-4 text-xs text-gray-500">{t("scoreHint")}</p>
        <button
          type="button"
          onClick={() => onComplete(summary.score)}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
        >
          {t("finishTest")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">
        {phase === "practice" ? t("practiceTitle") : t("title")}
      </h4>
      <span className="mb-3 inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
        {phase === "practice" ? t("practiceBadge") : t("formalBadge")}
      </span>

      {phase === "practice" && <p className="mb-3 text-sm text-gray-600">{t("practiceDesc")}</p>}
      {phase === "formal" && (
        <p className="mb-2 text-xs text-gray-500">
          {t("formalProgress", { current: formalIndex + 1, total: FORMAL_TRIAL_COUNT })}
        </p>
      )}

      <button
        type="button"
        onClick={handleClick}
        className={`h-48 w-full rounded-xl transition ${screenClass}`}
      >
        <span className="text-xl font-semibold">{screenLabel}</span>
      </button>

      {phase === "practice" && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            {practiceResult == null ? (
              <p className="font-semibold text-gray-600">{t("practiceHint")}</p>
            ) : (
              <p className="font-semibold text-emerald-600">
                {t("practiceResult", { value: practiceResult })}
              </p>
            )}
          </div>
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
