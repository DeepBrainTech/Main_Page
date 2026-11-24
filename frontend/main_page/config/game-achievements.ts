import type { AchievementGroupKey, GameAchievementLabels } from "@/types/gameAchievements";

/** Shared artwork is independent of each game's rules and progress. */
export const GAME_ACHIEVEMENT_GROUPS = [
  {
    key: "levels",
    icons: ["NoviceIcon", "ApprenticeIcon", "RisingStrategistIcon", "BoardExpertIcon", "MasterOfTheBoardIcon"],
  },
  {
    key: "records",
    icons: ["RankingBadge01BronzePng", "RankingBadge02SilverPng", "RankingBadge03GoldPng", "RankingBadge04BluePng", "RankingBadge05PinkPng"],
  },
  {
    key: "noHints",
    icons: ["SelfReliantIcon", "PuzzleSolverIcon", "TheIntellectualIcon", "TheStrategistIcon", "TheMastermindIcon"],
  },
  {
    key: "moves",
    icons: ["RankingBadge01BronzePng1", "RankingBadge02SilverPng1", "RankingBadge03GoldPng1", "RankingBadge04BluePng1", "RankingBadge05PinkPng1"],
  },
] as const;

/** The achievement API supplies targets. These keys select the labels for each game's badges. */
export const GAME_ACHIEVEMENT_LABELS: Readonly<Partial<Record<string, GameAchievementLabels>>> = {
  "chess-tourmaster": {
    levels: { nameKey: "levels", descriptionKey: "classicClears" },
    records: { descriptionKey: "mathClears" },
    noHints: { descriptionKey: "classicStars" },
    moves: { descriptionKey: "mathStars" },
  },
  chessmater: {
    levels: { descriptionKey: "levels" },
    records: { descriptionKey: "records" },
    noHints: { descriptionKey: "noHints" },
    moves: { descriptionKey: "moves" },
  },
};

export function getAchievementNameKey(gameKey: string, groupKey: AchievementGroupKey) {
  const labels = GAME_ACHIEVEMENT_LABELS[gameKey]?.[groupKey];
  return labels?.nameKey ?? labels?.descriptionKey;
}
