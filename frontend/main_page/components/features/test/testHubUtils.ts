import type { CognitiveDimensionKey } from "@/types/cognitive";

/** 与 Figma 测试入口网格一致：上排 memory / spatial / strategy，下排 logic / focus / reaction */
export const TEST_HUB_GRID_ORDER: CognitiveDimensionKey[] = [
  "memory",
  "spatial",
  "strategy",
  "logic",
  "focus",
  "reaction",
];

export function getTestSectionCount(dimension: CognitiveDimensionKey): number {
  return dimension === "spatial" ? 2 : 3;
}

/** 弹窗预计用时：与各维度无关，统一展示约 5 分钟 */
export function getTestEstimateMinutes(_dimension: CognitiveDimensionKey): number {
  return 5;
}
