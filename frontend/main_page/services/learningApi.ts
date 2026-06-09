import { credentialedFetch, getApiUrl, getAuthHeaders } from "@/services/apiClient";

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

export interface LearningQuestionAttemptData {
  question_key: string;
  user_answer: string | null;
  is_correct: boolean;
  time_spent_seconds: number;
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
  has_practice_report?: boolean;
  question_attempts?: LearningQuestionAttemptData[];
}

export interface LearningPracticeReportAnswerData {
  topic_key: string;
  question_text: string;
  user_answer: string | null;
  correct_answer: string | null;
  is_correct: boolean;
  is_timeout: boolean;
  time_spent_ms: number;
}

export interface LearningPracticeReportData {
  id?: number;
  subject_key: string;
  module_key: string;
  topic_key: string;
  accuracy: number;
  correct_count: number;
  total_questions: number;
  duration_seconds: number;
  attempt_number: number;
  finished_at: string | null;
  answers: LearningPracticeReportAnswerData[];
}

export interface LearningPracticeReportSummaryData {
  id: number;
  subject_key: string;
  module_key: string;
  topic_key: string;
  accuracy: number;
  correct_count: number;
  total_questions: number;
  duration_seconds: number;
  attempt_number: number;
  finished_at: string | null;
}

export interface LearningModuleProgressData {
  subject_key: string;
  module_key: string;
  practice_report_topic_keys?: string[];
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

export interface LearningStudyTimeData {
  subject_key: string;
  total_seconds: number;
  total_hours: number;
  last_recorded_at: string | null;
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
  user_answer?: string;
  time_spent_seconds?: number;
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

export async function resetLearningTopicProgress(payload: {
  subject_key: string;
  module_key: string;
  topic_key: string;
  total_questions: number;
}): Promise<LearningTopicProgressData> {
  const res = await credentialedFetch(getApiUrl("/api/user/learning/progress/topic-reset"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "reset_learning_topic_progress_failed");
  }
  const json = await res.json();
  if (!json?.data) {
    throw new Error("reset_learning_topic_progress_failed");
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

export async function upsertLearningPracticeReport(payload: {
  subject_key: string;
  module_key: string;
  topic_key: string;
  accuracy: number;
  correct_count: number;
  total_questions: number;
  duration_seconds: number;
  attempt_number: number;
  answers: LearningPracticeReportAnswerData[];
}): Promise<LearningPracticeReportData> {
  const res = await credentialedFetch(getApiUrl("/api/user/learning/progress/practice-report"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "upsert_learning_practice_report_failed");
  }
  const json = await res.json();
  if (!json?.data) {
    throw new Error("upsert_learning_practice_report_failed");
  }
  return json.data as LearningPracticeReportData;
}

export async function fetchLearningPracticeReport(
  subjectKey: string,
  moduleKey: string,
  topicKey: string,
): Promise<LearningPracticeReportData | null> {
  const params = new URLSearchParams({
    subject_key: subjectKey,
    module_key: moduleKey,
    topic_key: topicKey,
  });
  const res = await credentialedFetch(getApiUrl(`/api/user/learning/progress/practice-report?${params.toString()}`), {
    headers: getAuthHeaders(),
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "fetch_learning_practice_report_failed");
  }
  const json = await res.json();
  if (!json?.data) {
    throw new Error("fetch_learning_practice_report_failed");
  }
  return json.data as LearningPracticeReportData;
}

export async function fetchLearningPracticeReportHistory(
  subjectKey: string,
  moduleKey: string,
  topicKey: string,
  limit = 50,
  offset = 0,
): Promise<{ total: number; list: LearningPracticeReportSummaryData[] }> {
  const params = new URLSearchParams({
    subject_key: subjectKey,
    module_key: moduleKey,
    topic_key: topicKey,
    limit: String(limit),
    offset: String(offset),
  });
  const res = await credentialedFetch(
    getApiUrl(`/api/user/learning/progress/practice-report/history?${params.toString()}`),
    { headers: getAuthHeaders() },
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "fetch_learning_practice_report_history_failed");
  }
  const json = await res.json();
  return {
    total: json?.data?.total ?? 0,
    list: (json?.data?.list ?? []) as LearningPracticeReportSummaryData[],
  };
}

export async function fetchLearningPracticeReportById(reportId: number): Promise<LearningPracticeReportData> {
  const res = await credentialedFetch(
    getApiUrl(`/api/user/learning/progress/practice-report/by-id/${reportId}`),
    { headers: getAuthHeaders() },
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "fetch_learning_practice_report_by_id_failed");
  }
  const json = await res.json();
  if (!json?.data) {
    throw new Error("fetch_learning_practice_report_by_id_failed");
  }
  return json.data as LearningPracticeReportData;
}

export async function fetchLearningStudyTime(subjectKey: string): Promise<LearningStudyTimeData> {
  const params = new URLSearchParams({
    subject_key: subjectKey,
  });
  const res = await credentialedFetch(getApiUrl(`/api/user/learning/study-time?${params.toString()}`), {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "fetch_learning_study_time_failed");
  }
  const json = await res.json();
  if (!json?.data) {
    throw new Error("fetch_learning_study_time_failed");
  }
  return json.data as LearningStudyTimeData;
}

export async function recordLearningStudyTime(
  subjectKey: string,
  durationSeconds: number,
): Promise<LearningStudyTimeData> {
  const res = await credentialedFetch(getApiUrl("/api/user/learning/study-time/session"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      subject_key: subjectKey,
      duration_seconds: durationSeconds,
    }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail ?? "record_learning_study_time_failed");
  }
  const json = await res.json();
  if (!json?.data) {
    throw new Error("record_learning_study_time_failed");
  }
  return json.data as LearningStudyTimeData;
}
