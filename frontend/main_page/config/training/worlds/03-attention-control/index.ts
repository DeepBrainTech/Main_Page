import { defineWorld } from "@/config/training/buildWorld";
import { attentionControlLevels } from "./levels";

export const attentionControlWorld = defineWorld({
  id: "attention-control",
  order: 3,
  themeKey: "attentionControl",
  themeFallback: "Attention Control",
  stageCount: 7,
  globalStart: 14,
  levels: attentionControlLevels,
});
