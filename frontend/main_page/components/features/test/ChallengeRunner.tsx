"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { DailyMission } from "@/types/progression";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import { computeMapStars, getDifficultyConfig } from "@/config/difficultyLevels";
import { MAP_LEVELS, type MapLevelConfig } from "@/config/mapLevels";
import { updateCognitiveScores, type CognitiveScoresData } from "@/services/cognitiveApi";
import { saveLevelProgress } from "@/services/progressionApi";
import { saveMapProgress } from "@/services/mapProgressApi";
import { notifyRewardsUpdated } from "@/lib/reward-events";
import { recordCognitiveTrainingComplete } from "@/services/cognitiveApi";
import { TestChromeProvider, TestRunnerShell } from "./test-ui";
import LevelCompletePanel, {
  type LevelCompletePowerGain,
  type LevelCompleteSubTestResult,
} from "./LevelCompletePanel";

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
  onComplete: (result: SubTestCompletion) => void,
  dateOfBirth?: string | null,
) {
  const formalCount = params.formalCount as number | undefined;
  const formalCounts = params.formalCounts as Partial<Record<3 | 5 | 7, number>> | undefined;

  switch (subTestKey) {
    case "memory_sternberg": return <SternbergMemoryScanning onComplete={onComplete} dateOfBirth={dateOfBirth} difficultyConfig={{ memorizeMs: params.memorizeMs as number | undefined, formalCounts }} />;
    case "memory_change":    return <ChangeDetection onComplete={onComplete} dateOfBirth={dateOfBirth} difficultyConfig={{ formalCount }} />;
    case "memory_nback":     return <MemoryNBack onComplete={onComplete} dateOfBirth={dateOfBirth} difficultyConfig={{ nLevel: params.nLevel as number | undefined, intervalMs: params.intervalMs as number | undefined, gridSize: params.gridSize as number | undefined }} />;
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
  previousBestStars: number;
  cognitiveScores: CognitiveScoresData;
  dateOfBirth?: string | null;
  onComplete: (avgScore: number) => void | Promise<void>;
  onBack: () => void;
}

type MapPhase = "running" | "complete" | "confirm-quit";

type MapSubTestScore = {
  dimension: CognitiveDimensionKey;
  mapScore: number;
};

type SubTestCompletion =
  | number
  | {
      score: number;
      total?: number;
      correct?: number;
      wrong?: number;
      completed?: number;
      avgRtMs?: number | null;
      medianRtMs?: number | null;
      bestRtMs?: number | null;
    };

type NormalizedSubTestCompletion = Exclude<SubTestCompletion, number>;

type DimensionPowerGain = LevelCompletePowerGain & {
  score: number;
  stars: 0 | 1 | 2 | 3;
};

type LevelDimensionStars = Partial<Record<CognitiveDimensionKey, 0 | 1 | 2 | 3>>;
type StoredDimensionStars = Record<string, LevelDimensionStars>;

const COGNITIVE_DIMENSIONS: CognitiveDimensionKey[] = [
  "memory",
  "logic",
  "focus",
  "reaction",
  "strategy",
  "spatial",
];

const MAP_SCORE_BONUS_BY_DIFFICULTY: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 25,
  2: 20,
  3: 15,
  4: 10,
  5: 5,
};

const MAP_DIMENSION_STARS_STORAGE_KEY = "brainTraining.mapDimensionBestStars.v1";

function getOverallPowerScore(scores: CognitiveScoresData): number {
  const values = [scores.memory, scores.logic, scores.focus, scores.reaction, scores.strategy, scores.spatial];
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getDimensionFromSubTest(subTestKey: string): CognitiveDimensionKey {
  return subTestKey.split("_")[0] as CognitiveDimensionKey;
}

function getMapLevelDimensions(mapLevel: MapLevelConfig): CognitiveDimensionKey[] {
  return Array.from(new Set(mapLevel.subTests.map((subTest) => getDimensionFromSubTest(subTest.key))));
}

function convertRawScoreToMapScore(rawScore: number, difficulty: 1 | 2 | 3 | 4 | 5): number {
  const bonus = MAP_SCORE_BONUS_BY_DIFFICULTY[difficulty];
  const score = rawScore * ((100 - bonus) / 100) + bonus;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeSubTestCompletion(result: SubTestCompletion): NormalizedSubTestCompletion {
  if (typeof result === "number") return { score: result };
  return result;
}

function clampStars(value: number | undefined): 0 | 1 | 2 | 3 {
  if (value === undefined || Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value === 1) return 1;
  if (value === 2) return 2;
  return 3;
}

function getGainForStars(levelMaxGain: number, stars: 0 | 1 | 2 | 3): number {
  if (stars <= 0 || levelMaxGain <= 0) return 0;
  return Math.max(1, Math.round((levelMaxGain * stars) / 3));
}

function readStoredDimensionStars(): StoredDimensionStars {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MAP_DIMENSION_STARS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredDimensionStars;
  } catch {
    return {};
  }
}

function getStoredLevelDimensionStars(mapLevel: number): LevelDimensionStars {
  return readStoredDimensionStars()[String(mapLevel)] ?? {};
}

function writeStoredLevelDimensionStars(mapLevel: number, stars: LevelDimensionStars): void {
  if (typeof window === "undefined") return;
  try {
    const stored = readStoredDimensionStars();
    stored[String(mapLevel)] = stars;
    window.localStorage.setItem(MAP_DIMENSION_STARS_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Backend progress still caps the level stars if browser storage is unavailable.
  }
}

function buildDimensionLevelWeights(): Record<CognitiveDimensionKey, Record<number, number>> {
  const levelsByDimension = COGNITIVE_DIMENSIONS.reduce<Record<CognitiveDimensionKey, number[]>>((acc, dimension) => {
    acc[dimension] = [];
    return acc;
  }, {} as Record<CognitiveDimensionKey, number[]>);

  MAP_LEVELS.forEach((level) => {
    getMapLevelDimensions(level).forEach((dimension) => {
      levelsByDimension[dimension].push(level.level);
    });
  });

  return COGNITIVE_DIMENSIONS.reduce<Record<CognitiveDimensionKey, Record<number, number>>>((acc, dimension) => {
    const levels = levelsByDimension[dimension];
    const base = Math.floor(100 / Math.max(1, levels.length));
    const remainder = 100 - base * levels.length;
    acc[dimension] = {};
    levels.forEach((level, index) => {
      acc[dimension][level] = base + (index < remainder ? 1 : 0);
    });
    return acc;
  }, {} as Record<CognitiveDimensionKey, Record<number, number>>);
}

const DIMENSION_LEVEL_WEIGHTS = buildDimensionLevelWeights();

function calculateDimensionPowerGains(
  currentScores: CognitiveScoresData,
  mapLevel: MapLevelConfig,
  subTestScores: MapSubTestScore[],
  previousDimensionStars: LevelDimensionStars,
  previousBestStars: number,
): DimensionPowerGain[] {
  const groupedScores = subTestScores.reduce<Partial<Record<CognitiveDimensionKey, number[]>>>((acc, item) => {
    acc[item.dimension] = [...(acc[item.dimension] ?? []), item.mapScore];
    return acc;
  }, {});

  return getMapLevelDimensions(mapLevel).flatMap((dimension) => {
    const dimensionScores = groupedScores[dimension] ?? [];
    if (dimensionScores.length === 0) return [];

    const dimensionAverage = Math.round(
      dimensionScores.reduce((sum, value) => sum + value, 0) / dimensionScores.length
    );
    const dimensionStars = computeMapStars(dimensionAverage, mapLevel.level);
    const priorStars = clampStars(previousDimensionStars[dimension] ?? previousBestStars);
    const current = currentScores[dimension] ?? 0;
    const levelMaxGain = DIMENSION_LEVEL_WEIGHTS[dimension][mapLevel.level] ?? 0;
    const gain = Math.max(0, getGainForStars(levelMaxGain, dimensionStars) - getGainForStars(levelMaxGain, priorStars));
    const after = Math.min(100, current + gain);

    return [
      {
        dimension,
        score: dimensionAverage,
        stars: dimensionStars,
        before: current,
        after,
        gain: after - current,
      },
    ];
  });
}

function calculateNextCognitiveScores(
  currentScores: CognitiveScoresData,
  mapLevel: MapLevelConfig,
  subTestScores: MapSubTestScore[],
  previousDimensionStars: LevelDimensionStars,
  previousBestStars: number,
): CognitiveScoresData {
  const next: CognitiveScoresData = { ...currentScores };
  calculateDimensionPowerGains(currentScores, mapLevel, subTestScores, previousDimensionStars, previousBestStars).forEach((item) => {
    next[item.dimension] = item.after;
  });

  return next;
}

/** Runs a Training Map level: cycles through each sub-test, then shows results. */
export function MapChallengeRunner({
  mapLevel,
  previousBestScore,
  previousBestStars,
  cognitiveScores,
  dateOfBirth,
  onComplete,
  onBack,
}: MapChallengeRunnerProps) {
  const t = useTranslations("test");
  const [subTestIdx, setSubTestIdx] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [subTestResults, setSubTestResults] = useState<LevelCompleteSubTestResult[]>([]);
  const [powerGains, setPowerGains] = useState<LevelCompletePowerGain[]>([]);
  const [powerScoreAfter, setPowerScoreAfter] = useState<number | undefined>(undefined);
  const [phase, setPhase] = useState<MapPhase>("running");

  const subTests = mapLevel.subTests;
  const currentSubTest = subTests[subTestIdx];
  const powerScoreBefore = getOverallPowerScore(cognitiveScores);

  const handleSubTestComplete = async (completion: SubTestCompletion) => {
    const normalized = normalizeSubTestCompletion(completion);
    const mapScore = convertRawScoreToMapScore(normalized.score, currentSubTest.difficulty);
    const newScores = [...scores, mapScore];
    const currentResult: LevelCompleteSubTestResult = {
      subTestKey: currentSubTest.key,
      dimension: getDimensionFromSubTest(currentSubTest.key),
      difficulty: currentSubTest.difficulty,
      rawScore: Math.round(normalized.score),
      mapScore,
      stars: computeMapStars(mapScore, mapLevel.level),
      total: normalized.total,
      correct: normalized.correct,
      wrong: normalized.wrong,
      completed: normalized.completed,
      avgRtMs: normalized.avgRtMs,
      medianRtMs: normalized.medianRtMs,
      bestRtMs: normalized.bestRtMs,
    };
    const newResults = [...subTestResults, currentResult];
    setScores(newScores);
    setSubTestResults(newResults);

    const isLast = subTestIdx >= subTests.length - 1;
    if (isLast) {
      const avgScore = Math.round(newScores.reduce((a, b) => a + b, 0) / newScores.length);
      const subTestScores = newResults.map((result) => ({
        dimension: result.dimension,
        mapScore: result.mapScore,
      }));
      const previousDimensionStars = getStoredLevelDimensionStars(mapLevel.level);
      const nextPowerGains = calculateDimensionPowerGains(
        cognitiveScores,
        mapLevel,
        subTestScores,
        previousDimensionStars,
        previousBestStars
      );
      const nextScores = calculateNextCognitiveScores(
        cognitiveScores,
        mapLevel,
        subTestScores,
        previousDimensionStars,
        previousBestStars
      );
      setPowerGains(nextPowerGains);
      setPowerScoreAfter(getOverallPowerScore(nextScores));
      try {
        await saveMapProgress(mapLevel.level, avgScore);
        await updateCognitiveScores(nextScores);
        const updatedDimensionStars = { ...previousDimensionStars };
        nextPowerGains.forEach((item) => {
          const priorStars = clampStars(updatedDimensionStars[item.dimension] ?? previousBestStars);
          updatedDimensionStars[item.dimension] = Math.max(priorStars, item.stars) as 0 | 1 | 2 | 3;
        });
        writeStoredLevelDimensionStars(mapLevel.level, updatedDimensionStars);
        if (mapLevel.level === 1) {
          await recordCognitiveTrainingComplete();
          notifyRewardsUpdated();
        }
      } catch {
        // silent
      }
      setPhase("complete");
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
        powerScoreBefore={powerScoreBefore}
        powerScoreAfter={powerScoreAfter ?? powerScoreBefore}
        subTestResults={subTestResults}
        powerGains={powerGains}
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

  const handleSubTestComplete = async (completion: SubTestCompletion) => {
    const { score } = normalizeSubTestCompletion(completion);
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
