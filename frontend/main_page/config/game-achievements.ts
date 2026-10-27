import type { GameAchievementRules } from "@/types/gameAchievements";

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

/** Only configured games show concrete conditions; never infer another game's rules. */
export const GAME_ACHIEVEMENT_RULES: Readonly<Partial<Record<string, GameAchievementRules>>> = {
  chessmater: {
    levels: { descriptionKey: "levels", targets: [10, 20, 30, 40, 50] },
    records: { descriptionKey: "records", targets: [1, 3, 5, 10, 20] },
    noHints: { descriptionKey: "noHints", targets: [1, 5, 10, 20, 30] },
    moves: { descriptionKey: "moves", targets: [50, 150, 500, 1500, 3000] },
  },
};
