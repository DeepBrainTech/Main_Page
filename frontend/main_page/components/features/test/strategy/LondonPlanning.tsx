"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Phase = "intro" | "practice" | "formal";
type Ball = "R" | "G" | "B" | "Y";
type AgeBandId = "children" | "teens" | "youngAdults" | "middleAged" | "seniors";

interface Puzzle {
  start: Ball[][];
  goal: Ball[][];
  minMoves: number;
}

interface AgeNorm {
  perfectMin: number;
  perfectMax: number;
  initMin: number;
  initMax: number;
}

const PEG_CAPACITY = [3, 2, 1];

const AGE_NORMS: Record<AgeBandId, AgeNorm> = {
  children: { perfectMin: 30, perfectMax: 50, initMin: 2, initMax: 5 },
  teens: { perfectMin: 60, perfectMax: 85, initMin: 8, initMax: 15 },
  youngAdults: { perfectMin: 85, perfectMax: 100, initMin: 15, initMax: 25 },
  middleAged: { perfectMin: 75, perfectMax: 90, initMin: 12, initMax: 20 },
  seniors: { perfectMin: 40, perfectMax: 65, initMin: 5, initMax: 10 },
};

const PRACTICE_PUZZLE_BASE = {
  start: [["R"], ["G"], ["B"]] as Ball[][],
  goal: [["G", "R"], ["B"], []] as Ball[][],
};

const FORMAL_PUZZLE_BASES = [
  {
    start: [["R"], ["G"], ["B"]] as Ball[][],
    goal: [["B", "G", "R"], [], []] as Ball[][],
  },
  {
    start: [["R", "G"], ["B"], []] as Ball[][],
    goal: [["G"], ["R"], ["B"]] as Ball[][],
  },
  {
    start: [["R", "Y"], ["G"], ["B"]] as Ball[][],
    goal: [["Y", "R", "G"], ["B"], []] as Ball[][],
  },
];

function cloneState(state: Ball[][]) {
  return state.map((peg) => [...peg]);
}

function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function encodeState(state: Ball[][]) {
  return state.map((peg) => peg.join("")).join("|");
}

function isGoalState(state: Ball[][], goal: Ball[][]) {
  return encodeState(state) === encodeState(goal);
}

function computeMinMoves(start: Ball[][], goal: Ball[][]) {
  const targetKey = encodeState(goal);
  const queue: Array<{ state: Ball[][]; steps: number }> = [{ state: cloneState(start), steps: 0 }];
  const seen = new Set<string>([encodeState(start)]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const currentKey = encodeState(current.state);
    if (currentKey === targetKey) return current.steps;

    for (let from = 0; from < 3; from += 1) {
      const fromPeg = current.state[from];
      if (fromPeg.length === 0) continue;
      const movingBall = fromPeg[fromPeg.length - 1];
      if (!movingBall) continue;

      for (let to = 0; to < 3; to += 1) {
        if (from === to) continue;
        if (current.state[to].length >= PEG_CAPACITY[to]) continue;

        const next = cloneState(current.state);
        next[from].pop();
        next[to].push(movingBall);
        const nextKey = encodeState(next);
        if (seen.has(nextKey)) continue;
        seen.add(nextKey);
        queue.push({ state: next, steps: current.steps + 1 });
      }
    }
  }

  return 0;
}

function buildPuzzle(base: { start: Ball[][]; goal: Ball[][] }): Puzzle {
  return {
    start: cloneState(base.start),
    goal: cloneState(base.goal),
    minMoves: computeMinMoves(base.start, base.goal),
  };
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
  if (age >= 7 && age <= 11) return "children";
  if (age >= 12 && age <= 17) return "teens";
  if (age >= 18 && age <= 30) return "youngAdults";
  if (age >= 31 && age <= 60) return "middleAged";
  if (age >= 61) return "seniors";
  return null;
}

function scorePerfectRate(perfectRate: number, norm: AgeNorm | null) {
  if (!norm) return clamp(perfectRate, 0, 100);
  return Math.round(
    clamp(((perfectRate - norm.perfectMin) / (norm.perfectMax - norm.perfectMin)) * 100, 0, 100)
  );
}

function scoreInitiation(initSeconds: number, norm: AgeNorm | null) {
  if (!norm) return Math.round(clamp((20 - initSeconds) * 5, 0, 100));
  const mid = (norm.initMin + norm.initMax) / 2;
  const halfRange = (norm.initMax - norm.initMin) / 2;
  if (halfRange <= 0) return 50;

  if (initSeconds >= norm.initMin && initSeconds <= norm.initMax) {
    const score = 100 - (Math.abs(initSeconds - mid) / halfRange) * 30;
    return Math.round(clamp(score, 70, 100));
  }

  const distance =
    initSeconds < norm.initMin ? norm.initMin - initSeconds : initSeconds - norm.initMax;
  return Math.round(clamp(70 - distance * 15, 0, 70));
}

function scoreRaw(rawAvg: number) {
  return Math.round(clamp(((rawAvg + 5) / 20) * 100, 0, 100));
}

function ballClass(ball: Ball) {
  if (ball === "R") return "bg-red-500";
  if (ball === "G") return "bg-lime-500";
  if (ball === "Y") return "bg-amber-400";
  return "bg-blue-500";
}

export default function LondonPlanning({
  onComplete,
  dateOfBirth,
}: {
  onComplete: (score: number) => void;
  dateOfBirth?: string | null;
}) {
  const t = useTranslations("test.strategy");
  const practicePuzzle = useMemo(() => buildPuzzle(PRACTICE_PUZZLE_BASE), []);
  const formalPuzzles = useMemo(() => FORMAL_PUZZLE_BASES.map((item) => buildPuzzle(item)), []);
  const ageBand = useMemo(() => resolveAgeBand(parseAge(dateOfBirth)), [dateOfBirth]);
  const ageNorm = useMemo(() => (ageBand ? AGE_NORMS[ageBand] : null), [ageBand]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [errorHint, setErrorHint] = useState("");
  const [practiceState, setPracticeState] = useState<Ball[][]>(() => cloneState(practicePuzzle.start));
  const [practiceMoves, setPracticeMoves] = useState(0);
  const [practiceDone, setPracticeDone] = useState(false);

  const [formalStage, setFormalStage] = useState(0);
  const [formalState, setFormalState] = useState<Ball[][]>(() => cloneState(formalPuzzles[0].start));
  const [formalMoves, setFormalMoves] = useState(0);
  const [formalViolations, setFormalViolations] = useState(0);
  const [formalFirstMoveMs, setFormalFirstMoveMs] = useState<number | null>(null);
  const [trialRawScores, setTrialRawScores] = useState<number[]>([]);
  const [trialPerfectFlags, setTrialPerfectFlags] = useState<number[]>([]);
  const [trialInitSeconds, setTrialInitSeconds] = useState<number[]>([]);

  const trialStartMsRef = useRef(0);

  const resetPractice = () => {
    setPracticeState(cloneState(practicePuzzle.start));
    setPracticeMoves(0);
    setPracticeDone(false);
    setSelectedPeg(null);
    setErrorHint("");
  };

  const startPractice = () => {
    resetPractice();
    setPhase("practice");
  };

  const startFormal = () => {
    setPhase("formal");
    setFormalStage(0);
    setFormalState(cloneState(formalPuzzles[0].start));
    setFormalMoves(0);
    setFormalViolations(0);
    setFormalFirstMoveMs(null);
    setTrialRawScores([]);
    setTrialPerfectFlags([]);
    setTrialInitSeconds([]);
    setSelectedPeg(null);
    setErrorHint("");
    trialStartMsRef.current = performance.now();
  };

  const openNextFormal = (nextStage: number) => {
    setFormalStage(nextStage);
    setFormalState(cloneState(formalPuzzles[nextStage].start));
    setFormalMoves(0);
    setFormalViolations(0);
    setFormalFirstMoveMs(null);
    setSelectedPeg(null);
    setErrorHint("");
    trialStartMsRef.current = performance.now();
  };

  const finishFormalTrial = (moves: number, firstMoveMs: number | null, forceSkip: boolean) => {
    const puzzle = formalPuzzles[formalStage];
    const minMoves = puzzle.minMoves;
    const extraMoves = Math.max(0, moves - minMoves);
    const initSeconds = (firstMoveMs ?? Math.max(0, performance.now() - trialStartMsRef.current)) / 1000;
    const perfect = moves === minMoves && !forceSkip ? 1 : 0;
    const raw = (perfect * 10) + (minMoves - extraMoves) - initSeconds / 10 - formalViolations * 0.5;
    const adjustedRaw = forceSkip ? raw - 4 : raw;

    const nextRawScores = [...trialRawScores, adjustedRaw];
    const nextPerfectFlags = [...trialPerfectFlags, perfect];
    const nextInitSeconds = [...trialInitSeconds, initSeconds];
    setTrialRawScores(nextRawScores);
    setTrialPerfectFlags(nextPerfectFlags);
    setTrialInitSeconds(nextInitSeconds);

    if (formalStage + 1 < formalPuzzles.length) {
      openNextFormal(formalStage + 1);
      return;
    }

    const rawAvg = nextRawScores.reduce((sum, value) => sum + value, 0) / nextRawScores.length;
    const perfectRate =
      (nextPerfectFlags.reduce((sum, value) => sum + value, 0) / nextPerfectFlags.length) * 100;
    const initAvg = nextInitSeconds.reduce((sum, value) => sum + value, 0) / nextInitSeconds.length;

    const rawScore = scoreRaw(rawAvg);
    const perfectScore = scorePerfectRate(perfectRate, ageNorm);
    const initScore = scoreInitiation(initAvg, ageNorm);
    const finalScore = Math.round(rawScore * 0.5 + perfectScore * 0.3 + initScore * 0.2);
    onComplete(clamp(finalScore, 0, 100));
  };

  const handleSkipFormal = () => {
    if (phase !== "formal") return;
    finishFormalTrial(formalMoves, formalFirstMoveMs, true);
  };

  const handleMove = (targetPeg: number) => {
    const currentState = phase === "practice" ? practiceState : formalState;
    if (selectedPeg == null) {
      if (currentState[targetPeg].length === 0) return;
      setSelectedPeg(targetPeg);
      setErrorHint("");
      return;
    }

    if (selectedPeg === targetPeg) {
      setSelectedPeg(null);
      return;
    }

    const next = cloneState(currentState);
    const fromPeg = next[selectedPeg];
    const toPeg = next[targetPeg];
    const moving = fromPeg[fromPeg.length - 1];

    if (!moving) {
      setSelectedPeg(null);
      return;
    }

    if (toPeg.length >= PEG_CAPACITY[targetPeg]) {
      setSelectedPeg(null);
      setErrorHint(t("londonIllegalCapacity"));
      if (phase === "formal") setFormalViolations((value) => value + 1);
      return;
    }

    fromPeg.pop();
    toPeg.push(moving);
    setSelectedPeg(null);
    setErrorHint("");

    if (phase === "practice") {
      const nextMoves = practiceMoves + 1;
      setPracticeState(next);
      setPracticeMoves(nextMoves);
      if (isGoalState(next, practicePuzzle.goal)) setPracticeDone(true);
      return;
    }

    const nextMoves = formalMoves + 1;
    setFormalState(next);
    setFormalMoves(nextMoves);
    if (formalFirstMoveMs == null) {
      setFormalFirstMoveMs(Math.max(0, performance.now() - trialStartMsRef.current));
    }

    if (isGoalState(next, formalPuzzles[formalStage].goal)) {
      const firstMoveMs =
        formalFirstMoveMs ?? Math.max(0, performance.now() - trialStartMsRef.current);
      finishFormalTrial(nextMoves, firstMoveMs, false);
    }
  };

  const currentPuzzle = phase === "practice" ? practicePuzzle : formalPuzzles[formalStage];
  const currentState = phase === "practice" ? practiceState : formalState;
  const ROD_HEIGHT_CLASS = ["h-44", "h-32", "h-20"];

  const renderBoard = (state: Ball[][], isInteractive: boolean) => (
    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, pegIndex) => {
          const pegBody = (
            <>
              <div className={`pointer-events-none absolute bottom-14 left-1/2 w-2 -translate-x-1/2 rounded-full bg-gray-400 ${ROD_HEIGHT_CLASS[pegIndex]}`} />
              <div className="pointer-events-none absolute inset-x-2 bottom-12 h-2 rounded-full bg-gray-500" />
              <div className="relative z-10 mb-16 flex min-h-[120px] flex-col-reverse items-center gap-2">
                {state[pegIndex].map((ball, idx) => (
                  <div
                    key={`${pegIndex}-${ball}-${idx}`}
                    className={`h-12 w-12 rounded-full shadow-sm ${ballClass(ball)} ${isInteractive ? "ring-2 ring-white" : ""}`}
                  />
                ))}
              </div>
              <div className="absolute inset-x-0 bottom-2 text-center text-sm font-medium text-gray-600">
                {state[pegIndex].length}/{PEG_CAPACITY[pegIndex]}
              </div>
            </>
          );

          if (!isInteractive) {
            return (
              <div key={pegIndex} className="relative min-h-[240px] rounded-2xl border border-transparent bg-transparent">
                {pegBody}
              </div>
            );
          }

          return (
            <button
              key={pegIndex}
              type="button"
              onClick={() => handleMove(pegIndex)}
              className={`relative min-h-[240px] rounded-2xl border-2 bg-white transition-colors ${
                selectedPeg === pegIndex
                  ? "border-[#5E81AC] bg-[#EFF3F8]"
                  : "border-gray-200 hover:border-[#5E81AC]"
              }`}
            >
              {pegBody}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (phase === "intro") {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("londonTitle")}</h4>
        <p className="mb-3 text-sm text-gray-600">{t("londonDesc")}</p>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>{t("londonRuleMoveOne")}</li>
          <li>{t("londonRuleCapacity")}</li>
          <li>{t("londonRulePlanFirst")}</li>
          <li>{t("londonRulePractice")}</li>
          <li>{t("londonRuleFormal")}</li>
          <li>{t("londonRuleAgeScoring")}</li>
        </ul>
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
          <div>
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-gray-700">
              {t("londonCurrentState")}
            </p>
            {renderBoard(practicePuzzle.start, false)}
          </div>
          <div className="hidden pt-24 text-3xl text-gray-500 lg:block">→</div>
          <div>
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-gray-700">
              {t("londonGoalState")}
            </p>
            {renderBoard(practicePuzzle.goal, false)}
          </div>
        </div>
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

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">
        {phase === "practice" ? t("londonPracticeTitle") : t("londonFormalTitle")}
      </h4>
      <span className="mb-3 inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
        {phase === "practice" ? t("practiceBadge") : t("formalBadge")}
      </span>

      {phase === "formal" && (
        <p className="mb-3 text-xs text-gray-500">
          {t("londonFormalProgress", {
            current: formalStage + 1,
            total: formalPuzzles.length,
          })}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
        <div>
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-gray-700">
            {t("londonCurrentState")}
          </p>
          {renderBoard(currentState, true)}
        </div>
        <div className="hidden pt-24 text-3xl text-gray-500 lg:block">→</div>
        <div>
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-gray-700">
            {t("londonGoalState")}
          </p>
          {renderBoard(currentPuzzle.goal, false)}
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
        <p>{t("movesStat", { value: phase === "practice" ? practiceMoves : formalMoves })}</p>
        {phase === "formal" && <p>{t("violationsStat", { value: formalViolations })}</p>}
      </div>

      {errorHint && <p className="mt-3 text-sm font-semibold text-red-600">{errorHint}</p>}

      {phase === "practice" && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className={`text-sm font-semibold ${practiceDone ? "text-emerald-600" : "text-gray-600"}`}>
            {practiceDone ? t("practiceDone") : t("practiceNotDone")}
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

      {phase === "formal" && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSkipFormal}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            {t("skipFormal")}
          </button>
        </div>
      )}
    </div>
  );
}
