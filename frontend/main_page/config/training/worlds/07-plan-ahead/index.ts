import { defineWorld } from "@/config/training/buildWorld";
import { planAheadLevels } from "./levels";

export const planAheadWorld = defineWorld({
  id: "plan-ahead",
  order: 7,
  themeKey: "planAhead",
  themeFallback: "Plan Ahead",
  stageCount: 7,
  globalStart: 41,
  levels: planAheadLevels,
});
