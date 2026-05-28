"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import RadarChart from "@/components/features/dashboard/RadarChart";
import { dashboardCardClass } from "@/components/features/dashboard/dashboardCardStyles";

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
      className={`${dashboardCardClass} w-full self-start p-[clamp(1.25rem,2.2vw,2rem)]`}
    >
      <h3 className="mb-[clamp(1rem,2vw,1.5rem)] font-['Titan_One'] text-[clamp(1.25rem,2vw,1.5rem)] font-normal leading-8 tracking-wide text-sky-700">
        {tHome("brainpowerChart")}
      </h3>

      <div className="mx-auto w-full max-w-[min(20rem,42svh,100%)]">
        <RadarChart scores={scores} embedded />
      </div>

      <div className="mt-[clamp(0.35rem,0.9vw,0.6rem)] grid grid-cols-1 gap-[clamp(0.4rem,0.9vw,0.75rem)] sm:grid-cols-2">
        {scoreItems.map((item) => (
          <div key={item.key} className="rounded-2xl bg-[#EDF4FC] px-[clamp(0.5rem,1vw,0.75rem)] py-[clamp(0.35rem,0.8vw,0.55rem)]">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-app-body text-base font-semibold text-sky-700">{item.label}</span>
              <span className="font-app-body text-lg font-medium leading-7 text-red-500">{item.value}</span>
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
        <div className="font-app-body text-base font-medium text-sky-700">{tHome("overallBrainScore")}</div>
        <div className="mt-1 font-['Titan_One'] text-4xl font-normal leading-10 text-sky-700">{overallScore}</div>
        <div className="mt-1 font-app-body text-sm font-normal leading-5 text-sky-700">{tHome("keepTraining")}</div>
      </div>
    </section>
  );
}
