import { credentialedFetch, getApiUrl, getAuthHeaders } from "@/services/apiClient";
import type { LevelProgress } from "@/types/progression";

export interface SaveLevelProgressBody {
  sub_test_key: string;
  level: number;
  score: number;
}

export interface SaveLevelProgressResult extends LevelProgress {
  is_new_record: boolean;
}

export async function fetchLevelProgress(): Promise<LevelProgress[]> {
  const res = await credentialedFetch(getApiUrl("/api/user/level-progress"), {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("fetch_level_progress_failed");
  const json = await res.json();
  return (json?.data?.progress ?? []) as LevelProgress[];
}

export async function saveLevelProgress(
  body: SaveLevelProgressBody
): Promise<SaveLevelProgressResult> {
  const res = await credentialedFetch(getApiUrl("/api/user/level-progress"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("save_level_progress_failed");
  const json = await res.json();
  return json?.data as SaveLevelProgressResult;
}
