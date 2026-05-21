import { credentialedFetch, getApiUrl, getAuthHeaders } from "@/services/apiClient";

export interface CognitiveScoresData {
  memory: number;
  logic: number;
  focus: number;
  reaction: number;
  strategy: number;
  spatial: number;
}

export async function fetchCognitiveScores(): Promise<CognitiveScoresData> {
  const res = await credentialedFetch(getApiUrl("/api/user/cognitive-scores"), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_scores_failed");
  const json = await res.json();
  if (!json?.data) return { memory: 0, logic: 0, focus: 0, reaction: 0, strategy: 0, spatial: 0 };
  return json.data as CognitiveScoresData;
}

export async function updateCognitiveScores(scores: Partial<CognitiveScoresData>): Promise<CognitiveScoresData> {
  const res = await credentialedFetch(getApiUrl("/api/user/cognitive-scores"), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(scores),
  });
  if (!res.ok) throw new Error("update_scores_failed");
  const json = await res.json();
  return json?.data as CognitiveScoresData;
}
