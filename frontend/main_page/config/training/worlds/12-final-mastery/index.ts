import { defineWorld } from "@/config/training/buildWorld";
import { finalMasteryLevels } from "./levels";

export const finalMasteryWorld = defineWorld({
  id: "final-mastery",
  order: 12,
  themeKey: "finalMastery",
  themeFallback: "Final Mastery",
  stageCount: 6,
  globalStart: 75,
  levels: finalMasteryLevels,
});
