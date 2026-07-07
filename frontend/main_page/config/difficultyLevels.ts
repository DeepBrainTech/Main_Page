/**
 * Difficulty configuration for all 17 sub-tests across 5 levels.
 * params: test-specific overrides; null means use component defaults.
 */

import type { SubTestKey } from "@/types/progression";

export interface DifficultyConfig {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  estimatedMinutes: number;
  /** Sub-test-specific override parameters */
  params: Record<string, unknown>;
}

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "入门",
  2: "进阶",
  3: "挑战",
  4: "专家",
  5: "大师",
};

const DIFFICULTY_LABELS_EN: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Challenge",
  4: "Expert",
  5: "Master",
};

export function getDifficultyLabel(level: number, locale = "zh"): string {
  return locale === "zh"
    ? (DIFFICULTY_LABELS[level] ?? String(level))
    : (DIFFICULTY_LABELS_EN[level] ?? String(level));
}

/** Star score thresholds: [threeStars, twoStars] per level */
export const STAR_THRESHOLDS: [number, number][] = [
  [70, 50],
  [77, 55],
  [83, 62],
  [89, 70],
  [94, 78],
];

export function computeStars(score: number, level: number): 0 | 1 | 2 | 3 {
  const idx = Math.max(0, Math.min(4, level - 1));
  const [threeStar, twoStar] = STAR_THRESHOLDS[idx];
  if (score >= threeStar) return 3;
  if (score >= twoStar) return 2;
  if (score >= 30) return 1;
  return 0;
}

/**
 * Gentler star thresholds for Training Map levels.
 * Scores are averaged across multiple sub-tests so individual variance smooths out.
 */
export function computeMapStars(score: number, mapLevel: number): 0 | 1 | 2 | 3 {
  let threeStar: number;
  let twoStar: number;
  if (mapLevel <= 10)      { threeStar = 75; twoStar = 50; }
  else if (mapLevel <= 15) { threeStar = 78; twoStar = 55; }
  else if (mapLevel <= 22) { threeStar = 82; twoStar = 60; }
  else                     { threeStar = 86; twoStar = 65; }
  if (score >= threeStar) return 3;
  if (score >= twoStar) return 2;
  if (score >= 20) return 1;
  return 0;
}

type LevelMap = Record<1 | 2 | 3 | 4 | 5, DifficultyConfig>;

function makeLevels(
  estimatedMinutes: [number, number, number, number, number],
  params: [Record<string, unknown>, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>]
): LevelMap {
  return {
    1: { level: 1, label: DIFFICULTY_LABELS[1], estimatedMinutes: estimatedMinutes[0], params: params[0] },
    2: { level: 2, label: DIFFICULTY_LABELS[2], estimatedMinutes: estimatedMinutes[1], params: params[1] },
    3: { level: 3, label: DIFFICULTY_LABELS[3], estimatedMinutes: estimatedMinutes[2], params: params[2] },
    4: { level: 4, label: DIFFICULTY_LABELS[4], estimatedMinutes: estimatedMinutes[3], params: params[3] },
    5: { level: 5, label: DIFFICULTY_LABELS[5], estimatedMinutes: estimatedMinutes[4], params: params[4] },
  };
}

export const DIFFICULTY_LEVELS: Record<SubTestKey, LevelMap> = {
  // ---------- MEMORY ----------
  memory_sternberg: makeLevels(
    [2, 2, 2, 3, 3],
    [
      { memorizeMs: 5000, formalCounts: { 3: 3, 5: 3, 7: 3 } },   // 9 trials
      { memorizeMs: 4000, formalCounts: { 3: 3, 5: 3, 7: 3 } },
      { memorizeMs: 3200, formalCounts: { 3: 4, 5: 4, 7: 4 } },   // 12 trials
      { memorizeMs: 2400, formalCounts: { 3: 4, 5: 4, 7: 4 } },
      { memorizeMs: 1800, formalCounts: { 3: 4, 5: 4, 7: 4 } },
    ]
  ),
  memory_change: makeLevels(
    [2, 2, 3, 3, 3],
    [
      { formalCount: 9 },
      { formalCount: 9 },
      { formalCount: 12 },
      { formalCount: 12 },
      { formalCount: 12 },
    ]
  ),
  memory_nback: makeLevels(
    [2, 2, 3, 3, 4],
    [
      { nLevel: 1, intervalMs: 2500 },
      { nLevel: 1, intervalMs: 2000 },
      { nLevel: 2, intervalMs: 2500 },
      { nLevel: 2, intervalMs: 2000 },
      { nLevel: 3, intervalMs: 2500 },
    ]
  ),
  // ---------- LOGIC ----------
  logic_transitive: makeLevels(
    [2, 2, 3, 3, 3],
    [
      { formalCount: 8 },
      { formalCount: 8 },
      { formalCount: 10 },
      { formalCount: 12 },
      { formalCount: 14 },
    ]
  ),
  logic_syllogism: makeLevels(
    [2, 2, 3, 3, 3],
    [
      { formalCount: 8 },
      { formalCount: 8 },
      { formalCount: 10 },
      { formalCount: 12 },
      { formalCount: 14 },
    ]
  ),
  logic_analogy: makeLevels(
    [2, 2, 2, 3, 3],
    [
      { formalCount: 8 },
      { formalCount: 8 },
      { formalCount: 10 },
      { formalCount: 12 },
      { formalCount: 14 },
    ]
  ),
  // ---------- FOCUS ----------
  focus_flanker: makeLevels(
    [2, 2, 3, 3, 3],
    [
      { trialWindowMs: 2500, formalCount: 20 },
      { trialWindowMs: 2000, formalCount: 20 },
      { trialWindowMs: 1600, formalCount: 24 },
      { trialWindowMs: 1200, formalCount: 24 },
      { trialWindowMs: 900,  formalCount: 30 },
    ]
  ),
  focus_stroop: makeLevels(
    [2, 2, 2, 3, 3],
    [
      { formalCount: 10 },
      { formalCount: 10 },
      { formalCount: 12 },
      { formalCount: 14 },
      { formalCount: 16 },
    ]
  ),
  focus_schulte: makeLevels(
    [1, 2, 3, 3, 4],
    [
      { gridSizes: [3] },
      { gridSizes: [3, 4] },
      { gridSizes: [3, 4, 5] },
      { gridSizes: [4, 5] },
      { gridSizes: [5] },
    ]
  ),
  // ---------- REACTION ----------
  reaction_click: makeLevels(
    [1, 2, 2, 3, 3],
    [{}, {}, {}, {}, {}]
  ),
  reaction_arrow: makeLevels(
    [2, 2, 2, 3, 3],
    [{}, {}, {}, {}, {}]
  ),
  reaction_pvt: makeLevels(
    [2, 2, 3, 3, 3],
    [{}, {}, {}, {}, {}]
  ),
  // ---------- STRATEGY ----------
  strategy_hanoi: makeLevels(
    [2, 2, 3, 3, 4],
    [
      { diskSequence: [3] },
      { diskSequence: [3, 4] },
      { diskSequence: [3, 4, 5] },
      { diskSequence: [4, 5] },
      { diskSequence: [5, 6] },
    ]
  ),
  strategy_london: makeLevels(
    [2, 2, 3, 3, 4],
    [{}, {}, {}, {}, {}]
  ),
  strategy_route: makeLevels(
    [3, 3, 4, 4, 5],
    [{}, {}, {}, {}, {}]
  ),
  // ---------- SPATIAL ----------
  spatial_rotation: makeLevels(
    [2, 2, 3, 3, 3],
    [{}, {}, {}, {}, {}]
  ),
  spatial_fold: makeLevels(
    [2, 2, 3, 3, 4],
    [{}, {}, {}, {}, {}]
  ),
};

export function getDifficultyConfig(subTestKey: SubTestKey, level: number): DifficultyConfig {
  const map = DIFFICULTY_LEVELS[subTestKey];
  const safeLevel = (Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5);
  return map[safeLevel];
}
