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

/**
 * Six-dimension radar chart (pure SVG)
 */
export default function RadarChart({ scores, size = 220, embedded = false }: RadarChartProps) {
  const tDimension = useTranslations("dimensions");
  const tHome = useTranslations("dashboard");

  const labels = useMemo(
    () => COGNITIVE_DIMENSION_KEYS.map((key) => tDimension(key)),
    [tDimension]
  );

  const count = 6;
  const center = size / 2;
  const radius = center - 40;

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
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#fb7185" stopOpacity="0.16" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={polygonPoints(radius * scale)}
            fill={scale === 1 ? "#f8fafc" : "none"}
            stroke="#bfdbfe"
            strokeWidth="1.2"
            strokeDasharray={scale === 1 ? "0" : "4 4"}
          />
        ))}

        {Array.from({ length: count }, (_, i) => {
          const p = getPoint(i, radius);
          return (
            <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#dbeafe" strokeWidth="1.2" />
          );
        })}

        <polygon
          points={dataPoints}
          fill="url(#radarGradient)"
          stroke="#ef4444"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {COGNITIVE_DIMENSION_KEYS.map((key, i) => {
          const value = Math.min(100, Math.max(0, scores[key] ?? 0));
          const p = getPoint(i, (radius * value) / 100);
          return <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke="#ef4444" strokeWidth="1.8" />;
        })}

        {Array.from({ length: count }, (_, i) => {
          const p = getPoint(i, radius + 24);
          const value = Math.min(100, Math.max(0, scores[COGNITIVE_DIMENSION_KEYS[i]] ?? 0));
          return (
            <g key={i}>
              <text
                x={p.x}
                y={p.y - 7}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-sky-700 text-[10px] font-semibold tracking-wide"
              >
                {labels[i]}
              </text>
              <text
                x={p.x}
                y={p.y + 7}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-rose-500 text-xs font-bold"
              >
                {value}
              </text>
            </g>
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
