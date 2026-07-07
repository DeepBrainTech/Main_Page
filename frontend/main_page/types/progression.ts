/**
 * Challenge mode progression types
 */

export const SUB_TEST_KEYS = [
  "memory_sternberg",
  "memory_change",
  "memory_nback",
  "logic_transitive",
  "logic_syllogism",
  "logic_analogy",
  "focus_flanker",
  "focus_stroop",
  "focus_schulte",
  "reaction_click",
  "reaction_arrow",
  "reaction_pvt",
  "strategy_hanoi",
  "strategy_london",
  "strategy_route",
  "spatial_rotation",
  "spatial_fold",
] as const;

export type SubTestKey = (typeof SUB_TEST_KEYS)[number];

export interface LevelProgress {
  sub_test_key: SubTestKey;
  level: number;
  best_score: number;
  stars: number;
  completed_count: number;
  last_completed_at: string | null;
}

export type LevelProgressMap = Record<string, Record<number, LevelProgress>>;

export interface DailyMission {
  subTestKey: SubTestKey;
  dimension: string;
  testIndex: number;
  level: number;
  estimatedMinutes: number;
  labelKey: string;
}
