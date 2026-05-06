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
  flowers: number;
  check_in_dates: string[];
  has_checked_in_today: boolean;
  current_streak: number;
  daily_progress: Record<string, number>;
  monthly_progress: number;
  monthly_target: number;
  task_claimed_today: string[];
  monthly_claimed: boolean;
  /** Distinct games opened (from user_game_played only; unrelated to rewards). */
  played_game_count?: number;
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

export interface GameLikeState {
  game_key: string;
  like_count: number;
  liked_by_me: boolean;
}

export interface MakingWholeSecretMediaResponse {
  secret_key: string;
  urls: string[];
}

export interface MakingWholeQuestionVideoResponse {
  secret_key: string;
  question_number: number;
  url: string;
}

export interface CurrentUserProfile {
  username: string;
}

export interface AssessmentTopicStatPayload {
  topic_key: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface AssessmentAnswerPayload {
  topic_key: string;
  question_text: string;
  user_answer: string | null;
  correct_answer: string | null;
  is_correct: boolean;
  is_timeout: boolean;
  time_spent_ms: number;
}

export interface AssessmentSessionPayload {
  subject: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  total_questions: number;
  correct_count: number;
  accuracy: number;
  strongest_area: string | null;
  weakest_area: string | null;
  topic_stats: AssessmentTopicStatPayload[];
  answers: AssessmentAnswerPayload[];
}

export interface AssessmentSessionSummary {
  id: number;
  subject: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  total_questions: number;
  correct_count: number;
  accuracy: number;
  strongest_area: string | null;
  weakest_area: string | null;
  topic_stats: AssessmentTopicStatPayload[];
}

export interface AssessmentSessionDetail extends AssessmentSessionSummary {
  answers: AssessmentAnswerPayload[];
}

export interface AssessmentCompareResult {
  base_session_id: number;
  target_session_id: number;
  accuracy_delta: number;
  duration_seconds_delta: number;
  correct_count_delta: number;
  topic_deltas: Array<{
    topic_key: string;
    base_accuracy: number;
    target_accuracy: number;
    delta_accuracy: number;
  }>;
  base: AssessmentSessionSummary;
  target: AssessmentSessionSummary;
}

export interface AssessmentTrendPoint {
  session_id: number;
  finished_at: string;
  accuracy: number;
  duration_seconds: number;
}

/** 获取奖励与签到、任务状态 */
export async function fetchRewards(): Promise<RewardsData> {
  const res = await fetch(getApiUrl("/api/user/rewards"), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_rewards_failed");
  const json = await res.json();
  if (!json?.data) throw new Error("invalid_response");
  return json.data as RewardsData;
}

/** Record that the user opened a game from the portal (counts each game at most once). */
export async function postGamePlayedRecord(gameKey: string): Promise<{
  played_game_count: number;
  is_new: boolean;
}> {
  const res = await fetch(getApiUrl("/api/games/play-record"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ game_key: gameKey }),
  });
  if (!res.ok) throw new Error("play_record_failed");
  const json = await res.json();
  if (!json?.success || !json?.data) throw new Error("invalid_response");
  return json.data as { played_game_count: number; is_new: boolean };
}

/** 签到 */
export async function postCheckIn(): Promise<{ coins: number; diamonds: number; flowers: number }> {
  const res = await fetch(getApiUrl("/api/user/check-in"), {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("check_in_failed");
  const json = await res.json();
  return json?.data ?? { coins: 0, diamonds: 0, flowers: 0 };
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
export async function claimTask(taskId: string): Promise<{ coins: number; diamonds: number; flowers: number }> {
  const res = await fetch(getApiUrl(`/api/user/tasks/claim?task_id=${encodeURIComponent(taskId)}`), {
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

/** 获取统一资产余额（金币/钻石/鲜花） */
export async function fetchAssets(): Promise<{ coins: number; diamonds: number; flowers: number }> {
  const res = await fetch(getApiUrl("/api/user/assets"), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_assets_failed");
  const json = await res.json();
  return json?.data ?? { coins: 0, diamonds: 0, flowers: 0 };
}

/** 道具兑换 */
export async function fetchShopItems(gameMode?: string): Promise<Record<string, {
  name: string;
  games: string[];
  cost: { coins: number; diamonds: number; flowers: number };
}>> {
  const query = new URLSearchParams();
  if (gameMode) query.set("game_mode", gameMode);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(getApiUrl(`/api/user/shop/items${suffix}`), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_shop_items_failed");
  const json = await res.json();
  return (json?.data?.items ?? {}) as Record<string, {
    name: string;
    games: string[];
    cost: { coins: number; diamonds: number; flowers: number };
  }>;
}

/** 获取道具背包 */
export async function fetchShopInventory(): Promise<Array<{ item_id: string; quantity: number }>> {
  const res = await fetch(getApiUrl("/api/user/shop/inventory"), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_inventory_failed");
  const json = await res.json();
  return (json?.data?.items ?? []) as Array<{ item_id: string; quantity: number }>;
}

/** 道具兑换 */
export async function redeemShopItem(itemId: string, gameMode?: string): Promise<{
  item_id: string;
  item_name: string;
  games: string[];
  game_mode: string | null;
  cost: { coins: number; diamonds: number; flowers: number };
  inventory_quantity: number;
  assets: { coins: number; diamonds: number; flowers: number };
}> {
  const query = new URLSearchParams({ item_id: itemId });
  if (gameMode) query.set("game_mode", gameMode);
  const res = await fetch(getApiUrl(`/api/user/shop/redeem?${query.toString()}`), {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "redeem_failed");
  }
  const json = await res.json();
  if (!json?.data) throw new Error("redeem_failed");
  return json.data;
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

export async function fetchGameLikes(): Promise<GameLikeState[]> {
  const res = await fetch(getApiUrl("/api/games/likes"), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_game_likes_failed");
  const json = await res.json();
  return (json?.data?.likes ?? []) as GameLikeState[];
}

export async function likeGame(gameKey: string): Promise<GameLikeState[]> {
  const res = await fetch(getApiUrl(`/api/games/likes/${encodeURIComponent(gameKey)}`), {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("like_game_failed");
  const json = await res.json();
  return (json?.data?.likes ?? []) as GameLikeState[];
}

export async function unlikeGame(gameKey: string): Promise<GameLikeState[]> {
  const res = await fetch(getApiUrl(`/api/games/likes/${encodeURIComponent(gameKey)}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("unlike_game_failed");
  const json = await res.json();
  return (json?.data?.likes ?? []) as GameLikeState[];
}

/** 获取 Making Whole 指定 secret 的私有图片签名地址 */
export async function fetchMakingWholeSecretMedia(secretKey: string): Promise<MakingWholeSecretMediaResponse> {
  const res = await fetch(
    getApiUrl(`/api/user/learning/mental-math/making-whole/secret-media?secret_key=${encodeURIComponent(secretKey)}`),
    { headers: getAuthHeaders() }
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "fetch_secret_media_failed");
  }
  const json = await res.json();
  if (!json?.data) throw new Error("fetch_secret_media_failed");
  return json.data as MakingWholeSecretMediaResponse;
}

export async function fetchMakingWholeQuestionVideo(
  secretKey: string,
  questionNumber: number
): Promise<MakingWholeQuestionVideoResponse> {
  const params = new URLSearchParams({
    secret_key: secretKey,
    question_number: String(questionNumber),
  });
  const res = await fetch(
    getApiUrl(`/api/user/learning/mental-math/making-whole/question-video?${params.toString()}`),
    { headers: getAuthHeaders() }
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "fetch_question_video_failed");
  }
  const json = await res.json();
  if (!json?.data) throw new Error("fetch_question_video_failed");
  return json.data as MakingWholeQuestionVideoResponse;
}

/** 获取当前登录用户基础信息 */
export async function fetchCurrentUserProfile(): Promise<CurrentUserProfile> {
  const res = await fetch(getApiUrl("/api/auth/me"), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_current_user_failed");
  const json = await res.json();
  if (!json?.username) {
    throw new Error("fetch_current_user_failed");
  }
  return { username: json.username as string };
}

export async function createAssessmentSession(payload: AssessmentSessionPayload): Promise<{ session_id: number }> {
  const res = await fetch(getApiUrl("/api/user/assessments"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "create_assessment_failed");
  }
  const json = await res.json();
  if (!json?.data?.session_id) throw new Error("create_assessment_failed");
  return json.data as { session_id: number };
}

export async function fetchAssessmentHistory(subject = "mental-math", limit = 50, offset = 0): Promise<{
  total: number;
  list: AssessmentSessionSummary[];
}> {
  const params = new URLSearchParams({
    subject,
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(getApiUrl(`/api/user/assessments?${params.toString()}`), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("fetch_assessment_history_failed");
  const json = await res.json();
  return {
    total: json?.data?.total ?? 0,
    list: (json?.data?.list ?? []) as AssessmentSessionSummary[],
  };
}

export async function fetchAssessmentDetail(sessionId: number): Promise<AssessmentSessionDetail> {
  const res = await fetch(getApiUrl(`/api/user/assessments/${sessionId}`), { headers: getAuthHeaders() });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "fetch_assessment_detail_failed");
  }
  const json = await res.json();
  if (!json?.data) throw new Error("fetch_assessment_detail_failed");
  return json.data as AssessmentSessionDetail;
}

export async function compareAssessmentSessions(
  sessionId: number,
  targetSessionId?: number
): Promise<AssessmentCompareResult> {
  const suffix = targetSessionId ? `?target_session_id=${encodeURIComponent(String(targetSessionId))}` : "";
  const res = await fetch(getApiUrl(`/api/user/assessments/${sessionId}/compare${suffix}`), { headers: getAuthHeaders() });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "compare_assessment_failed");
  }
  const json = await res.json();
  if (!json?.data) throw new Error("compare_assessment_failed");
  return json.data as AssessmentCompareResult;
}

export async function fetchAssessmentTrend(subject = "mental-math", limit = 20): Promise<AssessmentTrendPoint[]> {
  const safeLimit = Math.max(2, Math.min(100, limit));
  const params = new URLSearchParams({
    subject,
    limit: String(safeLimit),
  });
  const headers = getAuthHeaders();
  const primary = await fetch(getApiUrl(`/api/user/assessment-trend?${params.toString()}`), {
    headers,
  });
  if (primary.ok) {
    const json = await primary.json();
    return (json?.data?.points ?? []) as AssessmentTrendPoint[];
  }

  const fallback = await fetch(getApiUrl(`/api/user/assessments/history/trend?${params.toString()}`), {
    headers,
  });
  if (!fallback.ok) throw new Error("fetch_assessment_trend_failed");
  const json = await fallback.json();
  return (json?.data?.points ?? []) as AssessmentTrendPoint[];
}
