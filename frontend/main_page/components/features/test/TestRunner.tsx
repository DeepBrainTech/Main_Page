"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import { DEFAULT_RADAR_SCORES } from "@/config/dimensions";
import { updateCognitiveScores } from "@/services/userApi";
import RadarChart from "@/components/features/home/RadarChart";
import MemoryNBack from "./MemoryNBack";
import ChangeDetection from "./ChangeDetection";
import SternbergMemoryScanning from "./SternbergMemoryScanning";
import PatternComplete from "./PatternComplete";
import MatrixReasoning from "./MatrixReasoning";
import SchulteGrid from "./SchulteGrid";
import StroopColor from "./StroopColor";
import ReactionClick from "./ReactionClick";
import ShortestPath from "./ShortestPath";
import ShapeRotation from "./ShapeRotation";

interface TestRunnerProps {
  dimension: CognitiveDimensionKey;
  onBack: () => void;
}

interface CompletedRecord {
  testIndex: number;
  score: number;
}

/**
 * 运行当前维度的多个测试，完成后写雷达分数并显示结果
 */
export default function TestRunner({ dimension, onBack }: TestRunnerProps) {
  const t = useTranslations("test");
  const tCommon = useTranslations("common");
  const [testIndex, setTestIndex] = useState(0);
  const [records, setRecords] = useState<CompletedRecord[]>([]);
  const [done, setDone] = useState(false);
  const [radarScores, setRadarScores] = useState(DEFAULT_RADAR_SCORES);

  const testLabels =
    dimension === "memory"
      ? [t("memory.nBackTitle"), t("memory.cdTitle"), t("memory.sternbergTitle")]
      : dimension === "logic"
        ? [t("logic.patternTitle"), t("logic.matrixTitle")]
        : dimension === "focus"
          ? [t("focus.schulteTitle"), t("focus.stroopTitle")]
          : dimension === "reaction"
            ? [t("reaction.title")]
            : dimension === "strategy"
              ? [t("strategy.pathTitle")]
              : dimension === "spatial"
                ? [t("spatial.title")]
                : [];

  const testCount =
    dimension === "memory"
      ? 3
      : dimension === "logic" || dimension === "focus"
        ? 2
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

  const handleSkip = useCallback(async () => {
    if (testIndex + 1 >= testCount) {
      await finishWithRecords(records);
    } else {
      setTestIndex((i) => i + 1);
    }
  }, [finishWithRecords, records, testIndex, testCount]);

  const TestRender =
    dimension === "memory" && testIndex === 0
      ? () => <MemoryNBack onComplete={handleComplete} />
      : dimension === "memory" && testIndex === 1
        ? () => <ChangeDetection onComplete={handleComplete} />
        : dimension === "memory" && testIndex === 2
          ? () => <SternbergMemoryScanning onComplete={handleComplete} />
        : dimension === "logic" && testIndex === 0
          ? () => <PatternComplete onComplete={handleComplete} />
          : dimension === "logic" && testIndex === 1
            ? () => <MatrixReasoning onComplete={handleComplete} />
            : dimension === "focus" && testIndex === 0
              ? () => <SchulteGrid onComplete={handleComplete} />
              : dimension === "focus" && testIndex === 1
                ? () => <StroopColor onComplete={handleComplete} />
                : dimension === "reaction"
                  ? () => <ReactionClick onComplete={handleComplete} />
                  : dimension === "strategy"
                    ? () => <ShortestPath onComplete={handleComplete} />
                    : dimension === "spatial"
                      ? () => <ShapeRotation onComplete={handleComplete} />
                      : () => <div />;

  if (done) {
    const avg =
      records.length > 0
        ? Math.round(records.reduce((sum, item) => sum + item.score, 0) / records.length)
        : 0;

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[#5E81AC] hover:underline"
        >
          {tCommon("back")}
        </button>
        <h3 className="text-xl font-bold text-gray-800">{t("brainIndex")}</h3>
        <p className="text-gray-600">
          {t("yourScore")}: {avg}
        </p>
        <RadarChart scores={radarScores} />
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-gray-800">{t("dimensionStatsTitle")}</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-3 font-medium">{t("statsColIndex")}</th>
                  <th className="py-2 pr-3 font-medium">{t("statsColTest")}</th>
                  <th className="py-2 font-medium">{t("statsColScore")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((item, idx) => (
                  <tr key={`${idx}-${item.testIndex}-${item.score}`} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-2 pr-3 text-gray-600">{idx + 1}</td>
                    <td className="py-2 pr-3 text-gray-700">
                      {testLabels[item.testIndex] ?? `${t("statsColTest")} ${item.testIndex + 1}`}
                    </td>
                    <td className="py-2 font-medium text-gray-800">{item.score}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td className="py-2 pr-3 text-gray-600">-</td>
                  <td className="py-2 pr-3 font-medium text-gray-700">{t("statsAverageRow")}</td>
                  <td className="py-2 font-semibold text-[#5E81AC]">{avg}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-[#5E81AC] hover:underline"
      >
        {tCommon("back")}
      </button>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {t("testProgress", { current: testIndex + 1, total: testCount })}
        </p>
        <button
          type="button"
          onClick={handleSkip}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          {t("skipTest")}
        </button>
      </div>
      <TestRender />
    </div>
  );
}
