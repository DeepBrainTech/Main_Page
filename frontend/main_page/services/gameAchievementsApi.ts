import { GAME_ACHIEVEMENT_GROUPS, GAME_ACHIEVEMENT_LABELS } from "@/config/game-achievements";
import { apiFetch } from "@/lib/api-config";
import type { GameAchievementProgress } from "@/types/gameAchievements";

export async function fetchGameAchievements(gameKey: string, signal?: AbortSignal): Promise<GameAchievementProgress> {
  const labels = GAME_ACHIEVEMENT_LABELS[gameKey];
  if (!labels) throw new Error("game_achievements_unavailable");
  const response = await apiFetch(`/api/games/${encodeURIComponent(gameKey)}/achievements`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("game_achievements_unavailable");
  const result = await response.json();
  const progress = result.data;
  if (!result.success || progress?.gameKey !== gameKey || !progress.values || !progress.targets
    || GAME_ACHIEVEMENT_GROUPS.some(({ key, icons }) => {
      const value = progress.values[labels[key].descriptionKey];
      const targets = progress.targets[key];
      return !Number.isSafeInteger(value) || value < 0
        || !Array.isArray(targets) || targets.length !== icons.length
        || targets.some((target, index) => !Number.isSafeInteger(target) || target <= (targets[index - 1] ?? 0));
    })) {
    throw new Error("game_achievements_unavailable");
  }
  return progress;
}
