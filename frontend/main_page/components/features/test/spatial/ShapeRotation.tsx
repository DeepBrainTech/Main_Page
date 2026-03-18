"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";

// ─── Types ────────────────────────────────────────────────────────────────────
type Vec3 = [number, number, number];

interface Trial {
  shapeA: Vec3[];
  shapeB: Vec3[];
  isSame: boolean;
}

// ─── Isometric Rendering ──────────────────────────────────────────────────────
// Tile dimensions: each unit cube maps to these screen-space sizes
const TW = 34; // horizontal tile width
const TH = 17; // horizontal tile height (isometric foreshortening)
const ZH = 26; // vertical cube height (z-axis scale)

// Amber palette — warm, K12-friendly
const CLR_TOP    = "#FBBF24"; // amber-400
const CLR_RIGHT  = "#D97706"; // amber-600
const CLR_LEFT   = "#92400E"; // amber-800
const CLR_STROKE = "#78350F"; // amber-900

/** World (x,y,z) → screen (sx, sy). x goes right, y goes left, z goes up. */
function project(x: number, y: number, z: number): [number, number] {
  return [(x - y) * (TW / 2), (x + y) * (TH / 2) - z * ZH];
}

function polyPts(corners: Vec3[]): string {
  return corners.map(([x, y, z]) => project(x, y, z).join(",")).join(" ");
}

/** One isometric unit cube — draws the 3 visible faces. */
function IsoCube({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <g>
      {/* right face  (x+1 wall, viewer's right) */}
      <polygon
        points={polyPts([[x+1,y,z],[x+1,y+1,z],[x+1,y+1,z+1],[x+1,y,z+1]])}
        fill={CLR_RIGHT} stroke={CLR_STROKE} strokeWidth="0.8"
      />
      {/* left face   (y+1 wall, viewer's left) */}
      <polygon
        points={polyPts([[x,y+1,z],[x+1,y+1,z],[x+1,y+1,z+1],[x,y+1,z+1]])}
        fill={CLR_LEFT}  stroke={CLR_STROKE} strokeWidth="0.8"
      />
      {/* top face */}
      <polygon
        points={polyPts([[x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]])}
        fill={CLR_TOP}   stroke={CLR_STROKE} strokeWidth="0.8"
      />
    </g>
  );
}

/** Render a list of cubes as an isometric SVG that fits inside `size × size`. */
function ShapeView({ cubes, size = 140 }: { cubes: Vec3[]; size?: number }) {
  if (!cubes || cubes.length === 0) {
    return <div style={{ width: size, height: size }} className="rounded-lg bg-gray-100" />;
  }

  // Translate so all coords start at 0
  const minX = Math.min(...cubes.map(c => c[0]));
  const minY = Math.min(...cubes.map(c => c[1]));
  const minZ = Math.min(...cubes.map(c => c[2]));
  const norm: Vec3[] = cubes.map(([x, y, z]) => [x - minX, y - minY, z - minZ]);

  // Painter's sort: larger (x+y) → further → render first; ties: lower z first
  const sorted = [...norm].sort((a, b) => (b[0] + b[1]) - (a[0] + a[1]) || a[2] - b[2]);

  // Compute SVG bounding box from all 8 corners of every cube
  let minSX = Infinity, minSY = Infinity, maxSX = -Infinity, maxSY = -Infinity;
  for (const [cx, cy, cz] of norm) {
    for (let dx = 0; dx <= 1; dx++) {
      for (let dy = 0; dy <= 1; dy++) {
        for (let dz = 0; dz <= 1; dz++) {
          const [sx, sy] = project(cx + dx, cy + dy, cz + dz);
          if (sx < minSX) minSX = sx;
          if (sy < minSY) minSY = sy;
          if (sx > maxSX) maxSX = sx;
          if (sy > maxSY) maxSY = sy;
        }
      }
    }
  }

  const PAD = 6;
  const vbX = minSX - PAD;
  const vbY = minSY - PAD;
  const vbW = maxSX - minSX + PAD * 2;
  const vbH = maxSY - minSY + PAD * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      {sorted.map(([cx, cy, cz], i) => (
        <IsoCube key={i} x={cx} y={cy} z={cz} />
      ))}
    </svg>
  );
}

// ─── 3-D Rotation Functions ───────────────────────────────────────────────────
type RotFn = (v: Vec3) => Vec3;

/**
 * 8 distinct orientations covering rotations around all three axes.
 * These are a representative subset of SO(3) cube orientations.
 */
const ROTS: RotFn[] = [
  v => [ v[0],  v[1],  v[2]] as Vec3, // identity
  v => [-v[1],  v[0],  v[2]] as Vec3, // Z +90°
  v => [-v[0], -v[1],  v[2]] as Vec3, // Z +180°
  v => [ v[1], -v[0],  v[2]] as Vec3, // Z +270°
  v => [ v[2],  v[1], -v[0]] as Vec3, // Y +90°
  v => [-v[0],  v[1], -v[2]] as Vec3, // Y +180°
  v => [-v[2],  v[1],  v[0]] as Vec3, // Y +270°
  v => [ v[0], -v[2],  v[1]] as Vec3, // X +90°
];

/** Mirror along X — produces a shape that CANNOT be matched by any rotation. */
const MIRROR_X: RotFn = v => [-v[0], v[1], v[2]] as Vec3;

function normalizeShape(cubes: Vec3[]): Vec3[] {
  if (cubes.length === 0) return [];
  const minX = Math.min(...cubes.map(c => c[0]));
  const minY = Math.min(...cubes.map(c => c[1]));
  const minZ = Math.min(...cubes.map(c => c[2]));
  return cubes.map(([x, y, z]): Vec3 => [x - minX, y - minY, z - minZ]);
}

function applyRot(shape: Vec3[], rot: RotFn): Vec3[] {
  return normalizeShape(shape.map(rot));
}

// ─── Base Shapes (5-cube asymmetric arm structures) ───────────────────────────
/**
 * Each shape is a chiral (handed) 5-cube structure: its mirror image cannot be
 * superimposed by rotation. Designed at medium difficulty for K12 students.
 *
 * Notation: (x, y, z) — think of it as a 3D grid; z = height.
 */
const BASE_SHAPES: Vec3[][] = [
  // Shape 1 — L-step: flat L then one cube rises at the corner
  [[0,0,0],[1,0,0],[2,0,0],[2,1,0],[2,1,1]],
  // Shape 2 — Staircase: step up twice along X
  [[0,0,0],[1,0,0],[1,0,1],[2,0,1],[2,0,2]],
  // Shape 3 — Twisted arm: flat then bends and rises
  [[0,0,0],[0,1,0],[1,1,0],[1,1,1],[2,1,1]],
  // Shape 4 — Pillar-hook: tall column with a horizontal foot
  [[0,0,0],[0,0,1],[0,0,2],[1,0,2],[1,1,2]],
  // Shape 5 — Hook-up: L in XY plane, one cube ascends at open end
  [[0,0,0],[1,0,0],[1,1,0],[1,2,0],[1,2,1]],
  // Shape 6 — Elbow: L in YZ plane, one cube extends along X
  [[0,0,0],[0,1,0],[0,2,0],[1,2,0],[1,2,1]],
];

// ─── Seeded Pseudo-Random (Mulberry32) ────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Trial Generation ─────────────────────────────────────────────────────────
function buildOneTrial(rand: () => number, isSame: boolean): Trial {
  const base = BASE_SHAPES[Math.floor(rand() * BASE_SHAPES.length)];
  const rotAIdx = Math.floor(rand() * ROTS.length);
  const shapeA = applyRot(base, ROTS[rotAIdx]);

  let shapeB: Vec3[];
  if (isSame) {
    // Pick a different rotation index (guaranteed ≠ rotAIdx)
    const rotBIdx = (rotAIdx + 1 + Math.floor(rand() * (ROTS.length - 1))) % ROTS.length;
    shapeB = applyRot(base, ROTS[rotBIdx]);
  } else {
    // Mirror the base then apply a rotation — cannot be undone by rotation alone
    const mirrored = normalizeShape(base.map(MIRROR_X));
    shapeB = applyRot(mirrored, ROTS[Math.floor(rand() * ROTS.length)]);
  }

  return { shapeA, shapeB, isSame };
}

function buildTrials(seed: number, count: number): Trial[] {
  const rand = mulberry32(seed);

  // Exactly half "same", half "different" (rounded up for odd counts)
  const flags: boolean[] = Array.from({ length: count }, (_, i) => i < Math.ceil(count / 2));
  // Fisher-Yates shuffle with seeded random
  for (let i = flags.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [flags[i], flags[j]] = [flags[j], flags[i]];
  }

  return flags.map(isSame => buildOneTrial(rand, isSame));
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
function calcMedian(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/**
 * Final score (0-100):
 *   75% accuracy (correct / total × 100)
 *   25% speed    (linear: ≤1000 ms = 100, ≥7000 ms = 0)
 */
function computeScore(correct: number, total: number, rtMs: number[]): number {
  if (total === 0) return 0;
  const accScore  = (correct / total) * 100;
  const med       = calcMedian(rtMs);
  const rtScore   = med == null ? 50 : Math.max(0, Math.min(100, ((7000 - med) / 6000) * 100));
  return Math.round(accScore * 0.75 + rtScore * 0.25);
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FORMAL_SEED     = 20260319;
const PRACTICE_SEED   = 20260320;
const FORMAL_COUNT    = 12;
const PRACTICE_COUNT  = 3;

// ─── Component ────────────────────────────────────────────────────────────────
export default function ShapeRotation({ onComplete }: { onComplete: (score: number) => void }) {
  const t = useTranslations("test.spatial");

  const practiceTrials = useMemo(() => buildTrials(PRACTICE_SEED, PRACTICE_COUNT), []);
  const formalTrials   = useMemo(() => buildTrials(FORMAL_SEED,   FORMAL_COUNT),   []);

  const [phase,    setPhase]    = useState<"intro" | "practice" | "formal" | "result">("intro");
  const [trialIdx, setTrialIdx] = useState(0);
  const [selected, setSelected] = useState<"same" | "diff" | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  // Result data stored for result phase display
  const [resultData, setResultData] = useState({ correct: 0, total: 0, avgRt: 0, score: 0 });

  // Mutable accumulator for formal stats (avoids stale closures)
  const statsRef     = useRef({ correct: 0, total: 0, rtMs: [] as number[] });
  const startTimeRef = useRef<number>(0);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const currentTrial =
    phase === "practice"
      ? practiceTrials[Math.min(trialIdx, practiceTrials.length - 1)]
      : formalTrials[Math.min(trialIdx, formalTrials.length - 1)];

  // ── Phase transitions ────────────────────────────────────────────────────
  const startPractice = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTrialIdx(0);
    setSelected(null);
    setFeedback(null);
    setPhase("practice");
    startTimeRef.current = performance.now();
  };

  const startFormal = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTrialIdx(0);
    setSelected(null);
    setFeedback(null);
    statsRef.current = { correct: 0, total: 0, rtMs: [] };
    setPhase("formal");
    startTimeRef.current = performance.now();
  };

  // ── Answer handler ───────────────────────────────────────────────────────
  const handleAnswer = (answer: "same" | "diff") => {
    if (selected !== null || !currentTrial) return;

    const rt        = Math.max(0, performance.now() - startTimeRef.current);
    const isCorrect = (answer === "same") === currentTrial.isSame;
    setSelected(answer);

    // ── Practice: show feedback, wait for user to click "Next / Start Formal" ──
    if (phase === "practice") {
      setFeedback(isCorrect ? "correct" : "wrong");
      return;
    }

    // ── Formal: accumulate stats, auto-advance after short highlight ──
    statsRef.current.correct += isCorrect ? 1 : 0;
    statsRef.current.total   += 1;
    statsRef.current.rtMs.push(rt);

    timerRef.current = setTimeout(() => {
      if (trialIdx + 1 >= FORMAL_COUNT) {
        const { correct, total, rtMs } = statsRef.current;
        const score = computeScore(correct, total, rtMs);
        const avgRt = rtMs.length > 0
          ? Math.round(rtMs.reduce((s, v) => s + v, 0) / rtMs.length)
          : 0;
        setResultData({ correct, total, avgRt, score });
        onComplete(score);
        setPhase("result");
      } else {
        setTrialIdx(i => i + 1);
        setSelected(null);
        startTimeRef.current = performance.now();
      }
    }, 380);
  };

  // Practice: manual advance to next trial or to formal phase
  const advancePractice = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (trialIdx + 1 < PRACTICE_COUNT) {
      setTrialIdx(i => i + 1);
      setSelected(null);
      setFeedback(null);
      startTimeRef.current = performance.now();
    } else {
      startFormal();
    }
  };

  // ── Intro ────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("title")}</h4>
        <p className="mb-4 text-sm text-gray-600">{t("intro")}</p>

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
            {t("introTip")}
          </p>
          <ul className="space-y-1.5 text-xs text-amber-700">
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 text-emerald-600 font-bold">✓</span>
              {t("introTip1")}
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 text-red-500 font-bold">✗</span>
              {t("introTip2")}
            </li>
          </ul>
        </div>

        {/* Mini demo: two shapes from a "same" trial as illustration */}
        <div className="mb-6 flex items-center justify-center gap-6 rounded-xl bg-gray-50 py-5">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">A</span>
            <ShapeView cubes={BASE_SHAPES[0]} size={100} />
          </div>
          <span className="text-xs font-medium text-gray-300">VS</span>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">B</span>
            <ShapeView cubes={applyRot(BASE_SHAPES[0], ROTS[3])} size={100} />
          </div>
        </div>

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

  // ── Result ───────────────────────────────────────────────────────────────
  if (phase === "result") {
    const accuracyPct = resultData.total > 0
      ? Math.round((resultData.correct / resultData.total) * 100)
      : 0;
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("resultTitle")}</h4>
        <p className="mb-4 text-sm text-gray-600">{t("resultDesc")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">{t("resultAccuracyLabel")}</p>
            <p className="text-lg font-semibold text-gray-800">
              {resultData.correct}/{resultData.total}
              <span className="ml-1 text-sm font-normal text-gray-500">({accuracyPct}%)</span>
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">{t("resultRtLabel")}</p>
            <p className="text-lg font-semibold text-gray-800">{resultData.avgRt} ms</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 sm:col-span-2">
            <p className="text-xs text-gray-500">{t("displayScoreLabel")}</p>
            <p className="text-2xl font-bold text-[#5E81AC]">{resultData.score}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">{t("resultScoreHint")}</p>
      </div>
    );
  }

  // ── Practice / Formal ────────────────────────────────────────────────────
  const isPractice = phase === "practice";
  const totalCount = isPractice ? PRACTICE_COUNT : FORMAL_COUNT;

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">

      {/* Header row */}
      <div className="mb-1 flex items-center justify-between">
        <h4 className="font-semibold text-gray-800">
          {isPractice ? t("practiceTitle") : t("formalTitle")}
        </h4>
        <span className="rounded-full bg-[#EFF3F8] px-2.5 py-0.5 text-xs font-medium text-[#5E81AC]">
          {isPractice ? t("practiceBadge") : t("formalBadge")}
        </span>
      </div>

      <p className="mb-4 text-xs text-gray-500">
        {t("progress", { current: trialIdx + 1, total: totalCount })}
      </p>

      {/* Shapes side-by-side */}
      <div className="mb-5 flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {t("shapeA")}
          </span>
          <div className="rounded-xl border-2 border-gray-100 bg-gray-50 p-2">
            <ShapeView cubes={currentTrial.shapeA} size={130} />
          </div>
        </div>

        <div className="pb-4 text-sm font-medium text-gray-300">VS</div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {t("shapeB")}
          </span>
          <div className="rounded-xl border-2 border-gray-100 bg-gray-50 p-2">
            <ShapeView cubes={currentTrial.shapeB} size={130} />
          </div>
        </div>
      </div>

      {/* Practice feedback */}
      {isPractice && feedback && (
        <p className={`mb-3 text-center text-sm font-semibold ${
          feedback === "correct" ? "text-emerald-600" : "text-red-500"
        }`}>
          {feedback === "correct" ? t("practiceFeedbackCorrect") : t("practiceFeedbackWrong")}
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({currentTrial.isSame ? t("answerWasSame") : t("answerWasDiff")})
          </span>
        </p>
      )}

      {/* Question */}
      <p className="mb-3 text-center text-sm font-medium text-gray-700">
        {t("question")}
      </p>

      {/* Answer buttons */}
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => handleAnswer("same")}
          disabled={selected !== null}
          className={`flex-1 max-w-[180px] rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors
            ${selected === "same"
              ? "border-[#5E81AC] bg-[#5E81AC] text-white"
              : "border-gray-200 bg-white text-gray-700 hover:border-[#5E81AC] hover:bg-[#EFF3F8]"}
            disabled:cursor-not-allowed`}
        >
          {t("answerSame")}
        </button>
        <button
          type="button"
          onClick={() => handleAnswer("diff")}
          disabled={selected !== null}
          className={`flex-1 max-w-[180px] rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors
            ${selected === "diff"
              ? "border-red-500 bg-red-500 text-white"
              : "border-gray-200 bg-white text-gray-700 hover:border-red-400 hover:bg-red-50"}
            disabled:cursor-not-allowed`}
        >
          {t("answerDiff")}
        </button>
      </div>

      {/* Practice: manual "Next" or "Start Formal" button */}
      {isPractice && selected !== null && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={advancePractice}
            className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            {trialIdx + 1 < PRACTICE_COUNT ? t("nextTrial") : t("startFormal")}
          </button>
        </div>
      )}

      {/* Formal: progress bar */}
      {!isPractice && (
        <div className="mt-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#5E81AC] transition-all duration-300"
              style={{ width: `${(trialIdx / FORMAL_COUNT) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
