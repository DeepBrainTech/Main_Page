import { apiFetch } from "@/lib/api-config";
import type { GameAchievementProgress } from "@/types/gameAchievements";

export async function fetchGameAchievements(gameKey: string, signal?: AbortSignal): Promise<GameAchievementProgress> {
  const response = await apiFetch(`/api/games/${encodeURIComponent(gameKey)}/achievements`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("game_achievements_unavailable");
  const result = await response.json();
  const progress = result.data;
  if (!result.success || progress?.gameKey !== gameKey || !progress.values
    || ["levels", "records", "noHints", "moves"].some((key) => !Number.isSafeInteger(progress.values[key]) || progress.values[key] < 0)) {
    throw new Error("game_achievements_unavailable");
  }
  return progress;
}
