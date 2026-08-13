import { defineWorld } from "@/config/training/buildWorld";
import { transformAndReconstructLevels } from "./levels";

export const transformAndReconstructWorld = defineWorld({
  id: "transform-and-reconstruct",
  order: 6,
  themeKey: "transformAndReconstruct",
  themeFallback: "Transform and Reconstruct",
  stageCount: 7,
  globalStart: 34,
  levels: transformAndReconstructLevels,
});
