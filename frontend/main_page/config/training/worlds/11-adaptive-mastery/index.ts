import { defineWorld } from "@/config/training/buildWorld";
import { adaptiveMasteryLevels } from "./levels";

export const adaptiveMasteryWorld = defineWorld({
  id: "adaptive-mastery",
  order: 11,
  themeKey: "adaptiveMastery",
  themeFallback: "Adaptive Mastery",
  stageCount: 7,
  globalStart: 68,
  levels: adaptiveMasteryLevels,
});
