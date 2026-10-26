import { apiFetch } from "@/lib/api-config";
import type { GameMedia } from "@/types/gameMedia";

export async function fetchGameMedia(slug: string, signal?: AbortSignal): Promise<GameMedia> {
  const response = await apiFetch(`/api/games/${encodeURIComponent(slug)}/media`, { signal });
  if (!response.ok) throw new Error("game_media_unavailable");
  const result = await response.json();
  if (!result.success) throw new Error("game_media_unavailable");
  return result.data as GameMedia;
}
