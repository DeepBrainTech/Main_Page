import { defineWorld } from "@/config/training/buildWorld";
import { foundationsLevels } from "./levels";

export const foundationsWorld = defineWorld({
  id: "foundations",
  order: 1,
  themeKey: "foundations",
  themeFallback: "Foundations",
  stageCount: 6,
  globalStart: 1,
  levels: foundationsLevels,
});
