"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import RadarChart from "@/components/features/dashboard/RadarChart";

interface BrainpowerPanelProps {
  scores: Record<CognitiveDimensionKey, number>;
}

/**
 * Right brainpower panel: radar chart + progress bars + overall score
 */
export default function BrainpowerPanel({ scores }: BrainpowerPanelProps) {
  const tHome = useTranslations("dashboard");
  const tDimension = useTranslations("dimensions");

  const scoreItems = useMemo(
    () =>
      ([
        "memory",
        "logic",
        "spatial",
        "focus",
        "strategy",
        "reaction",
      ] as CognitiveDimensionKey[]).map((key) => ({
        key,
        label: tDimension(key),
        value: Math.min(100, Math.max(0, scores[key] ?? 0)),
      })),
    [scores, tDimension]
  );

  const overallScore = Math.round(
    scoreItems.reduce((sum, item) => sum + item.value, 0) / Math.max(1, scoreItems.length)
  );

  return (
    <section className="h-full rounded-3xl border border-white/70 bg-white/65 p-5 shadow-lg backdrop-blur">
      <h3 className="mb-2 text-2xl font-extrabold text-sky-800">{tHome("brainpowerChart")}</h3>

      <RadarChart scores={scores} size={260} embedded />

      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {scoreItems.map((item) => (
          <div key={item.key} className="rounded-2xl bg-indigo-50/70 px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-semibold text-sky-700">{item.label}</span>
              <span className="font-bold text-rose-500">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-white">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#0078D4] to-[#0068BD]"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-3xl bg-gradient-to-r from-blue-100 via-blue-100 to-indigo-50 px-6 py-5 text-center">
        <div className="text-sm font-semibold text-sky-700">{tHome("overallBrainScore")}</div>
        <div className="mt-1 text-4xl font-extrabold text-sky-800">{overallScore}</div>
        <div className="mt-1 text-xs text-sky-600">{tHome("keepTraining")}</div>
      </div>
    </section>
  );
}
