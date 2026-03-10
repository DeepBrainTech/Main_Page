"use client";

import { useCallback, useEffect, useState } from "react";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import { DEFAULT_RADAR_SCORES } from "@/config/dimensions";
import { fetchCognitiveScores, updateCognitiveScores, type CognitiveScoresData } from "@/services/userApi";

/**
 * 六维认知分数：从后端获取，更新后写回后端
 */
export function useCognitiveScores() {
  const [scores, setScores] = useState<Record<CognitiveDimensionKey, number>>(DEFAULT_RADAR_SCORES);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCognitiveScores();
      setScores({
        memory: data.memory ?? 0,
        logic: data.logic ?? 0,
        focus: data.focus ?? 0,
        reaction: data.reaction ?? 0,
        strategy: data.strategy ?? 0,
        spatial: data.spatial ?? 0,
      });
    } catch {
      // 保持默认 0
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateDimension = useCallback(async (dimension: CognitiveDimensionKey, value: number) => {
    const next = { ...scores, [dimension]: value };
    setScores(next);
    try {
      await updateCognitiveScores({ [dimension]: value });
    } catch {
      setScores(scores);
    }
  }, [scores]);

  return { scores, loading, refresh: load, updateDimension };
}
