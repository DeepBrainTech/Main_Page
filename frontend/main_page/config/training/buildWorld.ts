import type { CognitiveDimensionKey } from "@/types/cognitive";
import type {
  TrainingLevelDefinition,
  TrainingMechanicId,
  TrainingWorldDefinition,
} from "@/types/training";

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Build placeholder levels for worlds whose stage content is not designed yet. */
export function buildStubLevels(options: {
  stageCount: number;
  globalStart: number;
  dimensions?: CognitiveDimensionKey[];
}): TrainingLevelDefinition[] {
  const { stageCount, globalStart, dimensions = [] } = options;
  return Array.from({ length: stageCount }, (_, i) => {
    const order = i + 1;
    const globalStage = globalStart + i;
    const isChallenge = order === stageCount;
    return {
      id: `level-${pad2(order)}`,
      order,
      globalStage,
      titleKey: `stubLevel`,
      titleFallback: isChallenge ? `Stage ${globalStage} · Challenge` : `Stage ${globalStage}`,
      mechanicId: (isChallenge ? "challenge-mix" : "placeholder") as TrainingMechanicId,
      dimensions: isChallenge
        ? (["memory", "logic", "focus", "reaction", "strategy", "spatial"] as CognitiveDimensionKey[])
        : dimensions,
      descriptionFallback: "Level content coming soon.",
    };
  });
}

export function defineWorld(options: {
  id: string;
  order: number;
  themeKey: string;
  themeFallback: string;
  stageCount: number;
  globalStart: number;
  levels?: TrainingLevelDefinition[];
}): TrainingWorldDefinition {
  const { id, order, themeKey, themeFallback, stageCount, globalStart, levels } = options;
  const resolved =
    levels ??
    buildStubLevels({
      stageCount,
      globalStart,
    });
  return {
    id,
    order,
    themeKey,
    themeFallback,
    stageRange: { start: globalStart, end: globalStart + stageCount - 1 },
    levels: resolved,
  };
}
