/** Levels, records, and noHints count distinct levels; moves counts cumulative legal moves. */
export type AchievementGroupKey = "levels" | "records" | "noHints" | "moves";
export type AchievementMetric = AchievementGroupKey | "classicClears" | "mathClears" | "classicStars" | "mathStars";

export interface AchievementLabels {
  descriptionKey: AchievementMetric;
  nameKey?: AchievementMetric;
}

export type GameAchievementLabels = Record<AchievementGroupKey, AchievementLabels>;
export type GameAchievementTargets = Record<AchievementGroupKey, readonly number[]>;

/** Progress must belong to the current game and authenticated user. */
export interface GameAchievementProgress {
  gameKey: string;
  targets: GameAchievementTargets;
  values: Partial<Record<AchievementMetric, number>>;
}
