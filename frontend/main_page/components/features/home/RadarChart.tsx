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
  const tHome = useTranslations("home");
  
  const labels = useMemo(
    () => COGNITIVE_DIMENSION_KEYS.map((key) => t(key)),
    [t]
  );
  const count = 6;
  const center = size / 2;
  const radius = center - 40; // 稍微留多点边距给文字

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
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col items-center h-full">
      <div className="w-full mb-2">
        <h3 className="font-bold text-gray-800 text-center" >{tHome("radarTitle")}</h3>
      </div>
      
      <div className="flex-1 flex items-center justify-center py-4">
        <svg width={size} height={size} className="overflow-visible">
          <defs>
              <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5E81AC" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#81A1C1" stopOpacity="0.1" />
              </linearGradient>
          </defs>
          
          {/* 背景网格 */}
          {[0.25, 0.5, 0.75, 1].map((scale) => (
            <polygon
              key={scale}
              points={polygonPoints(radius * scale)}
              fill={scale === 1 ? "#F8F9FB" : "none"}
              stroke="#E5E9F0"
              strokeWidth="1.5"
              strokeDasharray={scale === 1 ? "0" : "4 4"}
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
                stroke="#E5E9F0"
                strokeWidth="1.5"
              />
            );
          })}
          
          {/* 数据区域 */}
          <polygon
            points={dataPoints}
            fill="url(#radarGradient)"
            stroke="#5E81AC"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          
          {/* 顶点圆点 */}
          {COGNITIVE_DIMENSION_KEYS.map((key, i) => {
              const value = Math.min(100, Math.max(0, scores[key] ?? 0));
              const p = getPoint(i, (radius * value) / 100);
              return (
                  <circle 
                    key={i} 
                    cx={p.x} 
                    cy={p.y} 
                    r="3" 
                    fill="white" 
                    stroke="#5E81AC" 
                    strokeWidth="2" 
                  />
              )
          })}

          {/* 标签与分数 */}
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
                  className="fill-gray-600 text-[10px] font-medium tracking-wide"
                >
                  {labels[i]}
                </text>
                <text
                  x={p.x}
                  y={p.y + 7}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[#5E81AC] text-xs font-bold"
                >
                  {value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
