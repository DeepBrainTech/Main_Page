export type AchievementGroupKey = "levels" | "topThree" | "topTen" | "noHints";

export interface AchievementRule {
  descriptionKey: AchievementGroupKey;
  targets: readonly [number, number, number, number, number];
}

export type GameAchievementRules = Partial<Record<AchievementGroupKey, AchievementRule>>;

/** Progress must belong to the current game and authenticated user. */
export interface GameAchievementProgress {
  gameKey: string;
  values: Partial<Record<AchievementGroupKey, number>>;
}
