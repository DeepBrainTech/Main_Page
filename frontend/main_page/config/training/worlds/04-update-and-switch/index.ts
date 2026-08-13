import { defineWorld } from "@/config/training/buildWorld";
import { updateAndSwitchLevels } from "./levels";

export const updateAndSwitchWorld = defineWorld({
  id: "update-and-switch",
  order: 4,
  themeKey: "updateAndSwitch",
  themeFallback: "Update and Switch",
  stageCount: 7,
  globalStart: 21,
  levels: updateAndSwitchLevels,
});
