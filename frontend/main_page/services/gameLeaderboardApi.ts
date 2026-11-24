import { apiFetch } from "@/lib/api-config";
import type { GameLeaderboard, GameLeaderboardMode } from "@/types/gameLeaderboard";

export async function fetchGameLeaderboard(gameKey: string, signal?: AbortSignal, mode?: GameLeaderboardMode): Promise<GameLeaderboard> {
  const query = mode ? `?${new URLSearchParams({ mode })}` : "";
  const response = await apiFetch(`/api/games/${encodeURIComponent(gameKey)}/leaderboard${query}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("game_leaderboard_unavailable");
  const result = await response.json();
  if (!result.success || result.data?.metric !== "completed_levels" || !Array.isArray(result.data?.entries)
      || result.data.entries.length > 100) {
    throw new Error("game_leaderboard_unavailable");
  }
  return result.data as GameLeaderboard;
}
