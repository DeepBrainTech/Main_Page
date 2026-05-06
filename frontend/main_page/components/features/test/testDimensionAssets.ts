import type { CognitiveDimensionKey } from "@/types/cognitive";

/** 白色 SVG；反应速度使用 speed.svg */
export const TEST_DIMENSION_ICON_SRC: Record<CognitiveDimensionKey, string> = {
  memory: "/test/memory.svg",
  logic: "/test/logic.svg",
  focus: "/test/focus.svg",
  reaction: "/test/speed.svg",
  strategy: "/test/strategy.svg",
  spatial: "/test/spatial.svg",
};

/** 测试入口圆标底色（蓝 / 紫 / 绿 / 琥珀 / 红 / 橙） */
export const TEST_DIMENSION_RING: Record<CognitiveDimensionKey, string> = {
  memory: "#2563EB",
  spatial: "#7C3AED",
  strategy: "#22C55E",
  logic: "#EAB308",
  focus: "#DC2626",
  reaction: "#EA580C",
};
