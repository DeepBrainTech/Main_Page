import { credentialedFetch, getApiUrl, getAuthHeaders } from "@/services/apiClient";

export interface RewardsData {
  coins: number;
  diamonds: number;
  flowers: number;
  check_in_dates: string[];
  has_checked_in_today: boolean;
  current_streak: number;
  daily_progress: Record<string, number>;
  monthly_progress: number;
  monthly_target: number;
  task_claimed_today: string[];
  monthly_claimed: boolean;
  played_game_count?: number;
}

export async function fetchRewards(): Promise<RewardsData> {
  const res = await credentialedFetch(getApiUrl("/api/user/rewards"), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_rewards_failed");
  const json = await res.json();
  if (!json?.data) throw new Error("invalid_response");
  return json.data as RewardsData;
}

export async function postCheckIn(): Promise<{
  coins: number;
  membership_bonus_plan: "plus" | "premium" | null;
  membership_bonus_coins: number;
  membership_bonus_diamonds: number;
  diamonds: number;
  flowers: number;
}> {
  const res = await credentialedFetch(getApiUrl("/api/user/check-in"), {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("check_in_failed");
  const json = await res.json();
  return (
    json?.data ?? {
      coins: 0,
      membership_bonus_plan: null,
      membership_bonus_coins: 0,
      membership_bonus_diamonds: 0,
      diamonds: 0,
      flowers: 0,
    }
  );
}

export async function claimTask(taskId: string): Promise<{ coins: number; diamonds: number; flowers: number }> {
  const res = await credentialedFetch(getApiUrl(`/api/user/tasks/claim?task_id=${encodeURIComponent(taskId)}`), {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "claim_failed");
  }
  const json = await res.json();
  return json?.data ?? { coins: 0, diamonds: 0, flowers: 0 };
}

export async function fetchAssets(): Promise<{ coins: number; diamonds: number; flowers: number }> {
  const res = await credentialedFetch(getApiUrl("/api/user/assets"), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_assets_failed");
  const json = await res.json();
  return json?.data ?? { coins: 0, diamonds: 0, flowers: 0 };
}
