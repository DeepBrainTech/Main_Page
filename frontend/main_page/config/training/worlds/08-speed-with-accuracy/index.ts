import { defineWorld } from "@/config/training/buildWorld";
import { speedWithAccuracyLevels } from "./levels";

export const speedWithAccuracyWorld = defineWorld({
  id: "speed-with-accuracy",
  order: 8,
  themeKey: "speedWithAccuracy",
  themeFallback: "Speed with Accuracy",
  stageCount: 7,
  globalStart: 48,
  levels: speedWithAccuracyLevels,
});
