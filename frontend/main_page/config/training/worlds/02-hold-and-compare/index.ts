import { defineWorld } from "@/config/training/buildWorld";
import { holdAndCompareLevels } from "./levels";

export const holdAndCompareWorld = defineWorld({
  id: "hold-and-compare",
  order: 2,
  themeKey: "holdAndCompare",
  themeFallback: "Hold and Compare",
  stageCount: 7,
  globalStart: 7,
  levels: holdAndCompareLevels,
});
