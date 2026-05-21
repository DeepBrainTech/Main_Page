"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { TestIntroLayout, testIntroRulesClass, useReportTestChrome } from "../test-ui";

type Phase = "intro" | "practice" | "formal";
type PuzzleKind = "grid" | "graph";
type AgeBandId = "children" | "teens" | "youngAdults" | "middleAged" | "seniors";

interface AgeNorm {
  perfectTarget: number;
  initMin: number;
  initMax: number;
}

interface PositionedNode {
  id: string;
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
  weight: number;
}

interface Puzzle {
  id: string;
  kind: PuzzleKind;
  titleKey: string;
  nodes: PositionedNode[];
  edges: Edge[];
  startId: string;
  goalId: string;
  mustVisitIds: string[];
  blockedNodeIds: string[];
  blockedEdges: Array<[string, string]>;
  baselineTimeSec: number;
  complexityWeight: number;
  optimalDistance: number;
}

interface GridBase {
  id: string;
  titleKey: string;
  rows: number;
  cols: number;
  start: [number, number];
  goal: [number, number];
  blocked: Array<[number, number]>;
  mustVisit: Array<[number, number]>;
  baselineTimeSec: number;
  complexityWeight: number;
}

interface GraphBase {
  id: string;
  titleKey: string;
  nodes: PositionedNode[];
  edges: Edge[];
  startId: string;
  goalId: string;
  mustVisitIds: string[];
  blockedNodeIds: string[];
  blockedEdges: Array<[string, string]>;
  baselineTimeSec: number;
  complexityWeight: number;
}

const AGE_NORMS: Record<AgeBandId, AgeNorm> = {
  children: { perfectTarget: 50, initMin: 4, initMax: 6 },
  teens: { perfectTarget: 75, initMin: 10, initMax: 15 },
  youngAdults: { perfectTarget: 90, initMin: 20, initMax: 25 },
  middleAged: { perfectTarget: 80, initMin: 15, initMax: 20 },
  seniors: { perfectTarget: 60, initMin: 8, initMax: 12 },
};

const PRACTICE_GRID: GridBase = {
  id: "practice-grid",
  titleKey: "routePracticeTitle",
  rows: 5,
  cols: 5,
  start: [0, 0],
  goal: [4, 4],
  blocked: [
    [1, 1],
    [1, 2],
    [3, 1],
  ],
  mustVisit: [[2, 3]],
  baselineTimeSec: 30,
  complexityWeight: 1.0,
};

const PRACTICE_GRAPH: GraphBase = {
  id: "practice-graph",
  titleKey: "routePracticeGraphTitle",
  nodes: [
    { id: "S", x: 30, y: 100 },
    { id: "P1", x: 105, y: 40 },
    { id: "P2", x: 105, y: 160 },
    { id: "C", x: 185, y: 100 },
    { id: "G", x: 285, y: 100 },
  ],
  edges: [
    { from: "S", to: "P1", weight: 2 },
    { from: "S", to: "P2", weight: 2 },
    { from: "P1", to: "C", weight: 2 },
    { from: "P2", to: "C", weight: 3 },
    { from: "C", to: "G", weight: 2 },
    { from: "P1", to: "G", weight: 6 },
    { from: "P2", to: "G", weight: 5 },
  ],
  startId: "S",
  goalId: "G",
  mustVisitIds: ["C"],
  blockedNodeIds: [],
  blockedEdges: [],
  baselineTimeSec: 28,
  complexityWeight: 1.0,
};

const FORMAL_GRID_1: GridBase = {
  id: "formal-grid-1",
  titleKey: "routeFormalGridOne",
  rows: 6,
  cols: 6,
  start: [5, 0],
  goal: [0, 5],
  blocked: [
    [4, 1],
    [3, 1],
    [2, 2],
    [1, 3],
    [2, 4],
  ],
  mustVisit: [[3, 4]],
  baselineTimeSec: 40,
  complexityWeight: 1.2,
};

const FORMAL_GRID_2: GridBase = {
  id: "formal-grid-2",
  titleKey: "routeFormalGridTwo",
  rows: 6,
  cols: 6,
  start: [0, 0],
  goal: [5, 5],
  blocked: [
    [1, 1],
    [2, 3],
    [3, 3],
    [4, 2],
    [4, 4],
  ],
  mustVisit: [[1, 4], [4, 1]],
  baselineTimeSec: 45,
  complexityWeight: 1.3,
};

const FORMAL_GRID_3: GridBase = {
  id: "formal-grid-3",
  titleKey: "routeFormalGridThree",
  rows: 6,
  cols: 6,
  start: [5, 5],
  goal: [0, 0],
  blocked: [
    [4, 4],
    [4, 2],
    [3, 2],
    [2, 1],
    [1, 1],
  ],
  mustVisit: [[4, 0], [1, 4]],
  baselineTimeSec: 50,
  complexityWeight: 1.4,
};

const FORMAL_GRAPH_1: GraphBase = {
  id: "formal-graph-1",
  titleKey: "routeFormalGraphOne",
  nodes: [
    { id: "S", x: 30, y: 110 },
    { id: "X1", x: 85, y: 45 },
    { id: "X2", x: 85, y: 175 },
    { id: "C", x: 165, y: 70 },
    { id: "X3", x: 165, y: 150 },
    { id: "X4", x: 235, y: 110 },
    { id: "G", x: 295, y: 110 },
  ],
  edges: [
    { from: "S", to: "X1", weight: 2 },
    { from: "S", to: "X2", weight: 2 },
    { from: "X1", to: "C", weight: 2 },
    { from: "X2", to: "C", weight: 3 },
    { from: "X1", to: "X3", weight: 4 },
    { from: "X2", to: "X3", weight: 2 },
    { from: "C", to: "X3", weight: 2 },
    { from: "C", to: "X4", weight: 2 },
    { from: "X3", to: "X4", weight: 2 },
    { from: "X4", to: "G", weight: 2 },
    { from: "C", to: "G", weight: 5 },
    { from: "X3", to: "G", weight: 4 },
  ],
  startId: "S",
  goalId: "G",
  mustVisitIds: ["C"],
  blockedNodeIds: [],
  blockedEdges: [],
  baselineTimeSec: 35,
  complexityWeight: 1.2,
};

const FORMAL_GRAPH_2: GraphBase = {
  id: "formal-graph-2",
  titleKey: "routeFormalGraphTwo",
  nodes: [
    { id: "S", x: 30, y: 100 },
    { id: "Y1", x: 95, y: 35 },
    { id: "Y2", x: 95, y: 165 },
    { id: "C", x: 170, y: 100 },
    { id: "Y3", x: 240, y: 40 },
    { id: "Y4", x: 240, y: 160 },
    { id: "G", x: 300, y: 100 },
  ],
  edges: [
    { from: "S", to: "Y1", weight: 2 },
    { from: "S", to: "Y2", weight: 2 },
    { from: "S", to: "C", weight: 5 },
    { from: "Y1", to: "C", weight: 2 },
    { from: "Y2", to: "C", weight: 2 },
    { from: "Y1", to: "Y3", weight: 4 },
    { from: "Y2", to: "Y4", weight: 4 },
    { from: "C", to: "Y3", weight: 2 },
    { from: "C", to: "Y4", weight: 2 },
    { from: "Y3", to: "G", weight: 2 },
    { from: "Y4", to: "G", weight: 2 },
    { from: "C", to: "G", weight: 3 },
  ],
  startId: "S",
  goalId: "G",
  mustVisitIds: ["C"],
  blockedNodeIds: [],
  blockedEdges: [["C", "G"]],
  baselineTimeSec: 50,
  complexityWeight: 1.5,
};

const FORMAL_GRAPH_3: GraphBase = {
  id: "formal-graph-3",
  titleKey: "routeFormalGraphThree",
  nodes: [
    { id: "S", x: 25, y: 110 },
    { id: "Z1", x: 95, y: 45 },
    { id: "Z2", x: 95, y: 175 },
    { id: "C", x: 165, y: 110 },
    { id: "Z3", x: 235, y: 45 },
    { id: "Z4", x: 235, y: 175 },
    { id: "Z5", x: 270, y: 110 },
    { id: "G", x: 305, y: 110 },
  ],
  edges: [
    { from: "S", to: "Z1", weight: 2 },
    { from: "S", to: "Z2", weight: 3 },
    { from: "Z1", to: "C", weight: 2 },
    { from: "Z2", to: "C", weight: 2 },
    { from: "Z1", to: "Z3", weight: 3 },
    { from: "Z2", to: "Z4", weight: 3 },
    { from: "C", to: "Z3", weight: 2 },
    { from: "C", to: "Z4", weight: 2 },
    { from: "Z3", to: "Z5", weight: 2 },
    { from: "Z4", to: "Z5", weight: 2 },
    { from: "Z5", to: "G", weight: 1 },
    { from: "C", to: "G", weight: 4 },
  ],
  startId: "S",
  goalId: "G",
  mustVisitIds: ["C"],
  blockedNodeIds: [],
  blockedEdges: [["C", "G"]],
  baselineTimeSec: 55,
  complexityWeight: 1.6,
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
  if (age >= 7 && age <= 12) return "children";
  if (age >= 13 && age <= 18) return "teens";
  if (age >= 19 && age <= 35) return "youngAdults";
  if (age >= 36 && age <= 60) return "middleAged";
  if (age >= 61) return "seniors";
  return null;
}

function edgeKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function buildGridPuzzle(base: GridBase): Puzzle {
  const blockedSet = new Set(base.blocked.map(([r, c]) => `${r}-${c}`));
  const nodes: PositionedNode[] = [];
  const edges: Edge[] = [];
  const nodeSet = new Set<string>();
  for (let r = 0; r < base.rows; r += 1) {
    for (let c = 0; c < base.cols; c += 1) {
      const id = `${r}-${c}`;
      if (blockedSet.has(id)) continue;
      nodeSet.add(id);
      nodes.push({ id, x: c, y: r });
    }
  }

  for (let r = 0; r < base.rows; r += 1) {
    for (let c = 0; c < base.cols; c += 1) {
      const id = `${r}-${c}`;
      if (!nodeSet.has(id)) continue;
      const neighbors: Array<[number, number]> = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];
      for (const [nr, nc] of neighbors) {
        const nid = `${nr}-${nc}`;
        if (!nodeSet.has(nid)) continue;
        if (id < nid) edges.push({ from: id, to: nid, weight: 1 });
      }
    }
  }

  return {
    id: base.id,
    kind: "grid",
    titleKey: base.titleKey,
    nodes,
    edges,
    startId: `${base.start[0]}-${base.start[1]}`,
    goalId: `${base.goal[0]}-${base.goal[1]}`,
    mustVisitIds: base.mustVisit.map(([r, c]) => `${r}-${c}`),
    blockedNodeIds: base.blocked.map(([r, c]) => `${r}-${c}`),
    blockedEdges: [],
    baselineTimeSec: base.baselineTimeSec,
    complexityWeight: base.complexityWeight,
    optimalDistance: 0,
  };
}

function buildGraphPuzzle(base: GraphBase): Puzzle {
  return {
    id: base.id,
    kind: "graph",
    titleKey: base.titleKey,
    nodes: [...base.nodes],
    edges: [...base.edges],
    startId: base.startId,
    goalId: base.goalId,
    mustVisitIds: [...base.mustVisitIds],
    blockedNodeIds: [...base.blockedNodeIds],
    blockedEdges: [...base.blockedEdges],
    baselineTimeSec: base.baselineTimeSec,
    complexityWeight: base.complexityWeight,
    optimalDistance: 0,
  };
}

function computeOptimalDistance(puzzle: Puzzle) {
  const mustIndex = new Map<string, number>();
  puzzle.mustVisitIds.forEach((id, idx) => mustIndex.set(id, idx));
  const targetMask = puzzle.mustVisitIds.length === 0 ? 0 : (1 << puzzle.mustVisitIds.length) - 1;
  const startMask = mustIndex.has(puzzle.startId) ? 1 << (mustIndex.get(puzzle.startId) ?? 0) : 0;

  type State = { nodeId: string; mask: number; dist: number };
  const distMap = new Map<string, number>();
  const queue: State[] = [{ nodeId: puzzle.startId, mask: startMask, dist: 0 }];
  distMap.set(`${puzzle.startId}|${startMask}`, 0);

  const blockedEdgeSet = new Set(puzzle.blockedEdges.map(([a, b]) => edgeKey(a, b)));
  const adjacency = new Map<string, Array<{ to: string; weight: number }>>();
  for (const node of puzzle.nodes) adjacency.set(node.id, []);
  for (const edge of puzzle.edges) {
    if (blockedEdgeSet.has(edgeKey(edge.from, edge.to))) continue;
    if (puzzle.blockedNodeIds.includes(edge.from) || puzzle.blockedNodeIds.includes(edge.to)) continue;
    adjacency.get(edge.from)?.push({ to: edge.to, weight: edge.weight });
    adjacency.get(edge.to)?.push({ to: edge.from, weight: edge.weight });
  }

  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const current = queue.shift();
    if (!current) break;
    const stateKey = `${current.nodeId}|${current.mask}`;
    const known = distMap.get(stateKey);
    if (known == null || current.dist > known) continue;
    if (current.nodeId === puzzle.goalId && current.mask === targetMask) return current.dist;

    const nextEdges = adjacency.get(current.nodeId) ?? [];
    for (const item of nextEdges) {
      let nextMask = current.mask;
      if (mustIndex.has(item.to)) nextMask |= 1 << (mustIndex.get(item.to) ?? 0);
      const nextDist = current.dist + item.weight;
      const nextKey = `${item.to}|${nextMask}`;
      const prev = distMap.get(nextKey);
      if (prev == null || nextDist < prev) {
        distMap.set(nextKey, nextDist);
        queue.push({ nodeId: item.to, mask: nextMask, dist: nextDist });
      }
    }
  }
  return Infinity;
}

function withOptimalDistance(puzzle: Puzzle): Puzzle {
  return { ...puzzle, optimalDistance: computeOptimalDistance(puzzle) };
}

function getEdgeWeight(puzzle: Puzzle, a: string, b: string) {
  const blockedEdgeSet = new Set(puzzle.blockedEdges.map(([x, y]) => edgeKey(x, y)));
  if (blockedEdgeSet.has(edgeKey(a, b))) return null;
  for (const edge of puzzle.edges) {
    const isMatch = (edge.from === a && edge.to === b) || (edge.from === b && edge.to === a);
    if (!isMatch) continue;
    if (puzzle.blockedNodeIds.includes(a) || puzzle.blockedNodeIds.includes(b)) return null;
    return edge.weight;
  }
  return null;
}

function isValidFinishedPath(puzzle: Puzzle, path: string[]) {
  if (path.length === 0) return false;
  if (path[0] !== puzzle.startId) return false;
  if (path[path.length - 1] !== puzzle.goalId) return false;
  for (const need of puzzle.mustVisitIds) {
    if (!path.includes(need)) return false;
  }
  return true;
}

function pathDistance(puzzle: Puzzle, path: string[]) {
  if (path.length < 2) return 0;
  let distance = 0;
  for (let i = 1; i < path.length; i += 1) {
    const weight = getEdgeWeight(puzzle, path[i - 1], path[i]);
    if (weight == null) return Infinity;
    distance += weight;
  }
  return distance;
}

function computeInitScore(initSeconds: number, norm: AgeNorm | null) {
  if (!norm) return Math.round(clamp((20 - initSeconds) * 5, 0, 100));
  const mid = (norm.initMin + norm.initMax) / 2;
  const half = (norm.initMax - norm.initMin) / 2;
  if (half <= 0) return 50;
  if (initSeconds >= norm.initMin && initSeconds <= norm.initMax) {
    return Math.round(clamp(100 - (Math.abs(initSeconds - mid) / half) * 30, 70, 100));
  }
  const distance = initSeconds < norm.initMin ? norm.initMin - initSeconds : initSeconds - norm.initMax;
  return Math.round(clamp(70 - distance * 12, 0, 70));
}

function computePerfectScore(perfectRate: number, norm: AgeNorm | null) {
  if (!norm) return Math.round(clamp(perfectRate, 0, 100));
  if (perfectRate <= norm.perfectTarget) {
    return Math.round(clamp((perfectRate / norm.perfectTarget) * 60, 0, 60));
  }
  return Math.round(
    clamp(60 + ((perfectRate - norm.perfectTarget) / (100 - norm.perfectTarget)) * 40, 60, 100)
  );
}

function computeSPIPercent(puzzle: Puzzle, dAct: number, tActual: number) {
  if (!Number.isFinite(dAct) || dAct <= 0 || tActual <= 0 || !Number.isFinite(puzzle.optimalDistance)) return 0;
  const spi =
    (puzzle.optimalDistance / dAct) *
    (puzzle.baselineTimeSec / tActual) *
    puzzle.complexityWeight;
  return Math.round(clamp((spi / 1.8) * 100, 0, 100));
}

export default function RoutePlanning({
  onComplete,
  dateOfBirth,
}: {
  onComplete: (score: number) => void;
  dateOfBirth?: string | null;
}) {
  const t = useTranslations("test.strategy");
  const ageBand = useMemo(() => resolveAgeBand(parseAge(dateOfBirth)), [dateOfBirth]);
  const ageNorm = useMemo(() => (ageBand ? AGE_NORMS[ageBand] : null), [ageBand]);

  const practicePuzzles = useMemo(
    () =>
      [
        withOptimalDistance(buildGridPuzzle(PRACTICE_GRID)),
        withOptimalDistance(buildGraphPuzzle(PRACTICE_GRAPH)),
      ],
    []
  );
  const formalPuzzles = useMemo(
    () =>
      [
        withOptimalDistance(buildGridPuzzle(FORMAL_GRID_1)),
        withOptimalDistance(buildGridPuzzle(FORMAL_GRID_2)),
        withOptimalDistance(buildGridPuzzle(FORMAL_GRID_3)),
        withOptimalDistance(buildGraphPuzzle(FORMAL_GRAPH_1)),
        withOptimalDistance(buildGraphPuzzle(FORMAL_GRAPH_2)),
        withOptimalDistance(buildGraphPuzzle(FORMAL_GRAPH_3)),
      ],
    []
  );

  const [phase, setPhase] = useState<Phase>("intro");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practicePath, setPracticePath] = useState<string[]>([]);
  const [practiceDone, setPracticeDone] = useState(false);

  const [formalIndex, setFormalIndex] = useState(0);
  const [formalPath, setFormalPath] = useState<string[]>([]);
  const [errorHint, setErrorHint] = useState("");
  const [spiScores, setSpiScores] = useState<number[]>([]);
  const [perfectFlags, setPerfectFlags] = useState<number[]>([]);
  const [initTimes, setInitTimes] = useState<number[]>([]);

  const trialStartRef = useRef<number>(0);
  const firstActionRef = useRef<number | null>(null);

  const currentPuzzle = phase === "practice" ? practicePuzzles[practiceIndex] : formalPuzzles[formalIndex];
  const currentPath = phase === "practice" ? practicePath : formalPath;
  const pathDist = pathDistance(currentPuzzle, currentPath);
  const hasAllMustVisit = currentPuzzle.mustVisitIds.every((id) => currentPath.includes(id));
  const isAtGoal = currentPath.length > 0 && currentPath[currentPath.length - 1] === currentPuzzle.goalId;
  const canSubmit = isAtGoal && hasAllMustVisit && currentPath[0] === currentPuzzle.startId;

  const startPractice = () => {
    setPhase("practice");
    setPracticeIndex(0);
    setPracticePath([practicePuzzles[0].startId]);
    setPracticeDone(false);
    setErrorHint("");
    firstActionRef.current = null;
    trialStartRef.current = performance.now();
  };

  const startFormal = () => {
    setPhase("formal");
    setFormalIndex(0);
    setFormalPath([formalPuzzles[0].startId]);
    setSpiScores([]);
    setPerfectFlags([]);
    setInitTimes([]);
    setErrorHint("");
    firstActionRef.current = null;
    trialStartRef.current = performance.now();
  };

  const openNextFormal = (nextIndex: number) => {
    setFormalIndex(nextIndex);
    setFormalPath([formalPuzzles[nextIndex].startId]);
    setErrorHint("");
    firstActionRef.current = null;
    trialStartRef.current = performance.now();
  };

  const finishFormalTrial = (forceSkip: boolean, trialPath?: string[]) => {
    const pathForTrial = trialPath ?? formalPath;
    const validSubmit = isValidFinishedPath(currentPuzzle, pathForTrial);
    const now = performance.now();
    const initMs = firstActionRef.current == null ? now - trialStartRef.current : firstActionRef.current;
    const initSec = Math.max(0, initMs / 1000);
    const totalSec = Math.max(0.2, (now - trialStartRef.current) / 1000);
    const valid = validSubmit && !forceSkip;
    const dAct = valid ? pathDistance(currentPuzzle, pathForTrial) : Infinity;
    const spiPercent = valid ? computeSPIPercent(currentPuzzle, dAct, totalSec) : 0;
    const perfect = valid && dAct === currentPuzzle.optimalDistance ? 1 : 0;

    const nextSpi = [...spiScores, forceSkip ? 0 : spiPercent];
    const nextPerfect = [...perfectFlags, perfect];
    const nextInit = [...initTimes, initSec];
    setSpiScores(nextSpi);
    setPerfectFlags(nextPerfect);
    setInitTimes(nextInit);

    if (formalIndex + 1 < formalPuzzles.length) {
      openNextFormal(formalIndex + 1);
      return;
    }

    const spiAvg = nextSpi.reduce((sum, value) => sum + value, 0) / nextSpi.length;
    const perfectRate = (nextPerfect.reduce((sum, value) => sum + value, 0) / nextPerfect.length) * 100;
    const initAvg = nextInit.reduce((sum, value) => sum + value, 0) / nextInit.length;
    const perfectScore = computePerfectScore(perfectRate, ageNorm);
    const initScore = computeInitScore(initAvg, ageNorm);
    const finalScore = Math.round(spiAvg * 0.6 + perfectScore * 0.25 + initScore * 0.15);
    onComplete(clamp(finalScore, 0, 100));
  };

  const onNodeClick = (nodeId: string) => {
    if (phase !== "practice" && phase !== "formal") return;
    if (currentPuzzle.blockedNodeIds.includes(nodeId)) return;

    const path = phase === "practice" ? practicePath : formalPath;
    if (path.length > 0 && path[path.length - 1] === currentPuzzle.goalId) {
      setErrorHint(t("routeGoalAlreadyReached"));
      return;
    }
    if (path.length === 0) return;

    const last = path[path.length - 1];
    if (last === nodeId && path.length >= 2) {
      const nextPath = path.slice(0, -1);
      if (phase === "practice") setPracticePath(nextPath);
      else setFormalPath(nextPath);
      setErrorHint("");
      return;
    }

    const weight = getEdgeWeight(currentPuzzle, last, nodeId);
    if (weight == null) {
      setErrorHint(t("routeInvalidStep"));
      return;
    }
    if (path.includes(nodeId)) {
      setErrorHint(t("routeNoRevisit"));
      return;
    }
    if (firstActionRef.current == null) firstActionRef.current = performance.now() - trialStartRef.current;
    setErrorHint("");
    const nextPath = [...path, nodeId];
    const reachedGoal = nodeId === currentPuzzle.goalId;
    const isValidAtGoal = isValidFinishedPath(currentPuzzle, nextPath);
    if (phase === "practice") {
      setPracticePath(nextPath);
      if (reachedGoal) {
        if (!isValidAtGoal) {
          setPracticeDone(false);
          setErrorHint(t("routeGoalMissingCheckpoint"));
          return;
        }
        setPracticeDone(true);
        setErrorHint("");
      }
    } else {
      if (reachedGoal) {
        setFormalPath(nextPath);
        finishFormalTrial(!isValidAtGoal, nextPath);
      } else {
        setFormalPath(nextPath);
      }
    }
  };

  const onReset = () => {
    if (phase === "practice") {
      setPracticePath([currentPuzzle.startId]);
    } else {
      setFormalPath([currentPuzzle.startId]);
    }
    setErrorHint("");
    firstActionRef.current = null;
    trialStartRef.current = performance.now();
  };

  const onUndo = () => {
    if (phase === "practice") {
      if (practicePath.length <= 1) return;
      setPracticePath(practicePath.slice(0, -1));
    } else {
      if (formalPath.length <= 1) return;
      setFormalPath(formalPath.slice(0, -1));
    }
    setErrorHint("");
  };

  const onSkipFormal = () => {
    if (phase !== "formal") return;
    finishFormalTrial(true);
  };

  const onPracticeNext = () => {
    if (phase !== "practice") return;
    if (practiceIndex + 1 >= practicePuzzles.length) return;
    const nextIndex = practiceIndex + 1;
    setPracticeIndex(nextIndex);
    setPracticePath([practicePuzzles[nextIndex].startId]);
    setPracticeDone(false);
    setErrorHint("");
    firstActionRef.current = null;
    trialStartRef.current = performance.now();
  };

  const renderGridBoard = () => {
    const positions = new Map(currentPuzzle.nodes.map((node) => [node.id, node]));
    const rows = Math.max(...currentPuzzle.nodes.map((node) => node.y)) + 1;
    const cols = Math.max(...currentPuzzle.nodes.map((node) => node.x)) + 1;
    const pathSet = new Set(currentPath);
    const pathEdgeSet = new Set<string>();
    for (let i = 1; i < currentPath.length; i += 1) {
      pathEdgeSet.add(edgeKey(currentPath[i - 1], currentPath[i]));
    }

    return (
      <div className="mx-auto w-full max-w-[520px]">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: rows * cols }).map((_, idx) => {
          const r = Math.floor(idx / cols);
          const c = idx % cols;
          const id = `${r}-${c}`;
          const node = positions.get(id);
          if (!node) return <div key={id} className="aspect-square rounded bg-gray-200/70" />;

          const isStart = id === currentPuzzle.startId;
          const isGoal = id === currentPuzzle.goalId;
          const isMust = currentPuzzle.mustVisitIds.includes(id);
          const inPath = pathSet.has(id);
          const topId = `${r - 1}-${c}`;
          const bottomId = `${r + 1}-${c}`;
          const leftId = `${r}-${c - 1}`;
          const rightId = `${r}-${c + 1}`;
          const hasTop = pathEdgeSet.has(edgeKey(id, topId));
          const hasBottom = pathEdgeSet.has(edgeKey(id, bottomId));
          const hasLeft = pathEdgeSet.has(edgeKey(id, leftId));
          const hasRight = pathEdgeSet.has(edgeKey(id, rightId));
          const hasAnyEdge = hasTop || hasBottom || hasLeft || hasRight;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNodeClick(id)}
              className={`relative aspect-square rounded border text-xs font-semibold ${
                isStart
                  ? "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800"
                  : isGoal
                    ? "border-indigo-300 bg-indigo-100 text-indigo-800"
                    : isMust
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : inPath
                        ? "border-red-300 bg-white text-gray-700"
                        : "border-gray-300 bg-white text-gray-600 hover:border-[#5E81AC]"
              }`}
            >
              {inPath && (
                <>
                  {hasTop && (
                    <div className="pointer-events-none absolute left-1/2 top-0 h-1/2 w-[3px] -translate-x-1/2 bg-red-500" />
                  )}
                  {hasBottom && (
                    <div className="pointer-events-none absolute bottom-0 left-1/2 h-1/2 w-[3px] -translate-x-1/2 bg-red-500" />
                  )}
                  {hasLeft && (
                    <div className="pointer-events-none absolute left-0 top-1/2 h-[3px] w-1/2 -translate-y-1/2 bg-red-500" />
                  )}
                  {hasRight && (
                    <div className="pointer-events-none absolute right-0 top-1/2 h-[3px] w-1/2 -translate-y-1/2 bg-red-500" />
                  )}
                  {hasAnyEdge && (
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500" />
                  )}
                </>
              )}
              <span className="relative z-10 text-base font-bold">
                {isStart ? "S" : isGoal ? "G" : isMust ? "C" : ""}
              </span>
            </button>
          );
        })}
        </div>
      </div>
    );
  };

  const renderGraphBoard = () => {
    const nodeById = new Map(currentPuzzle.nodes.map((node) => [node.id, node]));
    const pathEdges = new Set<string>();
    for (let i = 1; i < currentPath.length; i += 1) {
      pathEdges.add(edgeKey(currentPath[i - 1], currentPath[i]));
    }
    const blockedEdges = new Set(currentPuzzle.blockedEdges.map(([a, b]) => edgeKey(a, b)));

    return (
      <svg viewBox="0 0 320 220" className="h-[260px] w-full rounded-xl border border-gray-200 bg-gray-50 p-2">
        {currentPuzzle.edges.map((edge, idx) => {
          const from = nodeById.get(edge.from);
          const to = nodeById.get(edge.to);
          if (!from || !to) return null;
          const key = edgeKey(edge.from, edge.to);
          const isBlocked = blockedEdges.has(key);
          if (isBlocked) return null;
          const isSelected = pathEdges.has(key);
          return (
            <g key={`${edge.from}-${edge.to}-${idx}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isSelected ? "#5E81AC" : "#94A3B8"}
                strokeWidth={isSelected ? 4 : 2.5}
              />
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 4}
                textAnchor="middle"
                className="fill-gray-600 text-[10px] font-semibold"
              >
                {edge.weight}
              </text>
            </g>
          );
        })}
        {currentPuzzle.nodes.map((node) => {
          const isStart = node.id === currentPuzzle.startId;
          const isGoal = node.id === currentPuzzle.goalId;
          const isMust = currentPuzzle.mustVisitIds.includes(node.id);
          const inPath = currentPath.includes(node.id);
          return (
            <g key={node.id} onClick={() => onNodeClick(node.id)} className="cursor-pointer">
              <circle
                cx={node.x}
                cy={node.y}
                r={15}
                fill={
                  inPath
                    ? "#5E81AC"
                    : isStart
                      ? "#E879F9"
                      : isGoal
                        ? "#1E3A8A"
                        : isMust
                          ? "#FACC15"
                          : "#E5E7EB"
                }
                stroke="#64748B"
                strokeWidth={2}
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                className={`text-[11px] font-semibold ${inPath || isGoal ? "fill-white" : "fill-gray-700"}`}
              >
                {isStart ? "S" : isGoal ? "G" : isMust ? "C" : ""}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  useReportTestChrome(phase === "intro" ? { screen: "intro" } : { screen: "active" });

  if (phase === "intro") {
    return (
      <TestIntroLayout
        title={t("routeTitle")}
        description={t("routeDesc")}
        onStartPractice={startPractice}
        onStartTest={startFormal}
        extra={
          <ul className={testIntroRulesClass}>
            <li>{t("routeRuleMove")}</li>
            <li>{t("routeRuleConstraint")}</li>
            <li>{t("routeRuleScoring")}</li>
            <li>{t("routeRulePractice")}</li>
            <li>{t("routeRuleFormal")}</li>
          </ul>
        }
      />
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">
        {phase === "practice" ? t("routePracticeStage") : t("routeFormalStage")}
      </h4>
      <span className="mb-3 inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
        {phase === "practice" ? t("practiceBadge") : t("formalBadge")}
      </span>

      {phase === "formal" && (
        <p className="mb-3 text-xs text-gray-500">
          {t("routeFormalProgress", {
            current: formalIndex + 1,
            total: formalPuzzles.length,
            kind: currentPuzzle.kind === "grid" ? t("routeKindGrid") : t("routeKindGraph"),
          })}
        </p>
      )}
      {phase === "practice" && (
        <p className="mb-3 text-xs text-gray-500">
          {t("routePracticeProgress", {
            current: practiceIndex + 1,
            total: practicePuzzles.length,
            kind: currentPuzzle.kind === "grid" ? t("routeKindGrid") : t("routeKindGraph"),
          })}
        </p>
      )}

      <div className="mb-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
        <p className="font-semibold text-gray-800">{t(currentPuzzle.titleKey)}</p>
        <p>{t("routeStatActual", { value: Number.isFinite(pathDist) ? pathDist : "-" })}</p>
        <p>{t("routeStatMust", { value: `${currentPuzzle.mustVisitIds.length}` })}</p>
      </div>

      {currentPuzzle.kind === "grid" ? renderGridBoard() : renderGraphBoard()}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onUndo}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          {t("routeUndo")}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          {t("routeReset")}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm font-semibold ${canSubmit ? "text-emerald-600" : "text-gray-600"}`}>
          {phase === "practice"
            ? practiceDone
              ? practiceIndex + 1 < practicePuzzles.length
                ? t("routePracticeNext")
                : t("routePracticeAllDone")
              : t("routeNotReady")
            : canSubmit
              ? t("routeAutoSubmitAtGoal")
              : t("routeNotReady")}
        </p>
        {phase === "practice" ? (
          practiceIndex + 1 < practicePuzzles.length ? (
            <button
              type="button"
              onClick={onPracticeNext}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
            >
              {t("routeNextPractice")}
            </button>
          ) : (
            <button
              type="button"
              onClick={startFormal}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
            >
              {t("startFormal")}
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={onSkipFormal}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            {t("skipFormal")}
          </button>
        )}
      </div>

      {errorHint && <p className="mt-3 text-sm font-semibold text-red-600">{errorHint}</p>}
    </div>
  );
}
