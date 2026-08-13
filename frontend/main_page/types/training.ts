/**
 * Training (闯关) — frontend-only types.
 * Dimension keys match cognitive test; scores will migrate from test → training later.
 */
import type { CognitiveDimensionKey } from "@/types/cognitive";

export type TrainingStars = 0 | 1 | 2 | 3;

export type TrainingMechanicId =
  | "placeholder"
  | "simple-reaction"
  | "choice-reaction"
  | "sternberg"
  | "change-detection"
  | "classification"
  | "route-planning"
  | "flanker"
  | "stroop"
  | "schulte-grid"
  | "n-back"
  | "target-update"
  | "transitive-inference"
  | "analogical-reasoning"
  | "syllogistic-reasoning"
  | "mental-rotation"
  | "paper-fold"
  | "spatial-construction"
  | "spatial-orientation"
  | "hanoi"
  | "london"
  | "pvt"
  | "response-inhibition"
  | "adaptive-mix"
  | "challenge-mix";

export interface TrainingLevelDefinition {
  /** Stable id within world, e.g. "level-01" */
  id: string;
  /** 1-based index inside the world */
  order: number;
  /** Global stage number across all worlds (1–80) */
  globalStage: number;
  /** i18n key under training.levels.* or inline title for stubs */
  titleKey: string;
  /** Fallback English title until copy is finalized */
  titleFallback: string;
  mechanicId: TrainingMechanicId;
  /** Dimensions tagged for reward settlement */
  dimensions: CognitiveDimensionKey[];
  /** Mechanic params — filled when the real game is wired */
  params?: Record<string, unknown>;
  descriptionKey?: string;
  descriptionFallback?: string;
}

export interface TrainingWorldDefinition {
  id: string;
  order: number;
  themeKey: string;
  themeFallback: string;
  /** Inclusive global stage range */
  stageRange: { start: number; end: number };
  levels: TrainingLevelDefinition[];
}

export interface TrainingLevelProgress {
  bestStars: TrainingStars;
  attempts: number;
  /** Stars already settled into dimension rewards (best-so-far) */
  rewardedStars: TrainingStars;
}

export interface TrainingProgressState {
  /** worldId → levelId → progress */
  levels: Record<string, Record<string, TrainingLevelProgress>>;
  /** Local training dimension scores (separate from cognitive test until backend merge) */
  dimensionScores: Record<CognitiveDimensionKey, number>;
}
