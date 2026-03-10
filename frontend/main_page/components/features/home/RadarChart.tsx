"use client";

import { useMemo } from "react";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import { COGNITIVE_DIMENSION_KEYS } from "@/types/cognitive";
import { useTranslations } from "next-intl";

interface RadarChartProps {
  /** 各维度分数 0–100 */
  scores: Record<CognitiveDimensionKey, number>;
  size?: number;
}

/**
 * 六维雷达图（纯 SVG）
 */
export default function RadarChart({ scores, size = 220 }: RadarChartProps) {
  const t = useTranslations("dimensions");
  const labels = useMemo(
    () => COGNITIVE_DIMENSION_KEYS.map((key) => t(key)),
    [t]
  );
  const count = 6;
  const center = size / 2;
  const radius = center - 36;

  const getPoint = (i: number, r: number) => {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygonPoints = (r: number) =>
    Array.from({ length: count }, (_, i) => getPoint(i, r))
      .map((p) => `${p.x},${p.y}`)
      .join(" ");

  /** 每个维度用各自分数画顶点，形成六维雷达 */
  const dataPoints = COGNITIVE_DIMENSION_KEYS.map((key, i) => {
    const value = Math.min(100, Math.max(0, scores[key] ?? 0));
    const p = getPoint(i, (radius * value) / 100);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* 背景网格 */}
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={polygonPoints(radius * scale)}
            fill="none"
            stroke="rgba(94,129,172,0.25)"
            strokeWidth="1"
          />
        ))}
        {/* 轴线 */}
        {Array.from({ length: count }, (_, i) => {
          const p = getPoint(i, radius);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="rgba(94,129,172,0.4)"
              strokeWidth="1"
            />
          );
        })}
        {/* 数据区域 */}
        <polygon
          points={dataPoints}
          fill="rgba(94,129,172,0.35)"
          stroke="rgb(94,129,172)"
          strokeWidth="2"
        />
        {/* 标签与分数 */}
        {Array.from({ length: count }, (_, i) => {
          const p = getPoint(i, radius + 22);
          const value = Math.min(100, Math.max(0, scores[COGNITIVE_DIMENSION_KEYS[i]] ?? 0));
          return (
            <g key={i}>
              <text
                x={p.x}
                y={p.y - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-700 text-xs font-medium"
              >
                {labels[i]}
              </text>
              <text
                x={p.x}
                y={p.y + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[#5E81AC] text-sm font-semibold"
              >
                {value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
