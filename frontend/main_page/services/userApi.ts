/**
 * 用户相关 API：奖励、签到、任务、六维分数、排行榜
 *
 * Auth is carried by the cross-subdomain HttpOnly cookie set on /api/auth/login.
 * The module-level `fetch` below shadows the global so every call here defaults
 * to `credentials: "include"` without touching call sites.
 */
import { getApiUrl } from "@/lib/api-config";

const fetch: typeof globalThis.fetch = (input, init) =>
  globalThis.fetch(input as RequestInfo, { ...init, credentials: "include" });

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
  return {
    "Content-Type": "application/json",
    "X-User-Timezone": getUserTimezone(),
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

export interface LearningTopicProgressData {
  subject_key: string;
  module_key: string;
  topic_key: string;
  total_questions: number;
  attempted_unique_questions: number;
  correct_unique_questions: number;
  progress_percent_attempted: number;
  progress_percent_correct: number;
  last_attempted_question_key: string | null;
  last_attempted_at: string | null;
  attempted_question_keys: string[];
}

export interface LearningModuleProgressData {
  subject_key: string;
  module_key: string;
  topics: LearningTopicProgressData[];
}

export interface LearningSubjectProgressModuleData {
  module_key: string;
  total_questions: number;
  attempted_unique_questions: number;
  correct_unique_questions: number;
  progress_percent_attempted: number;
  progress_percent_correct: number;
}

export interface LearningSubjectProgressData {
  subject_key: string;
  modules: LearningSubjectProgressModuleData[];
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

export interface MentalMathBundleAccessData {
  bundle_unlocked: boolean;
  access_badge: "premium" | "timed" | "full" | "none";
  days_left: number | null;
  expires_at: string | null;
  diamonds: number;
}

export async function fetchMentalMathBundleAccess(): Promise<MentalMathBundleAccessData> {
  const res = await fetch(getApiUrl("/api/user/learning/mental-math/bundle-access"), {
    headers: getAuthHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = json?.detail;
    const msg = typeof d === "string" ? d : "fetch_mental_math_bundle_access_failed";
    throw new Error(msg);
  }
  if (!json?.data) {
    throw new Error("fetch_mental_math_bundle_access_failed");
  }
  return json.data as MentalMathBundleAccessData;
}

export async function unlockMentalMathWithDiamonds(
  tier: "three_month" | "lifetime"
): Promise<MentalMathBundleAccessData> {
  const res = await fetch(getApiUrl("/api/user/learning/mental-math/unlock-with-diamonds"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ tier }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = json?.detail;
    const msg = typeof d === "string" ? d : Array.isArray(d) ? "validation_error" : "unlock_mental_math_failed";
    throw new Error(msg);
  }
  if (!json?.data) {
    throw new Error("unlock_mental_math_failed");
  }
  return json.data as MentalMathBundleAccessData;
}

export async function updateMembershipPlan(
  plan: "free" | "plus" | "premium",
  billingInterval: "monthly" | "annual" = "monthly"
): Promise<void> {
  const res = await fetch(getApiUrl("/api/user/membership"), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ plan, billing_interval: billingInterval }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const d = j?.detail;
    const msg = typeof d === "string" ? d : Array.isArray(d) ? "validation_error" : "update_membership_failed";
    throw new Error(msg);
  }
}

async function readApiErrorDetail(res: Response): Promise<string> {
  const j = await res.json().catch(() => ({}));
  const d = j?.detail;
  if (typeof d === "string") return d;
  return "request_failed";
}

/** Map FastAPI `detail` strings to membership i18n error keys (camelCase). */
export function membershipErrorKeyFromDetail(detail: string): string {
  switch (detail) {
    case "cancel_via_billing_portal":
      return "cancelViaPortal";
    case "stripe_not_configured":
    case "stripe_price_not_configured":
    case "stripe_webhook_not_configured":
      return "stripeNotConfigured";
    case "already_has_active_subscription":
      return "alreadySubscribed";
    case "stripe_customer_missing":
      return "portalFailed";
    case "checkout_failed":
      return "checkoutFailed";
    case "portal_failed":
      return "portalFailed";
    case "update_membership_failed":
    case "validation_error":
      return "saveFailed";
    default:
      return "generic";
  }
}

export async function createStripeCheckoutSession(params: {
  plan: "plus" | "premium";
  billing_interval: "monthly" | "annual";
  locale: string;
}): Promise<string> {
  const res = await fetch(getApiUrl("/api/billing/checkout-session"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorDetail(res));
  }
  const json = (await res.json()) as { data?: { url?: string } };
  const url = json?.data?.url;
  if (!url) throw new Error("checkout_failed");
  return url;
}

export async function createStripeBillingPortalSession(locale: string): Promise<string> {
  const res = await fetch(getApiUrl("/api/billing/portal-session"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ locale }),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorDetail(res));
  }
  const json = (await res.json()) as { data?: { url?: string } };
  const url = json?.data?.url;
  if (!url) throw new Error("portal_failed");
  return url;
}

export async function fetchBillingStatus(): Promise<{
  checkout_enabled: boolean;
  portal_enabled: boolean;
  has_stripe_subscription: boolean;
}> {
  const res = await fetch(getApiUrl("/api/billing/status"), { headers: getAuthHeaders() });
  if (!res.ok) {
    return { checkout_enabled: false, portal_enabled: false, has_stripe_subscription: false };
  }
  const json = (await res.json()) as {
    data?: { checkout_enabled?: boolean; portal_enabled?: boolean; has_stripe_subscription?: boolean };
  };
  const d = json?.data ?? {};
  return {
    checkout_enabled: Boolean(d.checkout_enabled),
    portal_enabled: Boolean(d.portal_enabled),
    has_stripe_subscription: Boolean(d.has_stripe_subscription),
  };
}

export interface AuthMeMembership {
  membership_plan: string;
  membership_expires_at: string | null;
  membership_billing_interval: string | null;
  stripe_subscription_id: string | null;
}

export async function fetchAuthMeMembership(): Promise<AuthMeMembership> {
  const res = await fetch(getApiUrl("/api/auth/me"), { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error("fetch_auth_me_failed");
  }
  const json = await res.json();
  return {
    membership_plan: (json?.membership_plan as string) ?? "free",
    membership_expires_at: (json?.membership_expires_at as string | null) ?? null,
    membership_billing_interval: (json?.membership_billing_interval as string | null) ?? null,
    stripe_subscription_id: (json?.stripe_subscription_id as string | null) ?? null,
  };
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

export async function fetchLearningModuleProgress(
  subjectKey: string,
  moduleKey: string
): Promise<LearningModuleProgressData> {
  const params = new URLSearchParams({
    subject_key: subjectKey,
    module_key: moduleKey,
  });
  const res = await fetch(getApiUrl(`/api/user/learning/progress/module?${params.toString()}`), {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "fetch_learning_module_progress_failed");
  }
  const json = await res.json();
  if (!json?.data) {
    throw new Error("fetch_learning_module_progress_failed");
  }
  return json.data as LearningModuleProgressData;
}

export async function recordLearningQuestionAttempt(payload: {
  subject_key: string;
  module_key: string;
  topic_key: string;
  question_key: string;
  total_questions: number;
  is_correct: boolean;
}): Promise<LearningTopicProgressData> {
  const res = await fetch(getApiUrl("/api/user/learning/progress/question-attempt"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "record_learning_question_attempt_failed");
  }
  const json = await res.json();
  if (!json?.data) {
    throw new Error("record_learning_question_attempt_failed");
  }
  return json.data as LearningTopicProgressData;
}

export async function fetchLearningSubjectProgress(subjectKey: string): Promise<LearningSubjectProgressData> {
  const params = new URLSearchParams({
    subject_key: subjectKey,
  });
  const res = await fetch(getApiUrl(`/api/user/learning/progress/subject?${params.toString()}`), {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "fetch_learning_subject_progress_failed");
  }
  const json = await res.json();
  if (!json?.data) {
    throw new Error("fetch_learning_subject_progress_failed");
  }
  return json.data as LearningSubjectProgressData;
}
