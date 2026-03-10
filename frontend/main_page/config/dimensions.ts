/**
 * 六维认知维度配置
 */
import type { CognitiveDimensionKey } from "@/types/cognitive";

export interface DimensionConfig {
  key: CognitiveDimensionKey;
  /** i18n key，如 home.radar.memory */
  labelKey: string;
  /** 测试子项 i18n 前缀，如 test.memory */
  testPrefix: string;
}

export const DIMENSIONS: DimensionConfig[] = [
  { key: "memory", labelKey: "dimensions.memory", testPrefix: "memory" },
  { key: "logic", labelKey: "dimensions.logic", testPrefix: "logic" },
  { key: "focus", labelKey: "dimensions.focus", testPrefix: "focus" },
  { key: "reaction", labelKey: "dimensions.reaction", testPrefix: "reaction" },
  { key: "strategy", labelKey: "dimensions.strategy", testPrefix: "strategy" },
  { key: "spatial", labelKey: "dimensions.spatial", testPrefix: "spatial" },
];

export const DEFAULT_RADAR_SCORES: Record<CognitiveDimensionKey, number> = {
  memory: 0,
  logic: 0,
  focus: 0,
  reaction: 0,
  strategy: 0,
  spatial: 0,
};
