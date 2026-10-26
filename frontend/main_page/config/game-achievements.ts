import type { GameAchievementRules } from "@/types/gameAchievements";

/** Shared artwork is independent of each game's rules and progress. */
export const GAME_ACHIEVEMENT_GROUPS = [
  {
    key: "levels",
    icons: ["NoviceIcon", "ApprenticeIcon", "RisingStrategistIcon", "BoardExpertIcon", "MasterOfTheBoardIcon"],
  },
  {
    key: "topThree",
    icons: ["RankingBadge01BronzePng", "RankingBadge02SilverPng", "RankingBadge03GoldPng", "RankingBadge04BluePng", "RankingBadge05PinkPng"],
  },
  {
    key: "topTen",
    icons: ["RankingBadge01BronzePng1", "RankingBadge02SilverPng1", "RankingBadge03GoldPng1", "RankingBadge04BluePng1", "RankingBadge05PinkPng1"],
  },
  {
    key: "noHints",
    icons: ["SelfReliantIcon", "PuzzleSolverIcon", "TheIntellectualIcon", "TheStrategistIcon", "TheMastermindIcon"],
  },
] as const;

/** Only configured games show concrete conditions; never infer another game's rules. */
export const GAME_ACHIEVEMENT_RULES: Readonly<Partial<Record<string, GameAchievementRules>>> = {
  chessmater: {
    levels: { descriptionKey: "levels", targets: [10, 20, 30, 40, 50] },
    topThree: { descriptionKey: "topThree", targets: [10, 25, 50, 75, 100] },
    topTen: { descriptionKey: "topTen", targets: [10, 25, 50, 75, 100] },
    noHints: { descriptionKey: "noHints", targets: [5, 10, 15, 20, 30] },
  },
};
