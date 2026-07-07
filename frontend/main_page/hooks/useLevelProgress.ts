"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchLevelProgress } from "@/services/progressionApi";
import type { LevelProgress, LevelProgressMap } from "@/types/progression";

function buildProgressMap(rows: LevelProgress[]): LevelProgressMap {
  const map: LevelProgressMap = {};
  for (const r of rows) {
    if (!map[r.sub_test_key]) map[r.sub_test_key] = {};
    map[r.sub_test_key][r.level] = r;
  }
  return map;
}

export function useLevelProgress() {
  const [progressMap, setProgressMap] = useState<LevelProgressMap>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const rows = await fetchLevelProgress();
      setProgressMap(buildProgressMap(rows));
    } catch {
      // silent fail – user sees empty progress
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Current recommended level for a sub-test (1-5) */
  function getCurrentLevel(subTestKey: string): number {
    const levels = progressMap[subTestKey];
    if (!levels) return 1;
    for (let lv = 5; lv >= 1; lv--) {
      if (levels[lv] && (levels[lv].stars ?? 0) >= 1) {
        return Math.min(5, lv + 1);
      }
    }
    return 1;
  }

  /** Stars earned at a specific level */
  function getStars(subTestKey: string, level: number): number {
    return progressMap[subTestKey]?.[level]?.stars ?? 0;
  }

  /** Best score at a specific level */
  function getBestScore(subTestKey: string, level: number): number {
    return progressMap[subTestKey]?.[level]?.best_score ?? 0;
  }

  return { progressMap, loading, reload: load, getCurrentLevel, getStars, getBestScore };
}
