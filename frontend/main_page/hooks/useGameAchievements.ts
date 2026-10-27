"use client";

import { useEffect, useState } from "react";
import { fetchGameAchievements } from "@/services/gameAchievementsApi";
import type { GameAchievementProgress } from "@/types/gameAchievements";

export function useGameAchievements(gameKey: string) {
  const [progress, setProgress] = useState<GameAchievementProgress>();
  useEffect(() => {
    if (gameKey !== "chessmater") return;
    const controller = new AbortController();
    let busy = false;
    const refresh = async () => {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const next = await fetchGameAchievements(gameKey, controller.signal);
        if (!controller.signal.aborted) setProgress(next);
      } catch {
        // Retain confirmed progress when a background refresh fails.
      } finally { busy = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [gameKey]);
  return progress?.gameKey === gameKey ? progress : undefined;
}
