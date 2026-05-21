"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import { DEFAULT_RADAR_SCORES } from "@/config/dimensions";
import { updateCognitiveScores } from "@/services/userApi";
import RadarChart from "@/components/features/dashboard/RadarChart";
import { TestChromeProvider, TestRunnerShell } from "./test-ui";
import MemoryNBack from "./memory/MemoryNBack";
import ChangeDetection from "./memory/ChangeDetection";
import SternbergMemoryScanning from "./memory/SternbergMemoryScanning";
import TransitiveInference from "./logic/Transitive_Inference";
import SyllogisticReasoning from "./logic/SyllogisticReasoning";
import AnalogicalReasoning from "./logic/AnalogicalReasoning";
import FlankerTask from "./focus/FlankerTask";
import StroopColor from "./focus/StroopColor";
import SchulteGrid from "./focus/SchulteGrid";
import ReactionClick from "./reaction/ReactionClick";
import ReactionArrowKey from "./reaction/ReactionArrowKey";
import ReactionPVT from "./reaction/ReactionPVT";
import HanoiPlanning from "./strategy/HanoiPlanning";
import LondonPlanning from "./strategy/LondonPlanning";
import RoutePlanning from "./strategy/RoutePlanning";
import ShapeRotation from "./spatial/ShapeRotation";
import PaperFold from "./spatial/PaperFold";

interface TestRunnerProps {
  dimension: CognitiveDimensionKey;
  onBack: () => void;
  dateOfBirth?: string | null;
}

interface CompletedRecord {
  testIndex: number;
  score: number;
}

function formatTopPercent(
  percentile: number,
  formatter: (key: string, values?: Record<string, string | number>) => string
) {
  const p = Math.round(Math.max(0, Math.min(100, percentile)));
  const top = Math.max(0, 100 - p);
  if (top <= 0) return formatter("statsTopPercentBest");
  return formatter("statsTopPercentFormat", { value: top });
}

export default function TestRunner({ dimension, onBack, dateOfBirth }: TestRunnerProps) {
  const t = useTranslations("test");
  const tCommon = useTranslations("common");
  const tDim = useTranslations("dimensions");
  const [testIndex, setTestIndex] = useState(0);
  const [records, setRecords] = useState<CompletedRecord[]>([]);
  const [done, setDone] = useState(false);
  const [radarScores, setRadarScores] = useState(DEFAULT_RADAR_SCORES);
  const [showAgePercentile, setShowAgePercentile] = useState(false);

  const testLabels =
    dimension === "memory"
      ? [t("memory.sternbergTitle"), t("memory.cdTitle"), t("memory.nBackTitle")]
      : dimension === "logic"
        ? [t("logic.patternTitle"), t("logic.syllogismTitle"), t("logic.analogyTitle")]
        : dimension === "focus"
          ? [t("focus.flankerTitle"), t("focus.stroopTitle"), t("focus.schulteTitle")]
          : dimension === "reaction"
            ? [t("reaction.title"), t("reaction.arrowTitle"), t("reaction.pvtTitle")]
            : dimension === "strategy"
              ? [t("strategy.hanoiTitle"), t("strategy.londonTitle"), t("strategy.routeTitle")]
              : dimension === "spatial"
                ? [t("spatial.title"), "Paper Folding"]
                : [];

  const testCount =
    dimension === "spatial"
      ? 2
      : dimension === "memory" ||
          dimension === "logic" ||
          dimension === "focus" ||
          dimension === "reaction" ||
          dimension === "strategy"
        ? 3
        : 1;

  const finishWithRecords = useCallback(
    async (nextRecords: CompletedRecord[]) => {
      if (nextRecords.length > 0) {
        const avg =
          nextRecords.reduce((sum, item) => sum + item.score, 0) / nextRecords.length;
        try {
          const updated = await updateCognitiveScores({ [dimension]: Math.round(avg) });
          setRadarScores({
            memory: updated.memory ?? 0,
            logic: updated.logic ?? 0,
            focus: updated.focus ?? 0,
            reaction: updated.reaction ?? 0,
            strategy: updated.strategy ?? 0,
            spatial: updated.spatial ?? 0,
          });
        } catch {
          setRadarScores((prev) => ({ ...prev, [dimension]: Math.round(avg) }));
        }
      }
      setDone(true);
    },
    [dimension]
  );

  const handleComplete = useCallback(
    async (score: number) => {
      const nextRecords = [...records, { testIndex, score }];
      setRecords(nextRecords);
      if (testIndex + 1 >= testCount) {
        await finishWithRecords(nextRecords);
      } else {
        setTestIndex((i) => i + 1);
      }
    },
    [finishWithRecords, records, testIndex, testCount]
  );

  const handleSkipSession = useCallback(async () => {
    if (testIndex + 1 >= testCount) {
      await finishWithRecords(records);
    } else {
      setTestIndex((i) => i + 1);
    }
  }, [finishWithRecords, records, testIndex, testCount]);

  const TestRender =
    dimension === "memory" && testIndex === 0
      ? () => <SternbergMemoryScanning onComplete={handleComplete} dateOfBirth={dateOfBirth} />
      : dimension === "memory" && testIndex === 1
        ? () => <ChangeDetection onComplete={handleComplete} dateOfBirth={dateOfBirth} />
        : dimension === "memory" && testIndex === 2
          ? () => <MemoryNBack onComplete={handleComplete} dateOfBirth={dateOfBirth} />
          : dimension === "logic" && testIndex === 0
            ? () => <TransitiveInference onComplete={handleComplete} dateOfBirth={dateOfBirth} />
            : dimension === "logic" && testIndex === 1
              ? () => <SyllogisticReasoning onComplete={handleComplete} dateOfBirth={dateOfBirth} />
              : dimension === "logic" && testIndex === 2
                ? () => <AnalogicalReasoning onComplete={handleComplete} />
                : dimension === "focus" && testIndex === 0
                  ? () => <FlankerTask onComplete={handleComplete} dateOfBirth={dateOfBirth} />
                  : dimension === "focus" && testIndex === 1
                    ? () => <StroopColor onComplete={handleComplete} dateOfBirth={dateOfBirth} />
                    : dimension === "focus" && testIndex === 2
                      ? () => <SchulteGrid onComplete={handleComplete} />
                      : dimension === "reaction" && testIndex === 0
                        ? () => <ReactionClick onComplete={handleComplete} dateOfBirth={dateOfBirth} />
                        : dimension === "reaction" && testIndex === 1
                          ? () => (
                              <ReactionArrowKey onComplete={handleComplete} dateOfBirth={dateOfBirth} />
                            )
                          : dimension === "reaction" && testIndex === 2
                            ? () => <ReactionPVT onComplete={handleComplete} dateOfBirth={dateOfBirth} />
                            : dimension === "strategy"
                              ? testIndex === 0
                                ? () => <HanoiPlanning onComplete={handleComplete} dateOfBirth={dateOfBirth} />
                                : testIndex === 1
                                  ? () => (
                                      <LondonPlanning onComplete={handleComplete} dateOfBirth={dateOfBirth} />
                                    )
                                  : () => <RoutePlanning onComplete={handleComplete} dateOfBirth={dateOfBirth} />
                              : dimension === "spatial"
                                ? testIndex === 0
                                  ? () => <ShapeRotation onComplete={handleComplete} />
                                  : () => <PaperFold onComplete={handleComplete} />
                                : () => null;

  if (done) {
    const avg =
      records.length > 0
        ? Math.round(records.reduce((sum, item) => sum + item.score, 0) / records.length)
        : 0;

    return (
      <div className="w-full min-w-0 space-y-6 font-app-body">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-[#1565C0] hover:underline"
        >
          ← {tCommon("back")}
        </button>
        <RadarChart scores={radarScores} />
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <h4 className="mb-3 text-sm font-semibold text-[#003366]">{t("dimensionStatsTitle")}</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-3 font-medium">{t("statsColIndex")}</th>
                  <th className="py-2 pr-3 font-medium">{t("statsColTest")}</th>
                  <th className="py-2 pr-3 font-medium">{t("statsColScore")}</th>
                  <th className="py-2 font-medium">
                    <div className="inline-flex items-center gap-2">
                      <span>{t("statsColPeerPercentile")}</span>
                      {!showAgePercentile && (
                        <button
                          type="button"
                          onClick={() => setShowAgePercentile(true)}
                          className="rounded border border-slate-300 px-1.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          {t("statsViewAction")}
                        </button>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((item, idx) => (
                  <tr
                    key={`${idx}-${item.testIndex}-${item.score}`}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="py-2 pr-3 text-slate-600">{idx + 1}</td>
                    <td className="py-2 pr-3 text-slate-700">
                      {testLabels[item.testIndex] ?? `${t("statsColTest")} ${item.testIndex + 1}`}
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-800">{item.score}</td>
                    <td className="py-2 text-slate-800">
                      {showAgePercentile ? formatTopPercent(item.score, t) : "***"}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td className="py-2 pr-3 text-slate-600">-</td>
                  <td className="py-2 pr-3 font-medium text-slate-700">{t("statsAverageRow")}</td>
                  <td className="py-2 pr-3 font-semibold text-[#1565C0]">{avg}</td>
                  <td className="py-2 font-semibold text-[#1565C0]">
                    {showAgePercentile ? formatTopPercent(avg, t) : "***"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TestChromeProvider
      dimension={dimension}
      sessionIndex={testIndex}
      sessionTotal={testCount}
      sessionLabels={testLabels}
      onSkipSession={handleSkipSession}
    >
      <div className="font-app-body">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm font-medium text-[#1565C0] hover:underline"
        >
          ← {tCommon("back")}
        </button>
        <TestRunnerShell dimensionLabel={tDim(dimension)}>
          <TestRender />
        </TestRunnerShell>
      </div>
    </TestChromeProvider>
  );
}
