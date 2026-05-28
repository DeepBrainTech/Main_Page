"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import { COGNITIVE_DIMENSION_KEYS } from "@/types/cognitive";

interface RadarChartProps {
  /** Scores by cognitive dimension, range 0-100 */
  scores: Record<CognitiveDimensionKey, number>;
  size?: number;
  /** Embedded mode: render chart body only without card shell */
  embedded?: boolean;
}

const GRID_LEVELS = [0, 25, 50, 75, 100] as const;
const CHART_LINE_COLOR = "#D4EAF8";
const DATA_STROKE_COLOR = "#E45C44";
const DATA_FILL_COLOR = "#E45C4466";

/**
 * Six-dimension radar chart (pure SVG) with layered hexagonal grid rings
 */
export default function RadarChart({ scores, size = 320, embedded = false }: RadarChartProps) {
  const tDimension = useTranslations("dimensions");
  const tHome = useTranslations("dashboard");
  const labels = useMemo(
    () => COGNITIVE_DIMENSION_KEYS.map((key) => tDimension(key)),
    [tDimension]
  );

  const count = 6;
  const center = size / 2;
  const radius = center - 52;
  const labelOffset = 22;

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

  const dataPoints = COGNITIVE_DIMENSION_KEYS.map((key, i) => {
    const value = Math.min(100, Math.max(0, scores[key] ?? 0));
    const p = getPoint(i, (radius * value) / 100);
    return `${p.x},${p.y}`;
  }).join(" ");

  const chartNode = (
    <div className="flex items-center justify-center py-[clamp(0.2rem,0.7vw,0.5rem)]">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-full overflow-visible">
        {/* Concentric hexagon grid lines */}
        {GRID_LEVELS.map((level) => {
          if (level === 0) return null;
          const scale = level / 100;
          return (
            <polygon
              key={level}
              points={polygonPoints(radius * scale)}
              fill="none"
              stroke={CHART_LINE_COLOR}
              strokeWidth={level === 100 ? 1.4 : 1}
            />
          );
        })}

        {/* Radial axes */}
        {Array.from({ length: count }, (_, i) => {
          const p = getPoint(i, radius);
          return (
            <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke={CHART_LINE_COLOR} strokeWidth="1" />
          );
        })}

        {/* Scale labels — below data fill so covered ticks appear occluded */}
        {GRID_LEVELS.map((level) => {
          const p = getPoint(0, (radius * level) / 100);
          return (
            <text
              key={`scale-${level}`}
              x={p.x}
              y={p.y}
              textAnchor="start"
              dominantBaseline="middle"
              className="fill-current font-app-body text-[10px] font-normal text-sky-700"
            >
              {level}
            </text>
          );
        })}

        {/* Data polygon (fill + stroke on top of scale ticks) */}
        <polygon
          points={dataPoints}
          fill={DATA_FILL_COLOR}
          stroke={DATA_STROKE_COLOR}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Dimension labels */}
        {Array.from({ length: count }, (_, i) => {
          const p = getPoint(i, radius + labelOffset);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-current font-app-body text-sm font-bold text-sky-700"
            >
              {labels[i]}
            </text>
          );
        })}
      </svg>
    </div>
  );

  if (embedded) return chartNode;

  return (
    <div className="flex flex-col items-center rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-2 w-full">
        <h3 className="text-center font-bold text-gray-800">{tHome("radarTitle")}</h3>
      </div>
      {chartNode}
    </div>
  );
}
