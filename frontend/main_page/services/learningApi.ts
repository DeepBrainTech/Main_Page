import { credentialedFetch, getApiUrl, getAuthHeaders } from "@/services/apiClient";

export interface MakingWholeSecretMediaResponse {
  secret_key: string;
  urls: string[];
}

export interface MakingWholeQuestionVideoResponse {
  secret_key: string;
  question_number: number;
  url: string;
}

export interface MentalMathBundleAccessData {
  bundle_unlocked: boolean;
  access_badge: "premium" | "timed" | "full" | "none";
  days_left: number | null;
  expires_at: string | null;
  diamonds: number;
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

export async function fetchMakingWholeSecretMedia(secretKey: string): Promise<MakingWholeSecretMediaResponse> {
  const res = await credentialedFetch(
    getApiUrl(`/api/user/learning/mental-math/making-whole/secret-media?secret_key=${encodeURIComponent(secretKey)}`),
    { headers: getAuthHeaders() },
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "fetch_secret_media_failed");
  }
  const json = await res.json();
  if (!json?.data) throw new Error("fetch_secret_media_failed");
  return json.data as MakingWholeSecretMediaResponse;
}

export async function fetchMentalMathBundleAccess(): Promise<MentalMathBundleAccessData> {
  const res = await credentialedFetch(getApiUrl("/api/user/learning/mental-math/bundle-access"), {
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
  tier: "three_month" | "lifetime",
): Promise<MentalMathBundleAccessData> {
  const res = await credentialedFetch(getApiUrl("/api/user/learning/mental-math/unlock-with-diamonds"), {
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

export async function fetchMakingWholeQuestionVideo(
  secretKey: string,
  questionNumber: number,
): Promise<MakingWholeQuestionVideoResponse> {
  const params = new URLSearchParams({
    secret_key: secretKey,
    question_number: String(questionNumber),
  });
  const res = await credentialedFetch(
    getApiUrl(`/api/user/learning/mental-math/making-whole/question-video?${params.toString()}`),
    { headers: getAuthHeaders() },
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "fetch_question_video_failed");
  }
  const json = await res.json();
  if (!json?.data) throw new Error("fetch_question_video_failed");
  return json.data as MakingWholeQuestionVideoResponse;
}

export async function fetchLearningModuleProgress(
  subjectKey: string,
  moduleKey: string,
): Promise<LearningModuleProgressData> {
  const params = new URLSearchParams({
    subject_key: subjectKey,
    module_key: moduleKey,
  });
  const res = await credentialedFetch(getApiUrl(`/api/user/learning/progress/module?${params.toString()}`), {
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
  const res = await credentialedFetch(getApiUrl("/api/user/learning/progress/question-attempt"), {
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
  const res = await credentialedFetch(getApiUrl(`/api/user/learning/progress/subject?${params.toString()}`), {
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
