/**
 * 用户相关 API：奖励、签到、任务、六维分数、排行榜
 */
import { getApiUrl } from "@/lib/api-config";

/** 获取用户当地 IANA 时区（用于签到/任务“今日”判定），可供游戏启动等复用 */
export function getUserTimezone(): string {
  if (typeof Intl === "undefined" || !Intl.DateTimeFormat) return "UTC";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    "X-User-Timezone": getUserTimezone(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface RewardsData {
  coins: number;
  diamonds: number;
  check_in_dates: string[];
  has_checked_in_today: boolean;
  current_streak: number;
  daily_progress: Record<string, number>;
  monthly_progress: number;
  monthly_target: number;
  task_claimed_today: string[];
  monthly_claimed: boolean;
}

export interface CognitiveScoresData {
  memory: number;
  logic: number;
  focus: number;
  reaction: number;
  strategy: number;
  spatial: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  score: number;
}

/** 获取奖励与签到、任务状态 */
export async function fetchRewards(): Promise<RewardsData> {
  const res = await fetch(getApiUrl("/api/user/rewards"), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_rewards_failed");
  const json = await res.json();
  if (!json?.data) throw new Error("invalid_response");
  return json.data as RewardsData;
}

/** 签到 */
export async function postCheckIn(): Promise<{ coins: number; diamonds: number }> {
  const res = await fetch(getApiUrl("/api/user/check-in"), {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("check_in_failed");
  const json = await res.json();
  return json?.data ?? { coins: 0, diamonds: 0 };
}

/** 获取六维认知分数 */
export async function fetchCognitiveScores(): Promise<CognitiveScoresData> {
  const res = await fetch(getApiUrl("/api/user/cognitive-scores"), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_scores_failed");
  const json = await res.json();
  if (!json?.data) return { memory: 0, logic: 0, focus: 0, reaction: 0, strategy: 0, spatial: 0 };
  return json.data as CognitiveScoresData;
}

/** 更新六维分数（单维或全量，只传要更新的维度） */
export async function updateCognitiveScores(scores: Partial<CognitiveScoresData>): Promise<CognitiveScoresData> {
  const res = await fetch(getApiUrl("/api/user/cognitive-scores"), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(scores),
  });
  if (!res.ok) throw new Error("update_scores_failed");
  const json = await res.json();
  return json?.data as CognitiveScoresData;
}

/** 领取任务奖励 */
export async function claimTask(taskId: string): Promise<{ coins: number; diamonds: number }> {
  const res = await fetch(getApiUrl(`/api/user/tasks/claim?task_id=${encodeURIComponent(taskId)}`), {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "claim_failed");
  }
  const json = await res.json();
  return json?.data ?? { coins: 0, diamonds: 0 };
}

/** 排行榜 type=total|memory|logic|focus|reaction|strategy|spatial */
export async function fetchLeaderboard(type: string, limit = 50): Promise<LeaderboardEntry[]> {
  const res = await fetch(
    getApiUrl(`/api/leaderboard?type=${encodeURIComponent(type)}&limit=${limit}`),
    { headers: getAuthHeaders() }
  );
  if (!res.ok) throw new Error("fetch_leaderboard_failed");
  const json = await res.json();
  return (json?.data?.list ?? []) as LeaderboardEntry[];
}
