"use client";

import { useState, useCallback } from "react";
import { fetchMapProgress, type MapProgressMap } from "@/services/mapProgressApi";

export interface UseMapProgressResult {
  progressMap: MapProgressMap;
  loading: boolean;
  reload: () => Promise<void>;
  /** Returns stars (0-3) for a given map level, or 0 if not yet completed */
  getStars: (level: number) => number;
  /** Returns true if the user may attempt this level (level 1 always unlocked; otherwise prev level ≥ 1 star) */
  isUnlocked: (level: number) => boolean;
  /** The highest level the user has ever unlocked (started) */
  maxUnlockedLevel: number;
}

export function useMapProgress(): UseMapProgressResult {
  const [progressMap, setProgressMap] = useState<MapProgressMap>({});
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const map = await fetchMapProgress();
      setProgressMap(map);
    } catch {
      // silent — user might not be logged in yet
    } finally {
      setLoading(false);
    }
  }, []);

  const getStars = useCallback(
    (level: number) => progressMap[level]?.stars ?? 0,
    [progressMap]
  );

  const isUnlocked = useCallback(
    (level: number) => {
      if (level <= 1) return true;
      return (progressMap[level - 1]?.stars ?? 0) >= 1;
    },
    [progressMap]
  );

  // Highest level where either completed or just unlocked
  const maxUnlockedLevel = (() => {
    let max = 1;
    for (const lvStr of Object.keys(progressMap)) {
      const lv = Number(lvStr);
      if ((progressMap[lv]?.stars ?? 0) >= 1) {
        max = Math.max(max, lv + 1);
      }
    }
    return max;
  })();

  return { progressMap, loading, reload, getStars, isUnlocked, maxUnlockedLevel };
}
