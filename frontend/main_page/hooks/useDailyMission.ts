"use client";

import { useMemo } from "react";
import { SUB_TEST_KEYS, type SubTestKey, type DailyMission, type LevelProgressMap } from "@/types/progression";
import { DIFFICULTY_LEVELS } from "@/config/difficultyLevels";

/** Maps each sub-test to its dimension and testIndex within the dimension */
const SUB_TEST_META: Record<SubTestKey, { dimension: string; testIndex: number; labelKey: string }> = {
  memory_sternberg:  { dimension: "memory",   testIndex: 0, labelKey: "memory.sternbergTitle" },
  memory_change:     { dimension: "memory",   testIndex: 1, labelKey: "memory.cdTitle" },
  memory_nback:      { dimension: "memory",   testIndex: 2, labelKey: "memory.nBackTitle" },
  logic_transitive:  { dimension: "logic",    testIndex: 0, labelKey: "logic.patternTitle" },
  logic_syllogism:   { dimension: "logic",    testIndex: 1, labelKey: "logic.syllogismTitle" },
  logic_analogy:     { dimension: "logic",    testIndex: 2, labelKey: "logic.analogyTitle" },
  focus_flanker:     { dimension: "focus",    testIndex: 0, labelKey: "focus.flankerTitle" },
  focus_stroop:      { dimension: "focus",    testIndex: 1, labelKey: "focus.stroopTitle" },
  focus_schulte:     { dimension: "focus",    testIndex: 2, labelKey: "focus.schulteTitle" },
  reaction_click:    { dimension: "reaction", testIndex: 0, labelKey: "reaction.title" },
  reaction_arrow:    { dimension: "reaction", testIndex: 1, labelKey: "reaction.arrowTitle" },
  reaction_pvt:      { dimension: "reaction", testIndex: 2, labelKey: "reaction.pvtTitle" },
  strategy_hanoi:    { dimension: "strategy", testIndex: 0, labelKey: "strategy.hanoiTitle" },
  strategy_london:   { dimension: "strategy", testIndex: 1, labelKey: "strategy.londonTitle" },
  strategy_route:    { dimension: "strategy", testIndex: 2, labelKey: "strategy.routeTitle" },
  spatial_rotation:  { dimension: "spatial",  testIndex: 0, labelKey: "spatial.title" },
  spatial_fold:      { dimension: "spatial",  testIndex: 1, labelKey: "spatial.foldTitle" },
};

function dateSeed(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

function getCurrentRecommendedLevel(progressMap: LevelProgressMap, key: string): number {
  const levels = progressMap[key];
  if (!levels) return 1;
  for (let lv = 5; lv >= 1; lv--) {
    if (levels[lv] && (levels[lv].stars ?? 0) >= 1) return Math.min(5, lv + 1);
  }
  return 1;
}

/**
 * Generates today's 3 daily missions based on level progress.
 * Uses a date seed so the same day always produces the same missions.
 */
export function useDailyMission(progressMap: LevelProgressMap): DailyMission[] {
  return useMemo(() => {
    const today = new Date();
    const seed = dateSeed(today);
    const rand = seededRandom(seed);

    // Build candidate list with their recommended level
    const candidates: Array<{ key: SubTestKey; level: number; dimension: string }> = SUB_TEST_KEYS.map((key) => ({
      key,
      level: getCurrentRecommendedLevel(progressMap, key),
      dimension: SUB_TEST_META[key].dimension,
    }));

    // Shuffle candidates using seeded random
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Pick 3 missions covering at least 2 different dimensions
    const selected: typeof shuffled = [];
    const usedDimensions = new Set<string>();

    for (const candidate of shuffled) {
      if (selected.length >= 3) break;
      // Allow max 2 from same dimension
      const dimCount = selected.filter((s) => s.dimension === candidate.dimension).length;
      if (dimCount < 2) {
        selected.push(candidate);
        usedDimensions.add(candidate.dimension);
      }
    }

    // If we still have < 3, fill from remaining
    if (selected.length < 3) {
      for (const candidate of shuffled) {
        if (selected.length >= 3) break;
        if (!selected.find((s) => s.key === candidate.key)) {
          selected.push(candidate);
        }
      }
    }

    return selected.map(({ key, level }) => {
      const meta = SUB_TEST_META[key];
      const config = DIFFICULTY_LEVELS[key][Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5];
      return {
        subTestKey: key,
        dimension: meta.dimension,
        testIndex: meta.testIndex,
        level,
        estimatedMinutes: config.estimatedMinutes,
        labelKey: meta.labelKey,
      };
    });
  }, [progressMap]);
}
