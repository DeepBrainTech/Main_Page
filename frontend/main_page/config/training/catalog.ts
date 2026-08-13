import type { TrainingLevelDefinition, TrainingWorldDefinition } from "@/types/training";
import { foundationsWorld } from "./worlds/01-foundations";
import { holdAndCompareWorld } from "./worlds/02-hold-and-compare";
import { attentionControlWorld } from "./worlds/03-attention-control";
import { updateAndSwitchWorld } from "./worlds/04-update-and-switch";
import { relationsAndRulesWorld } from "./worlds/05-relations-and-rules";
import { transformAndReconstructWorld } from "./worlds/06-transform-and-reconstruct";
import { planAheadWorld } from "./worlds/07-plan-ahead";
import { speedWithAccuracyWorld } from "./worlds/08-speed-with-accuracy";
import { interferenceAndUncertaintyWorld } from "./worlds/09-interference-and-uncertainty";
import { integratedChallengesWorld } from "./worlds/10-integrated-challenges";
import { adaptiveMasteryWorld } from "./worlds/11-adaptive-mastery";
import { finalMasteryWorld } from "./worlds/12-final-mastery";

/** Canonical 12-world training catalog (80 stages total). */
export const TRAINING_WORLDS: TrainingWorldDefinition[] = [
  foundationsWorld,
  holdAndCompareWorld,
  attentionControlWorld,
  updateAndSwitchWorld,
  relationsAndRulesWorld,
  transformAndReconstructWorld,
  planAheadWorld,
  speedWithAccuracyWorld,
  interferenceAndUncertaintyWorld,
  integratedChallengesWorld,
  adaptiveMasteryWorld,
  finalMasteryWorld,
];

export const TRAINING_TOTAL_STAGES = TRAINING_WORLDS.reduce((sum, w) => sum + w.levels.length, 0);

export function findTrainingWorld(worldId: string): TrainingWorldDefinition | undefined {
  return TRAINING_WORLDS.find((w) => w.id === worldId);
}

export function findTrainingLevel(
  worldId: string,
  levelId: string,
): { world: TrainingWorldDefinition; level: TrainingLevelDefinition } | undefined {
  const world = findTrainingWorld(worldId);
  if (!world) return undefined;
  const level = world.levels.find((l) => l.id === levelId);
  if (!level) return undefined;
  return { world, level };
}

export function getPreviousLevel(
  worldId: string,
  levelId: string,
): { worldId: string; levelId: string } | null {
  const worldIndex = TRAINING_WORLDS.findIndex((w) => w.id === worldId);
  if (worldIndex < 0) return null;
  const world = TRAINING_WORLDS[worldIndex];
  const levelIndex = world.levels.findIndex((l) => l.id === levelId);
  if (levelIndex < 0) return null;
  if (levelIndex > 0) {
    return { worldId: world.id, levelId: world.levels[levelIndex - 1].id };
  }
  if (worldIndex === 0) return null;
  const prevWorld = TRAINING_WORLDS[worldIndex - 1];
  return {
    worldId: prevWorld.id,
    levelId: prevWorld.levels[prevWorld.levels.length - 1].id,
  };
}
