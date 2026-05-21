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
    <section
      data-brainpower-panel
      className="w-full self-start rounded-[clamp(1.2rem,2vw,1.8rem)] border border-white/70 bg-white/65 p-[clamp(0.9rem,1.6vw,1.25rem)] shadow-lg backdrop-blur"
    >
      <h3 className="mb-[clamp(0.35rem,0.9vw,0.6rem)] text-[clamp(1.05rem,1.6vw,1.5rem)] font-extrabold text-sky-800">
        {tHome("brainpowerChart")}
      </h3>

      <div className="mx-auto w-full max-w-[clamp(15rem,32vw,21rem)]">
        <RadarChart scores={scores} size={320} embedded />
      </div>

      <div className="mt-[clamp(0.35rem,0.9vw,0.6rem)] grid grid-cols-1 gap-[clamp(0.4rem,0.9vw,0.75rem)] sm:grid-cols-2">
        {scoreItems.map((item) => (
          <div key={item.key} className="rounded-2xl bg-indigo-50/70 px-[clamp(0.5rem,1vw,0.75rem)] py-[clamp(0.35rem,0.8vw,0.55rem)]">
            <div className="mb-1 flex items-center justify-between text-[clamp(0.7rem,0.9vw,0.88rem)]">
              <span className="font-semibold text-sky-700">{item.label}</span>
              <span className="font-bold text-rose-500">{item.value}</span>
            </div>
            <div className="h-[clamp(0.35rem,0.65vw,0.5rem)] rounded-full bg-white">
              <div
                className="h-[clamp(0.35rem,0.65vw,0.5rem)] rounded-full bg-gradient-to-r from-[#0078D4] to-[#0068BD]"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-[clamp(0.6rem,1.2vw,1rem)] rounded-3xl bg-gradient-to-r from-blue-100 via-blue-100 to-indigo-50 px-[clamp(0.8rem,1.4vw,1.5rem)] py-[clamp(0.7rem,1.3vw,1.1rem)] text-center">
        <div className="text-[clamp(0.7rem,0.9vw,0.9rem)] font-semibold text-sky-700">{tHome("overallBrainScore")}</div>
        <div className="mt-1 text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold text-sky-800">{overallScore}</div>
        <div className="mt-1 text-[clamp(0.62rem,0.8vw,0.76rem)] text-sky-600">{tHome("keepTraining")}</div>
      </div>
    </section>
  );
}
