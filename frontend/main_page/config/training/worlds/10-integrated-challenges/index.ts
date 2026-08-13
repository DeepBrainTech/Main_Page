import { defineWorld } from "@/config/training/buildWorld";
import { integratedChallengesLevels } from "./levels";

export const integratedChallengesWorld = defineWorld({
  id: "integrated-challenges",
  order: 10,
  themeKey: "integratedChallenges",
  themeFallback: "Integrated Challenges",
  stageCount: 7,
  globalStart: 61,
  levels: integratedChallengesLevels,
});
