import { apiFetch } from "@/lib/api-config";

export interface MapLevelProgressRecord {
  map_level: number;
  stars: number;
  best_score: number;
  completed_count: number;
  last_completed_at: string | null;
}

/** map_level → record */
export type MapProgressMap = Record<number, MapLevelProgressRecord>;

export async function fetchMapProgress(): Promise<MapProgressMap> {
  const res = await apiFetch("/api/user/map-progress");
  if (!res.ok) throw new Error("Failed to fetch map progress");
  const json = (await res.json()) as { data: { progress: MapLevelProgressRecord[] } };
  const map: MapProgressMap = {};
  for (const item of json.data.progress) {
    map[item.map_level] = item;
  }
  return map;
}

export async function saveMapProgress(map_level: number, score: number): Promise<void> {
  const res = await apiFetch("/api/user/map-progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ map_level, score }),
  });
  if (!res.ok) throw new Error("Failed to save map progress");
}
