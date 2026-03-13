"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import { DEFAULT_RADAR_SCORES } from "@/config/dimensions";
import { updateCognitiveScores } from "@/services/userApi";
import RadarChart from "@/components/features/home/RadarChart";
import MemoryNBack from "./MemoryNBack";
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

/**
 * 运行当前维度的 1～2 个测试，完成后写雷达分数并显示结果
 */
export default function TestRunner({ dimension, onBack }: TestRunnerProps) {
  const t = useTranslations("test");
  const tCommon = useTranslations("common");
  const [testIndex, setTestIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [radarScores, setRadarScores] = useState(DEFAULT_RADAR_SCORES);

  const testCount =
    dimension === "logic" || dimension === "focus" ? 2 : 1;

  const handleComplete = useCallback(
    async (score: number) => {
      const nextScores = [...scores, score];
      setScores(nextScores);
      if (testIndex + 1 >= testCount) {
        const avg = nextScores.reduce((a, b) => a + b, 0) / nextScores.length;
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
        setDone(true);
      } else {
        setTestIndex((i) => i + 1);
      }
    },
    [dimension, scores, testIndex, testCount]
  );

  const TestRender =
    dimension === "memory"
      ? () => <MemoryNBack onComplete={handleComplete} />
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
      scores.length > 0
        ? Math.round(
            scores.reduce((a, b) => a + b, 0) / scores.length
          )
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
        <p className="text-sm text-gray-500">{t("resultRadar")}</p>
        <RadarChart scores={radarScores} />
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
      <p className="text-sm text-gray-500">
        {t("testProgress", { current: testIndex + 1, total: testCount })}
      </p>
      <TestRender />
    </div>
  );
}
