"use client";

import { useEffect, useState } from "react";
import { fetchGameLeaderboard } from "@/services/gameLeaderboardApi";
import type { GameLeaderboard, GameLeaderboardMode } from "@/types/gameLeaderboard";

export function useGameLeaderboard(gameKey: string, mode?: GameLeaderboardMode) {
  const supported = gameKey === "chessmater" || gameKey === "chess-tourmaster";
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${gameKey}:${mode ?? ""}:${attempt}`;
  const [state, setState] = useState<{
    requestKey: string; data: GameLeaderboard | null; error: boolean;
  }>();

  useEffect(() => {
    if (!supported) return;
    const controller = new AbortController();
    void fetchGameLeaderboard(gameKey, controller.signal, mode).then(
      (data) => { if (!controller.signal.aborted) setState({ requestKey, data, error: false }); },
      () => { if (!controller.signal.aborted) setState({ requestKey, data: null, error: true }); },
    );
    return () => controller.abort();
  }, [gameKey, mode, supported, requestKey]);

  const current = supported && state?.requestKey === requestKey ? state : undefined;
  return {
    data: current?.data ?? null,
    loading: supported && !current,
    error: current?.error ?? false,
    supported,
    retry: () => setAttempt((value) => value + 1),
  };
}
