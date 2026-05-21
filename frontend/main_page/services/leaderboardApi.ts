import { credentialedFetch, getApiUrl, getAuthHeaders } from "@/services/apiClient";

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  country?: string | null;
  score: number;
  trend?: "up" | "down" | "stable";
  avatar_url?: string | null;
  memory?: number | null;
  logic?: number | null;
  focus?: number | null;
  reaction?: number | null;
  strategy?: number | null;
  spatial?: number | null;
}

export async function fetchLeaderboard(type: string, limit = 50): Promise<LeaderboardEntry[]> {
  const res = await credentialedFetch(
    getApiUrl(`/api/leaderboard?type=${encodeURIComponent(type)}&limit=${limit}`),
    { headers: getAuthHeaders() },
  );
  if (!res.ok) throw new Error("fetch_leaderboard_failed");
  const json = await res.json();
  return (json?.data?.list ?? []) as LeaderboardEntry[];
}
