import { defineWorld } from "@/config/training/buildWorld";
import { relationsAndRulesLevels } from "./levels";

export const relationsAndRulesWorld = defineWorld({
  id: "relations-and-rules",
  order: 5,
  themeKey: "relationsAndRules",
  themeFallback: "Relations and Rules",
  stageCount: 6,
  globalStart: 28,
  levels: relationsAndRulesLevels,
});
