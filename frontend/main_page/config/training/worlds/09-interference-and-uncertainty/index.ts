import { defineWorld } from "@/config/training/buildWorld";
import { interferenceAndUncertaintyLevels } from "./levels";

export const interferenceAndUncertaintyWorld = defineWorld({
  id: "interference-and-uncertainty",
  order: 9,
  themeKey: "interferenceAndUncertainty",
  themeFallback: "Interference and Uncertainty",
  stageCount: 6,
  globalStart: 55,
  levels: interferenceAndUncertaintyLevels,
});
