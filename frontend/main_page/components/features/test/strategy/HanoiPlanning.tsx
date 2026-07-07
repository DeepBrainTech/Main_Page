"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { TestIntroLayout, testIntroRulesClass, useReportTestChrome } from "../test-ui";

type Phase = "intro" | "practice" | "formal";
type AgeBandId = "children" | "teens" | "youngAdults" | "middleAged" | "seniors";

interface AgeBandNorm {
  erMin: number;
  erMax: number;
  timeFast: number;
  timeSlow: number;
}

const PRACTICE_DISK_COUNT = 3;
const FORMAL_DISK_SEQUENCE = [3, 4] as const;
const PEG_COUNT = 3;

const AGE_NORMS: Record<AgeBandId, AgeBandNorm> = {
  children: { erMin: 50, erMax: 70, timeFast: 120, timeSlow: 240 },
  teens: { erMin: 75, erMax: 90, timeFast: 60, timeSlow: 120 },
  youngAdults: { erMin: 90, erMax: 100, timeFast: 30, timeSlow: 60 },
  middleAged: { erMin: 85, erMax: 95, timeFast: 45, timeSlow: 90 },
  seniors: { erMin: 60, erMax: 80, timeFast: 90, timeSlow: 180 },
};

function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function createInitialPegs(diskCount: number): number[][] {
  const firstPeg: number[] = [];
  for (let disk = diskCount; disk >= 1; disk -= 1) firstPeg.push(disk);
  return [firstPeg, [], []];
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
  if (age >= 12 && age <= 18) return "teens";
  if (age >= 19 && age <= 35) return "youngAdults";
  if (age >= 36 && age <= 64) return "middleAged";
  if (age >= 65) return "seniors";
  return null;
}

function calcMinMoves(diskCount: number) {
  return 2 ** diskCount - 1;
}

function normalizeERByAge(er: number, norm: AgeBandNorm | null) {
  if (!norm) return clamp(er, 0, 100);
  return Math.round(clamp(((er - norm.erMin) / (norm.erMax - norm.erMin)) * 100, 0, 100));
}

function normalizeTimeByAge(seconds: number, norm: AgeBandNorm | null) {
  const fallback = { timeFast: 45, timeSlow: 150 };
  const base = norm ?? fallback;
  return Math.round(
    clamp(((base.timeSlow - seconds) / (base.timeSlow - base.timeFast)) * 100, 0, 100)
  );
}

function computeFinalScore(
  diskCount: number,
  moves: number,
  violations: number,
  totalSeconds: number,
  norm: AgeBandNorm | null
) {
  const minMoves = calcMinMoves(diskCount);
  const safeMoves = Math.max(minMoves, moves);
  const er = (minMoves / safeMoves) * 100;
  const erNorm = normalizeERByAge(er, norm);
  const timeNorm = normalizeTimeByAge(totalSeconds, norm);
  const violationNorm = Math.max(0, 100 - violations * 20);
  const score = Math.round(erNorm * 0.6 + timeNorm * 0.3 + violationNorm * 0.1);
  return clamp(score, 0, 100);
}

export default function HanoiPlanning({
  onComplete,
  dateOfBirth,
  difficultyConfig,
}: {
  onComplete: (score: number) => void;
  dateOfBirth?: string | null;
  difficultyConfig?: { diskSequence?: number[] };
}) {
  const t = useTranslations("test.strategy");
  const activeDiskSequence = (difficultyConfig?.diskSequence ?? [...FORMAL_DISK_SEQUENCE]) as number[];
  const [phase, setPhase] = useState<Phase>("intro");
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [errorHint, setErrorHint] = useState<string>("");
  const [practiceMoves, setPracticeMoves] = useState(0);
  const [practiceViolations, setPracticeViolations] = useState(0);
  const [formalMoves, setFormalMoves] = useState(0);
  const [formalViolations, setFormalViolations] = useState(0);
  const [formalStageIndex, setFormalStageIndex] = useState(0);
  const [formalScores, setFormalScores] = useState<number[]>([]);
  const [practicePegs, setPracticePegs] = useState<number[][]>(() =>
    createInitialPegs(PRACTICE_DISK_COUNT)
  );
  const [formalPegs, setFormalPegs] = useState<number[][]>(() =>
    createInitialPegs(activeDiskSequence[0] ?? 3)
  );
  const [practiceDone, setPracticeDone] = useState(false);

  const formalStartTsRef = useRef<number>(0);
  const ageBand = useMemo(() => resolveAgeBand(parseAge(dateOfBirth)), [dateOfBirth]);
  const ageNorm = useMemo(() => (ageBand ? AGE_NORMS[ageBand] : null), [ageBand]);

  const resetPractice = () => {
    setPracticePegs(createInitialPegs(PRACTICE_DISK_COUNT));
    setPracticeMoves(0);
    setPracticeViolations(0);
    setSelectedPeg(null);
    setErrorHint("");
    setPracticeDone(false);
  };

  const startPractice = () => {
    resetPractice();
    setPhase("practice");
  };

  const startFormal = () => {
    setPhase("formal");
    setFormalStageIndex(0);
    setFormalScores([]);
    setFormalPegs(createInitialPegs(activeDiskSequence[0] ?? 3));
    setFormalMoves(0);
    setFormalViolations(0);
    setSelectedPeg(null);
    setErrorHint("");
    formalStartTsRef.current = performance.now();
  };

  const startNextFormalStage = (nextStageIndex: number) => {
    setFormalStageIndex(nextStageIndex);
    setFormalPegs(createInitialPegs(activeDiskSequence[nextStageIndex] ?? 3));
    setFormalMoves(0);
    setFormalViolations(0);
    setSelectedPeg(null);
    setErrorHint("");
    formalStartTsRef.current = performance.now();
  };

  const isSolved = (pegs: number[][], diskCount: number) => {
    if (pegs[2].length !== diskCount) return false;
    for (let i = 0; i < diskCount; i += 1) {
      if (pegs[2][i] !== diskCount - i) return false;
    }
    return true;
  };

  const submitFormalScore = (
    diskCount: number,
    moves: number,
    violations: number,
    forceIncomplete: boolean
  ) => {
    const minMoves = calcMinMoves(diskCount);
    const elapsedMs = Math.max(0, performance.now() - formalStartTsRef.current);
    const elapsedSec = elapsedMs / 1000;

    const penalizedMoves = forceIncomplete ? Math.max(moves, minMoves * 3) : moves;
    const penalizedViolations = forceIncomplete ? violations + 5 : violations;
    const rawScore = computeFinalScore(
      diskCount,
      penalizedMoves,
      penalizedViolations,
      elapsedSec,
      ageNorm
    );
    const finalScore = forceIncomplete ? Math.max(0, rawScore - 25) : rawScore;
    const nextScores = [...formalScores, finalScore];
    setFormalScores(nextScores);

    if (formalStageIndex + 1 >= activeDiskSequence.length) {
      const avgScore = Math.round(
        nextScores.reduce((sum, value) => sum + value, 0) / nextScores.length
      );
      onComplete(avgScore);
      return;
    }

    startNextFormalStage(formalStageIndex + 1);
  };

  const handleSkipFormal = () => {
    if (phase !== "formal") return;
    const currentDiskCount = activeDiskSequence[formalStageIndex] ?? 3;
    submitFormalScore(currentDiskCount, formalMoves, formalViolations, true);
  };

  const handleMove = (targetPeg: number) => {
    const pegs = phase === "practice" ? practicePegs : formalPegs;
    if (selectedPeg == null) {
      if (pegs[targetPeg].length === 0) return;
      setSelectedPeg(targetPeg);
      setErrorHint("");
      return;
    }

    if (selectedPeg === targetPeg) {
      setSelectedPeg(null);
      return;
    }

    const next = pegs.map((peg) => [...peg]);
    const fromPeg = next[selectedPeg];
    const toPeg = next[targetPeg];
    const movingDisk = fromPeg[fromPeg.length - 1];
    const topTarget = toPeg[toPeg.length - 1];

    if (movingDisk == null) {
      setSelectedPeg(null);
      return;
    }

    if (topTarget != null && topTarget < movingDisk) {
      setErrorHint(t("illegalMove"));
      setSelectedPeg(null);
      if (phase === "practice") {
        setPracticeViolations((value) => value + 1);
      } else {
        setFormalViolations((value) => value + 1);
      }
      return;
    }

    fromPeg.pop();
    toPeg.push(movingDisk);
    setSelectedPeg(null);
    setErrorHint("");

    if (phase === "practice") {
      const nextMoves = practiceMoves + 1;
      setPracticePegs(next);
      setPracticeMoves(nextMoves);
      if (isSolved(next, PRACTICE_DISK_COUNT)) {
        setPracticeDone(true);
      }
      return;
    }

    const nextMoves = formalMoves + 1;
    setFormalPegs(next);
    setFormalMoves(nextMoves);
    const currentDiskCount = activeDiskSequence[formalStageIndex] ?? 3;
    if (isSolved(next, currentDiskCount)) {
      submitFormalScore(currentDiskCount, nextMoves, formalViolations, false);
    }
  };

  const currentPegs = phase === "practice" ? practicePegs : formalPegs;
  const currentMoves = phase === "practice" ? practiceMoves : formalMoves;
  const currentViolations = phase === "practice" ? practiceViolations : formalViolations;

  useReportTestChrome(phase === "intro" ? { screen: "intro" } : { screen: "active" });

  if (phase === "intro") {
    return (
      <TestIntroLayout
        title={t("hanoiTitle")}
        description={t("hanoiDesc")}
        onStartPractice={startPractice}
        onStartTest={startFormal}
        extra={
          <ul className={testIntroRulesClass}>
            <li>{t("ruleOneDisk")}</li>
            <li>{t("ruleNoLargeOnSmall")}</li>
            <li>{t("rulePractice")}</li>
            <li>{t("ruleFormal")}</li>
            <li>{t("ruleAgeScoring")}</li>
          </ul>
        }
      />
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">
        {phase === "practice" ? t("practiceTitle") : t("formalTitle")}
      </h4>
      <span className="mb-3 inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
        {phase === "practice" ? t("practiceBadge") : t("formalBadge")}
      </span>

      <p className="mb-3 text-sm text-gray-600">
        {phase === "practice" ? t("practiceHint") : t("formalHint")}
      </p>

      {phase === "formal" && (
        <p className="mb-3 text-xs text-gray-500">
          {t("formalProgress", {
            current: formalStageIndex + 1,
            total: activeDiskSequence.length,
            disks: activeDiskSequence[formalStageIndex] ?? 3,
          })}
        </p>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: PEG_COUNT }).map((_, pegIndex) => (
          <button
            key={pegIndex}
            type="button"
            onClick={() => handleMove(pegIndex)}
            className={`relative min-h-[230px] rounded-xl border-2 p-2 text-left transition-colors ${
              selectedPeg === pegIndex
                ? "border-[#5E81AC] bg-[#EFF3F8]"
                : "border-gray-200 bg-gray-50 hover:border-[#5E81AC]"
            }`}
          >
            <p className="mb-2 text-xs font-semibold text-gray-500">
              {t("pegLabel", { peg: String.fromCharCode(65 + pegIndex) })}
            </p>
            <div className="pointer-events-none absolute inset-x-1/2 bottom-2 top-8 w-1 -translate-x-1/2 rounded bg-gray-300" />
            <div className="relative z-10 mt-20 flex flex-col-reverse items-center gap-1">
              {currentPegs[pegIndex].map((disk) => {
                const width = 48 + disk * 24;
                return (
                  <div
                    key={`${pegIndex}-${disk}`}
                    className="h-5 rounded bg-[#5E81AC]"
                    style={{ width }}
                  />
                );
              })}
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
        <p>{t("movesStat", { value: currentMoves })}</p>
        <p>{t("violationsStat", { value: currentViolations })}</p>
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
