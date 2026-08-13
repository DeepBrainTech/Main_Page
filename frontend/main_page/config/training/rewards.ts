import type { CognitiveDimensionKey } from "@/types/cognitive";
import type { TrainingStars } from "@/types/training";

/**
 * Frontend reward rules (mock until backend).
 * - Strict linear unlock handled in progress helpers.
 * - Dimension points only increase when best stars rise.
 * - 3★ is required before a dimension can receive more than +1 total from a level
 *   (v1: each tagged dimension gets +1 when first reaching 3★; 1–2★ may grant at most +1 total later).
 * - Cap TBD by content design.
 */
export const TRAINING_MAX_DIMENSION_SCORE: number | null = null;

/** Points granted to each tagged dimension when best stars first reach this value. */
export const STARS_TO_DIMENSION_POINTS: Record<TrainingStars, number> = {
  0: 0,
  1: 0,
  2: 0,
  /** First time a level hits 3★ → +1 per tagged dimension */
  3: 1,
};

export function pointsForStarUpgrade(
  previousBest: TrainingStars,
  newBest: TrainingStars,
): number {
  if (newBest <= previousBest) return 0;
  return STARS_TO_DIMENSION_POINTS[newBest] - STARS_TO_DIMENSION_POINTS[previousBest];
}

export function applyDimensionCap(score: number): number {
  if (TRAINING_MAX_DIMENSION_SCORE == null) return score;
  return Math.min(score, TRAINING_MAX_DIMENSION_SCORE);
}

export type DimensionDelta = Partial<Record<CognitiveDimensionKey, number>>;
