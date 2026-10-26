"use client";

import { useEffect, useState } from "react";
import { fetchGameLeaderboard } from "@/services/gameLeaderboardApi";
import type { GameLeaderboard } from "@/types/gameLeaderboard";

export function useGameLeaderboard(gameKey: string) {
  const supported = gameKey === "chessmater";
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    gameKey: string; data: GameLeaderboard | null; loading: boolean; error: boolean;
  }>({ gameKey, data: null, loading: supported, error: false });

  useEffect(() => {
    if (!supported) return;
    const controller = new AbortController();
    setState({ gameKey, data: null, loading: true, error: false });
    void fetchGameLeaderboard(gameKey, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setState({ gameKey, data, loading: false, error: false }); },
      () => { if (!controller.signal.aborted) setState({ gameKey, data: null, loading: false, error: true }); },
    );
    return () => controller.abort();
  }, [gameKey, supported, attempt]);

  return {
    ...(state.gameKey === gameKey && supported ? state : { data: null, loading: supported, error: false }),
    supported,
    retry: () => setAttempt((value) => value + 1),
  };
}
