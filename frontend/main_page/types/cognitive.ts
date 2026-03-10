/**
 * 认知维度与测试相关类型
 * 六维：记忆力、逻辑推理、专注力、反应速度、战略规划、空间想象力
 */

export const COGNITIVE_DIMENSION_KEYS = [
  "memory",
  "logic",
  "focus",
  "reaction",
  "strategy",
  "spatial",
] as const;

export type CognitiveDimensionKey = (typeof COGNITIVE_DIMENSION_KEYS)[number];

/** 各维度分数 0–100 */
export type CognitiveScores = Record<CognitiveDimensionKey, number>;

/** 单次测试结果 */
export interface TestResult {
  dimension: CognitiveDimensionKey;
  score: number;
  /** 测试子类型，如 sequence_memory, pattern 等 */
  subType?: string;
}
