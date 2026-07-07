"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { DailyMission } from "@/types/progression";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import { getDifficultyConfig } from "@/config/difficultyLevels";
import type { MapLevelConfig } from "@/config/mapLevels";
import { saveLevelProgress } from "@/services/progressionApi";
import { saveMapProgress } from "@/services/mapProgressApi";
import { notifyRewardsUpdated } from "@/lib/reward-events";
import { recordCognitiveTrainingComplete } from "@/services/cognitiveApi";
import { TestChromeProvider, TestRunnerShell } from "./test-ui";
import LevelCompletePanel from "./LevelCompletePanel";

// Sub-test imports
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

/** Renders the correct sub-test component given a sub-test key + difficulty params */
function renderSubTest(
  subTestKey: string,
  params: Record<string, unknown>,
  onComplete: (score: number) => void,
  dateOfBirth?: string | null
) {
  const formalCount = params.formalCount as number | undefined;
  const formalCounts = params.formalCounts as Partial<Record<3 | 5 | 7, number>> | undefined;

  switch (subTestKey) {
    case "memory_sternberg": return <SternbergMemoryScanning onComplete={onComplete} dateOfBirth={dateOfBirth} difficultyConfig={{ memorizeMs: params.memorizeMs as number | undefined, formalCounts }} />;
    case "memory_change":    return <ChangeDetection onComplete={onComplete} dateOfBirth={dateOfBirth} difficultyConfig={{ formalCount }} />;
    case "memory_nback":     return <MemoryNBack onComplete={onComplete} dateOfBirth={dateOfBirth} difficultyConfig={{ nLevel: params.nLevel as number | undefined, intervalMs: params.intervalMs as number | undefined }} />;
    case "logic_transitive": return <TransitiveInference onComplete={onComplete} dateOfBirth={dateOfBirth} difficultyConfig={{ formalCount }} />;
    case "logic_syllogism":  return <SyllogisticReasoning onComplete={onComplete} dateOfBirth={dateOfBirth} difficultyConfig={{ formalCount }} />;
    case "logic_analogy":    return <AnalogicalReasoning onComplete={onComplete} difficultyConfig={{ formalCount }} />;
    case "focus_flanker":    return <FlankerTask onComplete={onComplete} dateOfBirth={dateOfBirth} difficultyConfig={{ trialWindowMs: params.trialWindowMs as number | undefined, formalCount }} />;
    case "focus_stroop":     return <StroopColor onComplete={onComplete} dateOfBirth={dateOfBirth} difficultyConfig={{ formalCount }} />;
    case "focus_schulte":    return <SchulteGrid onComplete={onComplete} difficultyConfig={{ gridSizes: params.gridSizes as number[] | undefined }} />;
    case "reaction_click":   return <ReactionClick onComplete={onComplete} dateOfBirth={dateOfBirth} />;
    case "reaction_arrow":   return <ReactionArrowKey onComplete={onComplete} dateOfBirth={dateOfBirth} />;
    case "reaction_pvt":     return <ReactionPVT onComplete={onComplete} dateOfBirth={dateOfBirth} />;
    case "strategy_hanoi":   return <HanoiPlanning onComplete={onComplete} dateOfBirth={dateOfBirth} difficultyConfig={{ diskSequence: params.diskSequence as number[] | undefined }} />;
    case "strategy_london":  return <LondonPlanning onComplete={onComplete} dateOfBirth={dateOfBirth} />;
    case "strategy_route":   return <RoutePlanning onComplete={onComplete} dateOfBirth={dateOfBirth} />;
    case "spatial_rotation": return <ShapeRotation onComplete={onComplete} />;
    case "spatial_fold":     return <PaperFold onComplete={onComplete} />;
    default:                 return null;
  }
}

// ─── Map Level Runner ──────────────────────────────────────────────────────────

interface MapChallengeRunnerProps {
  mapLevel: MapLevelConfig;
  previousBestScore: number;
  dateOfBirth?: string | null;
  onComplete: (avgScore: number) => void;
  onBack: () => void;
}

type MapPhase = "running" | "complete" | "confirm-quit";

/** Runs a Training Map level: cycles through each sub-test, then shows results. */
export function MapChallengeRunner({
  mapLevel,
  previousBestScore,
  dateOfBirth,
  onComplete,
  onBack,
}: MapChallengeRunnerProps) {
  const t = useTranslations("test");
  const [subTestIdx, setSubTestIdx] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [phase, setPhase] = useState<MapPhase>("running");

  const subTests = mapLevel.subTests;
  const currentSubTest = subTests[subTestIdx];

  const handleSubTestComplete = async (score: number) => {
    const newScores = [...scores, score];
    setScores(newScores);

    const isLast = subTestIdx >= subTests.length - 1;
    if (isLast) {
      const avgScore = Math.round(newScores.reduce((a, b) => a + b, 0) / newScores.length);
      setPhase("complete");
      try {
        await saveMapProgress(mapLevel.level, avgScore);
        if (mapLevel.level === 1) {
          await recordCognitiveTrainingComplete();
          notifyRewardsUpdated();
        }
      } catch {
        // silent
      }
    } else {
      setSubTestIdx((i) => i + 1);
    }
  };

  if (!currentSubTest) return null;

  if (phase === "complete") {
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return (
      <LevelCompletePanel
        subTestKey={currentSubTest.key}
        level={currentSubTest.difficulty}
        score={avgScore}
        previousBestScore={previousBestScore}
        mapLevel={mapLevel.level}
        onContinue={() => onComplete(avgScore)}
        onBack={onBack}
      />
    );
  }

  if (phase === "confirm-quit") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 font-app-body">
        <div className="rounded-2xl bg-white p-8 shadow-lg text-center max-w-xs w-full">
          <div className="text-4xl mb-3">🚪</div>
          <h3 className="text-lg font-bold text-[#003366] mb-1">{t("mapQuitTitle")}</h3>
          <p className="text-sm text-slate-500 mb-6">{t("mapQuitDesc")}</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setPhase("running")}
              className="w-full rounded-full bg-sky-500 py-2.5 text-sm font-bold text-white transition hover:bg-sky-600"
            >
              {t("mapQuitContinue")}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {t("mapQuitLeave")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cfg = getDifficultyConfig(currentSubTest.key, currentSubTest.difficulty);

  return (
    <div className="relative">
      {/* Quit button — always visible, floats above the test */}
      <div className="mb-3 flex items-center justify-between font-app-body">
        <button
          type="button"
          onClick={() => setPhase("confirm-quit")}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
        >
          <span>←</span>
          <span>{t("mapQuitBtn")}</span>
        </button>

        {/* Sub-test progress dots */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{subTestIdx + 1}/{subTests.length}</span>
          <div className="flex gap-1">
            {subTests.map((_, i) => (
              <span
                key={i}
                className={[
                  "w-2 h-2 rounded-full transition-all",
                  i < subTestIdx ? "bg-emerald-400" : i === subTestIdx ? "bg-sky-500 scale-125" : "bg-slate-200",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      </div>

      <TestChromeProvider
        dimension={currentSubTest.key.split("_")[0] as CognitiveDimensionKey}
        sessionIndex={subTestIdx}
        sessionTotal={subTests.length}
        sessionLabels={subTests.map((s) => s.key)}
        onSkipSession={() => {}}
        hideSkip
      >
        <TestRunnerShell dimensionLabel={`${t("mapLevelLabel")} ${mapLevel.level}`}>
          {renderSubTest(currentSubTest.key, cfg.params, (score) => void handleSubTestComplete(score), dateOfBirth)}
        </TestRunnerShell>
      </TestChromeProvider>
    </div>
  );
}

// ─── Legacy Daily Mission Runner (kept for compatibility) ─────────────────────

interface ChallengeRunnerProps {
  missions: DailyMission[];
  missionIndex: number;
  previousBestScore: number;
  dateOfBirth?: string | null;
  onMissionComplete: (score: number) => void;
  onBack: () => void;
}

type Phase = "running" | "complete";

export default function ChallengeRunner({
  missions,
  missionIndex,
  previousBestScore,
  dateOfBirth,
  onMissionComplete,
  onBack,
}: ChallengeRunnerProps) {
  const t = useTranslations("test");
  const mission = missions[missionIndex];
  const [phase, setPhase] = useState<Phase>("running");
  const [finalScore, setFinalScore] = useState(0);

  const handleSubTestComplete = async (score: number) => {
    setFinalScore(score);
    setPhase("complete");
    try {
      const cfg = getDifficultyConfig(mission.subTestKey, mission.level);
      await saveLevelProgress({ sub_test_key: mission.subTestKey, level: mission.level, score });
      void cfg; // suppress unused warning
      if (missionIndex === 0) {
        await recordCognitiveTrainingComplete();
        notifyRewardsUpdated();
      }
    } catch {
      // silent
    }
  };

  if (!mission) return null;

  if (phase === "complete") {
    return (
      <LevelCompletePanel
        subTestKey={mission.subTestKey}
        level={mission.level}
        score={finalScore}
        previousBestScore={previousBestScore}
        onContinue={() => onMissionComplete(finalScore)}
        onBack={onBack}
      />
    );
  }

  const cfg = getDifficultyConfig(mission.subTestKey, mission.level);
  const missionLabel = t(mission.labelKey as Parameters<typeof t>[0]);

  return (
    <TestChromeProvider
      dimension={mission.dimension as CognitiveDimensionKey}
      sessionIndex={missionIndex}
      sessionTotal={missions.length}
      sessionLabels={missions.map((m) => m.subTestKey)}
      onSkipSession={() => {}}
      hideSkip
    >
      <TestRunnerShell dimensionLabel={missionLabel}>
        <div className="mb-4 flex items-center gap-2 font-app-body text-sm text-slate-500">
          <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
            Lv.{mission.level}
          </span>
          <span>{missionLabel}</span>
        </div>
        {renderSubTest(mission.subTestKey, cfg.params, (score) => void handleSubTestComplete(score), dateOfBirth)}
      </TestRunnerShell>
    </TestChromeProvider>
  );
}
