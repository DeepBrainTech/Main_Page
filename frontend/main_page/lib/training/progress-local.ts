import { getPreviousLevel } from "@/config/training/catalog";
import { applyDimensionCap, pointsForStarUpgrade } from "@/config/training/rewards";
import { COGNITIVE_DIMENSION_KEYS, type CognitiveDimensionKey } from "@/types/cognitive";
import type {
  TrainingLevelDefinition,
  TrainingLevelProgress,
  TrainingProgressState,
  TrainingStars,
} from "@/types/training";

const STORAGE_KEY = "dbt.training.progress.v1";

function emptyScores(): Record<CognitiveDimensionKey, number> {
  return Object.fromEntries(COGNITIVE_DIMENSION_KEYS.map((k) => [k, 0])) as Record<
    CognitiveDimensionKey,
    number
  >;
}

export function createEmptyTrainingProgress(): TrainingProgressState {
  return { levels: {}, dimensionScores: emptyScores() };
}

export function loadTrainingProgress(): TrainingProgressState {
  if (typeof window === "undefined") return createEmptyTrainingProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyTrainingProgress();
    const parsed = JSON.parse(raw) as TrainingProgressState;
    return {
      levels: parsed.levels ?? {},
      dimensionScores: { ...emptyScores(), ...parsed.dimensionScores },
    };
  } catch {
    return createEmptyTrainingProgress();
  }
}

export function saveTrainingProgress(state: TrainingProgressState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getLevelProgress(
  state: TrainingProgressState,
  worldId: string,
  levelId: string,
): TrainingLevelProgress {
  return state.levels[worldId]?.[levelId] ?? { bestStars: 0, attempts: 0, rewardedStars: 0 };
}

/** Strict linear unlock across the full 80-stage path. */
export function isLevelUnlocked(
  state: TrainingProgressState,
  worldId: string,
  levelId: string,
): boolean {
  const prev = getPreviousLevel(worldId, levelId);
  if (!prev) return true;
  const prevProgress = getLevelProgress(state, prev.worldId, prev.levelId);
  return prevProgress.bestStars >= 1;
}

/**
 * Record an attempt. Raises bestStars; grants dimension points only when
 * best stars increase into a reward tier (currently 3★ → +1 per tagged dim).
 */
export function recordLevelAttempt(
  state: TrainingProgressState,
  worldId: string,
  level: TrainingLevelDefinition,
  stars: TrainingStars,
): TrainingProgressState {
  const prev = getLevelProgress(state, worldId, level.id);
  const newBest = Math.max(prev.bestStars, stars) as TrainingStars;
  const deltaPoints = pointsForStarUpgrade(prev.rewardedStars, newBest);

  const dimensionScores = { ...state.dimensionScores };
  if (deltaPoints > 0) {
    for (const dim of level.dimensions) {
      dimensionScores[dim] = applyDimensionCap(dimensionScores[dim] + deltaPoints);
    }
  }

  return {
    dimensionScores,
    levels: {
      ...state.levels,
      [worldId]: {
        ...state.levels[worldId],
        [level.id]: {
          bestStars: newBest,
          attempts: prev.attempts + 1,
          rewardedStars: deltaPoints > 0 ? newBest : prev.rewardedStars,
        },
      },
    },
  };
}
