/**
 * Server-side persisted progress for mental math practice.
 * Progress is keyed by lesson module and secret topic.
 * Attempts are applied optimistically in memory and flushed to the server in batches.
 */
import { MENTAL_MATH_LESSONS, getMentalMathLesson, getMentalMathSecret } from "@/config/mental-math/catalog";
import { getApiUrl, getAuthHeaders } from "@/services/apiClient";
import type { LearningPracticeReportData, LearningTopicProgressData } from "@/services/learningApi";
import {
  fetchLearningModuleProgress,
  fetchLearningPracticeReport,
  fetchLearningPracticeReportById,
  fetchLearningPracticeReportHistory,
  recordLearningQuestionAttempt,
  resetLearningTopicProgress,
  upsertLearningPracticeReport,
} from "@/services/userApi";

type QuestionAttemptCache = {
  userAnswer: string;
  isCorrect: boolean;
  questionDurationSeconds: number;
};

type SecretCache = {
  totalQuestions: number;
  attemptedQuestionIds: Set<string>;
  attemptedUniqueQuestions: number;
  progressPercentAttempted: number;
  questionAttempts: Map<string, QuestionAttemptCache>;
  hasPracticeReport: boolean;
};

export type SavedQuestionAttempt = {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  questionDurationSeconds: number;
};

export type PersistedSecretPracticeReport = {
  id?: number;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  attemptNumber: number;
  finishedAt?: string | null;
  answers: Array<{
    topic_key: string;
    question_text: string;
    user_answer: string | null;
    correct_answer: string | null;
    is_correct: boolean;
    is_timeout: boolean;
    time_spent_ms: number;
  }>;
};

export type PracticeReportHistorySummary = {
  id: number;
  attemptNumber: number;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  finishedAt: string | null;
};

type PendingAttempt = {
  lessonKey: string;
  secretKey: string;
  questionId: string;
  totalQuestions: number;
  isCorrect: boolean;
  userAnswer: string;
  timeSpentSeconds: number;
};

const SUBJECT_KEY = "mental_math";
const DEFAULT_LESSON_KEY = "lesson1";
const FLUSH_DEBOUNCE_MS = 8000;

const secretCache = new Map<string, SecretCache>();
const practiceReportCache = new Map<string, PersistedSecretPracticeReport>();
const practiceReportTopicKeysByLesson = new Map<string, Set<string>>();
const lessonProgressCache = new Map<string, number>();
const loadingPromises = new Map<string, Promise<void>>();
const pendingAttempts = new Map<string, PendingAttempt>();
let clientVersion = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushPromise: Promise<void> | null = null;
let lifecycleListenersBound = false;

function cacheKey(lessonKey: string, secretKey: string): string {
  return `${lessonKey}.${secretKey}`;
}

function mapServerPracticeReport(data: LearningPracticeReportData): PersistedSecretPracticeReport {
  return {
    id: data.id,
    accuracy: data.accuracy,
    correctCount: data.correct_count,
    totalQuestions: data.total_questions,
    durationSeconds: data.duration_seconds,
    attemptNumber: data.attempt_number,
    finishedAt: data.finished_at,
    answers: data.answers,
  };
}

function mapServerPracticeReportSummary(data: {
  id: number;
  attempt_number: number;
  accuracy: number;
  correct_count: number;
  total_questions: number;
  duration_seconds: number;
  finished_at: string | null;
}): PracticeReportHistorySummary {
  return {
    id: data.id,
    attemptNumber: data.attempt_number,
    accuracy: data.accuracy,
    correctCount: data.correct_count,
    totalQuestions: data.total_questions,
    durationSeconds: data.duration_seconds,
    finishedAt: data.finished_at,
  };
}

function toPracticeReportPayload(
  lessonKey: string,
  secretKey: string,
  report: PersistedSecretPracticeReport
) {
  return {
    subject_key: SUBJECT_KEY,
    module_key: lessonKey,
    topic_key: secretKey,
    accuracy: report.accuracy,
    correct_count: report.correctCount,
    total_questions: report.totalQuestions,
    duration_seconds: report.durationSeconds,
    attempt_number: report.attemptNumber,
    answers: report.answers,
  };
}

function markSecretHasPracticeReport(lessonKey: string, secretKey: string): void {
  ensureBaseCache();
  let topicKeys = practiceReportTopicKeysByLesson.get(lessonKey);
  if (!topicKeys) {
    topicKeys = new Set<string>();
    practiceReportTopicKeysByLesson.set(lessonKey, topicKeys);
  }
  topicKeys.add(secretKey);

  const key = cacheKey(lessonKey, secretKey);
  const existing = secretCache.get(key);
  if (existing && !existing.hasPracticeReport) {
    secretCache.set(key, { ...existing, hasPracticeReport: true });
  }
}

function syncPracticeReportFlagsForLesson(lessonKey: string, reportTopicKeys: string[] = []): void {
  ensureBaseCache();
  const lesson = getMentalMathLesson(lessonKey);
  if (!lesson) {
    return;
  }
  const merged = new Set(practiceReportTopicKeysByLesson.get(lessonKey) ?? []);
  reportTopicKeys.forEach((topicKey) => merged.add(topicKey));
  practiceReportTopicKeysByLesson.set(lessonKey, merged);

  lesson.secrets.forEach((secret) => {
    const key = cacheKey(lessonKey, secret.key);
    const existing = secretCache.get(key);
    if (!existing) {
      return;
    }
    const hasReport =
      merged.has(secret.key) || practiceReportCache.has(key) || existing.hasPracticeReport;
    if (!existing.hasPracticeReport && hasReport) {
      secretCache.set(key, { ...existing, hasPracticeReport: true });
    }
  });
}

function pendingAttemptKey(lessonKey: string, secretKey: string, questionId: string): string {
  return `${lessonKey}.${secretKey}.${questionId}`;
}

function toSecretProgressPercent(attemptedUniqueQuestions: number, totalQuestions: number): number {
  if (totalQuestions <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((attemptedUniqueQuestions / totalQuestions) * 100));
}

function buildQuestionAttemptsMap(
  questionAttempts?: Array<{
    question_key: string;
    user_answer: string | null;
    is_correct: boolean;
    time_spent_seconds: number;
  }>
): Map<string, QuestionAttemptCache> {
  const map = new Map<string, QuestionAttemptCache>();
  for (const row of questionAttempts ?? []) {
    if (!row.question_key) {
      continue;
    }
    map.set(row.question_key, {
      userAnswer: row.user_answer ?? "",
      isCorrect: row.is_correct,
      questionDurationSeconds: row.time_spent_seconds ?? 0,
    });
  }
  return map;
}

function applyServerTopicResult(
  lessonKey: string,
  secretKey: string,
  fallbackTotalQuestions: number,
  topicResult: LearningTopicProgressData
): void {
  const key = cacheKey(lessonKey, secretKey);
  const existing = secretCache.get(key);
  const questionAttempts = buildQuestionAttemptsMap(topicResult.question_attempts);
  secretCache.set(key, {
    totalQuestions: topicResult.total_questions || fallbackTotalQuestions,
    attemptedQuestionIds: new Set(topicResult.attempted_question_keys ?? []),
    attemptedUniqueQuestions: topicResult.attempted_unique_questions ?? 0,
    progressPercentAttempted: topicResult.progress_percent_attempted ?? 0,
    questionAttempts,
    hasPracticeReport:
      Boolean(topicResult.has_practice_report) ||
      Boolean(existing?.hasPracticeReport) ||
      practiceReportCache.has(key) ||
      Boolean(practiceReportTopicKeysByLesson.get(lessonKey)?.has(secretKey)),
  });
  lessonProgressCache.set(lessonKey, getLessonProgressFromSecretCache(lessonKey));
}

function applyOptimisticAttempt(
  lessonKey: string,
  secretKey: string,
  questionId: string,
  totalQuestions: number,
  userAnswer: string,
  isCorrect: boolean,
  questionDurationSeconds: number
): void {
  const key = cacheKey(lessonKey, secretKey);
  const existing = secretCache.get(key);
  if (!existing) {
    return;
  }
  const attemptedQuestionIds = new Set(existing.attemptedQuestionIds);
  const questionAttempts = new Map(existing.questionAttempts);
  questionAttempts.set(questionId, { userAnswer, isCorrect, questionDurationSeconds });
  if (!attemptedQuestionIds.has(questionId)) {
    attemptedQuestionIds.add(questionId);
  }
  const attemptedUniqueQuestions = attemptedQuestionIds.size;
  secretCache.set(key, {
    totalQuestions: existing.totalQuestions || totalQuestions,
    attemptedQuestionIds,
    attemptedUniqueQuestions,
    progressPercentAttempted: toSecretProgressPercent(attemptedUniqueQuestions, existing.totalQuestions || totalQuestions),
    questionAttempts,
    hasPracticeReport: existing.hasPracticeReport,
  });
  lessonProgressCache.set(lessonKey, getLessonProgressFromSecretCache(lessonKey));
  bumpPracticeProgressVersion();
}

function clearPendingForTopic(lessonKey: string, secretKey: string): void {
  for (const key of pendingAttempts.keys()) {
    if (key.startsWith(`${lessonKey}.${secretKey}.`)) {
      pendingAttempts.delete(key);
    }
  }
}

function clearFlushTimer(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function scheduleFlush(): void {
  if (typeof window === "undefined" || pendingAttempts.size === 0) {
    return;
  }
  clearFlushTimer();
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushMentalMathPracticeProgress();
  }, FLUSH_DEBOUNCE_MS);
}

function sendAttemptKeepalive(attempt: PendingAttempt): void {
  if (typeof window === "undefined") {
    return;
  }
  void fetch(getApiUrl("/api/user/learning/progress/question-attempt"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      subject_key: SUBJECT_KEY,
      module_key: attempt.lessonKey,
      topic_key: attempt.secretKey,
      question_key: attempt.questionId,
      total_questions: attempt.totalQuestions,
      is_correct: attempt.isCorrect,
      user_answer: attempt.userAnswer,
      time_spent_seconds: attempt.timeSpentSeconds,
    }),
    credentials: "include",
    keepalive: true,
  });
}

function bindLifecycleListeners(): void {
  if (typeof window === "undefined" || lifecycleListenersBound) {
    return;
  }
  lifecycleListenersBound = true;
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void flushMentalMathPracticeProgress();
    }
  });
  window.addEventListener("pagehide", () => {
    flushMentalMathPracticeProgressKeepalive();
  });
}

function flushMentalMathPracticeProgressKeepalive(): void {
  if (pendingAttempts.size === 0) {
    return;
  }
  const batch = Array.from(pendingAttempts.values());
  pendingAttempts.clear();
  clearFlushTimer();
  batch.forEach(sendAttemptKeepalive);
}

async function persistPendingAttempt(attempt: PendingAttempt): Promise<void> {
  const topicResult = await recordLearningQuestionAttempt({
    subject_key: SUBJECT_KEY,
    module_key: attempt.lessonKey,
    topic_key: attempt.secretKey,
    question_key: attempt.questionId,
    total_questions: attempt.totalQuestions,
    is_correct: attempt.isCorrect,
    user_answer: attempt.userAnswer,
    time_spent_seconds: attempt.timeSpentSeconds,
  });
  applyServerTopicResult(attempt.lessonKey, attempt.secretKey, attempt.totalQuestions, topicResult);
  bumpPracticeProgressVersion();
}

export async function flushMentalMathPracticeProgress(): Promise<void> {
  if (flushPromise) {
    await flushPromise;
    if (pendingAttempts.size > 0) {
      return flushMentalMathPracticeProgress();
    }
    return;
  }
  if (pendingAttempts.size === 0) {
    return;
  }

  clearFlushTimer();
  const batch = Array.from(pendingAttempts.values());
  pendingAttempts.clear();

  flushPromise = (async () => {
    for (const attempt of batch) {
      try {
        await persistPendingAttempt(attempt);
      } catch {
        const key = pendingAttemptKey(attempt.lessonKey, attempt.secretKey, attempt.questionId);
        const existing = pendingAttempts.get(key);
        pendingAttempts.set(key, existing ?? attempt);
      }
    }
  })().finally(() => {
    flushPromise = null;
  });

  await flushPromise;
  if (pendingAttempts.size > 0) {
    scheduleFlush();
  }
}

function ensureBaseCache() {
  MENTAL_MATH_LESSONS.forEach((lesson) => {
    lesson.secrets.forEach((secret) => {
      const key = cacheKey(lesson.key, secret.key);
      if (!secretCache.has(key)) {
        secretCache.set(key, {
          totalQuestions: secret.questions.length,
          attemptedQuestionIds: new Set<string>(),
          attemptedUniqueQuestions: 0,
          progressPercentAttempted: 0,
          questionAttempts: new Map<string, QuestionAttemptCache>(),
          hasPracticeReport: false,
        });
      }
    });
  });
}

ensureBaseCache();

export function bumpPracticeProgressVersion() {
  clientVersion += 1;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("learning-practice-progress"));
  }
}

export function subscribePracticeProgress(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => onChange();
  window.addEventListener("learning-practice-progress", handler);
  return () => window.removeEventListener("learning-practice-progress", handler);
}

export async function refreshMentalMathLessonProgress(lessonKey?: string): Promise<void> {
  ensureBaseCache();
  if (lessonKey) {
    await refreshLessonProgress(lessonKey);
    return;
  }
  await Promise.all(MENTAL_MATH_LESSONS.map((lesson) => refreshLessonProgress(lesson.key)));
}

export async function refreshLessonProgress(lessonKey: string): Promise<void> {
  if (!loadingPromises.has(lessonKey)) {
    loadingPromises.set(
      lessonKey,
      (async () => {
        ensureBaseCache();
        const lesson = getMentalMathLesson(lessonKey);
        if (!lesson) {
          return;
        }
        const result = await fetchLearningModuleProgress(SUBJECT_KEY, lessonKey);
        const reportTopicKeys = new Set(result.practice_report_topic_keys ?? []);
        result.topics.forEach((topic) => {
          const secret = getMentalMathSecret(lessonKey, topic.topic_key);
          if (!secret) {
            return;
          }
          const key = cacheKey(lessonKey, secret.key);
          const existing = secretCache.get(key);
          secretCache.set(key, {
            totalQuestions: topic.total_questions || secret.questions.length,
            attemptedQuestionIds: new Set(topic.attempted_question_keys ?? []),
            attemptedUniqueQuestions: topic.attempted_unique_questions ?? 0,
            progressPercentAttempted: topic.progress_percent_attempted ?? 0,
            questionAttempts: buildQuestionAttemptsMap(topic.question_attempts),
            hasPracticeReport:
              Boolean(topic.has_practice_report) ||
              reportTopicKeys.has(secret.key) ||
              existing?.hasPracticeReport ||
              practiceReportCache.has(key),
          });
        });
        syncPracticeReportFlagsForLesson(lessonKey, result.practice_report_topic_keys ?? []);
        lessonProgressCache.set(lessonKey, getLessonProgressFromSecretCache(lessonKey));
        bumpPracticeProgressVersion();
      })()
        .catch(() => {})
        .finally(() => {
          loadingPromises.delete(lessonKey);
        })
    );
  }
  await loadingPromises.get(lessonKey);
}

export function getLessonQuestionTotal(lessonKey: string): number {
  const lesson = getMentalMathLesson(lessonKey);
  if (!lesson) {
    return 0;
  }
  return lesson.secrets.reduce((sum, secret) => sum + getSecretQuestionTotal(lessonKey, secret.key), 0);
}

export function recordMentalMathAttempt(
  lessonKey: string,
  secretKey: string,
  questionId: string,
  isCorrect: boolean = false,
  userAnswer: string = "",
  questionDurationSeconds: number = 0
): void {
  if (!questionId) {
    return;
  }
  bindLifecycleListeners();
  ensureBaseCache();
  const secret = getMentalMathSecret(lessonKey, secretKey);
  if (!secret) {
    return;
  }
  const totalQuestions = secret.questions.length;
  applyOptimisticAttempt(
    lessonKey,
    secretKey,
    questionId,
    totalQuestions,
    userAnswer,
    isCorrect,
    questionDurationSeconds
  );
  pendingAttempts.set(pendingAttemptKey(lessonKey, secretKey, questionId), {
    lessonKey,
    secretKey,
    questionId,
    totalQuestions,
    isCorrect,
    userAnswer,
    timeSpentSeconds: questionDurationSeconds,
  });
  scheduleFlush();
}

export function getSecretPracticeRecords(lessonKey: string, secretKey: string): SavedQuestionAttempt[] {
  ensureBaseCache();
  const secret = getMentalMathSecret(lessonKey, secretKey);
  if (!secret) {
    return [];
  }
  const cache = secretCache.get(cacheKey(lessonKey, secretKey));
  if (!cache) {
    return [];
  }
  return secret.questions.flatMap((question) => {
    const attempt = cache.questionAttempts.get(question.id);
    if (!attempt) {
      return [];
    }
    return [
      {
        questionId: question.id,
        userAnswer: attempt.userAnswer,
        isCorrect: attempt.isCorrect,
        questionDurationSeconds: attempt.questionDurationSeconds,
      },
    ];
  });
}

export async function resetMentalMathSecretProgress(lessonKey: string, secretKey: string): Promise<void> {
  await flushMentalMathPracticeProgress();
  clearPendingForTopic(lessonKey, secretKey);
  ensureBaseCache();
  const secret = getMentalMathSecret(lessonKey, secretKey);
  if (!secret) {
    return;
  }
  const key = cacheKey(lessonKey, secretKey);
  const preserveReport =
    secretCache.get(key)?.hasPracticeReport ||
    practiceReportCache.has(key) ||
    practiceReportTopicKeysByLesson.get(lessonKey)?.has(secretKey) ||
    false;

  secretCache.set(key, {
    totalQuestions: secret.questions.length,
    attemptedQuestionIds: new Set(),
    attemptedUniqueQuestions: 0,
    progressPercentAttempted: 0,
    questionAttempts: new Map(),
    hasPracticeReport: preserveReport,
  });
  lessonProgressCache.set(lessonKey, getLessonProgressFromSecretCache(lessonKey));
  bumpPracticeProgressVersion();

  try {
    const topicResult = await resetLearningTopicProgress({
      subject_key: SUBJECT_KEY,
      module_key: lessonKey,
      topic_key: secretKey,
      total_questions: secret.questions.length,
    });
    applyServerTopicResult(lessonKey, secretKey, secret.questions.length, topicResult);
  } catch {
    // Local question progress already cleared; practice report stays intact.
  }
  bumpPracticeProgressVersion();
}

export async function saveSecretPracticeReport(
  lessonKey: string,
  secretKey: string,
  report: PersistedSecretPracticeReport
): Promise<PersistedSecretPracticeReport | null> {
  const key = cacheKey(lessonKey, secretKey);
  practiceReportCache.set(key, report);
  markSecretHasPracticeReport(lessonKey, secretKey);
  bumpPracticeProgressVersion();
  try {
    const saved = await upsertLearningPracticeReport(toPracticeReportPayload(lessonKey, secretKey, report));
    const mapped = mapServerPracticeReport(saved);
    practiceReportCache.set(key, mapped);
    bumpPracticeProgressVersion();
    return mapped;
  } catch {
    // Keep optimistic cache for this session; server sync can retry on next summary save.
    return practiceReportCache.get(key) ?? null;
  }
}

export async function fetchSecretPracticeReportById(reportId: number): Promise<PersistedSecretPracticeReport | null> {
  try {
    const data = await fetchLearningPracticeReportById(reportId);
    const mapped = mapServerPracticeReport(data);
    if (data.module_key && data.topic_key) {
      practiceReportCache.set(cacheKey(data.module_key, data.topic_key), mapped);
      markSecretHasPracticeReport(data.module_key, data.topic_key);
    }
    return mapped;
  } catch {
    return null;
  }
}

export async function fetchSecretPracticeReportHistory(
  lessonKey: string,
  secretKey: string,
  limit = 50,
  offset = 0
): Promise<{ total: number; list: PracticeReportHistorySummary[] }> {
  const result = await fetchLearningPracticeReportHistory(SUBJECT_KEY, lessonKey, secretKey, limit, offset);
  if (result.list.length > 0) {
    markSecretHasPracticeReport(lessonKey, secretKey);
  }
  return {
    total: result.total,
    list: result.list.map(mapServerPracticeReportSummary),
  };
}

export type PracticeReportTrendPoint = {
  session_id: number;
  finished_at: string;
  accuracy: number;
  duration_seconds: number;
};

export function mapPracticeHistoryToTrend(list: PracticeReportHistorySummary[]): PracticeReportTrendPoint[] {
  return list
    .slice()
    .reverse()
    .map((row) => ({
      session_id: row.id,
      finished_at: row.finishedAt ?? new Date().toISOString(),
      accuracy: row.accuracy,
      duration_seconds: row.durationSeconds,
    }));
}

export async function fetchSecretPracticeReport(
  lessonKey: string,
  secretKey: string
): Promise<PersistedSecretPracticeReport | null> {
  const data = await fetchLearningPracticeReport(SUBJECT_KEY, lessonKey, secretKey);
  if (!data) {
    practiceReportCache.delete(cacheKey(lessonKey, secretKey));
    return null;
  }
  const mapped = mapServerPracticeReport(data);
  practiceReportCache.set(cacheKey(lessonKey, secretKey), mapped);
  markSecretHasPracticeReport(lessonKey, secretKey);
  return mapped;
}

export function hasSecretPracticeReport(lessonKey: string, secretKey: string): boolean {
  ensureBaseCache();
  const key = cacheKey(lessonKey, secretKey);
  if (practiceReportCache.has(key)) {
    return true;
  }
  if (practiceReportTopicKeysByLesson.get(lessonKey)?.has(secretKey)) {
    return true;
  }
  return secretCache.get(key)?.hasPracticeReport ?? false;
}

export function getSecretSolvedCount(lessonKey: string, secretKey?: string): number {
  const resolvedSecretKey = secretKey ?? lessonKey;
  const resolvedLessonKey = secretKey ? lessonKey : DEFAULT_LESSON_KEY;
  ensureBaseCache();
  return secretCache.get(cacheKey(resolvedLessonKey, resolvedSecretKey))?.attemptedUniqueQuestions ?? 0;
}

export function getSecretQuestionTotal(lessonKey: string, secretKey?: string): number {
  const resolvedSecretKey = secretKey ?? lessonKey;
  const resolvedLessonKey = secretKey ? lessonKey : DEFAULT_LESSON_KEY;
  ensureBaseCache();
  const secret = getMentalMathSecret(resolvedLessonKey, resolvedSecretKey);
  return secretCache.get(cacheKey(resolvedLessonKey, resolvedSecretKey))?.totalQuestions ?? secret?.questions.length ?? 0;
}

export function getAttemptedQuestionIdSet(lessonKey?: string, secretKey?: string): Set<string> {
  ensureBaseCache();
  if (lessonKey && secretKey) {
    return new Set(secretCache.get(cacheKey(lessonKey, secretKey))?.attemptedQuestionIds ?? []);
  }
  if (lessonKey && !secretKey && lessonKey.startsWith("secret")) {
    return new Set(secretCache.get(cacheKey(DEFAULT_LESSON_KEY, lessonKey))?.attemptedQuestionIds ?? []);
  }
  const all = new Set<string>();
  MENTAL_MATH_LESSONS.forEach((lesson) => {
    if (lessonKey && lesson.key !== lessonKey) {
      return;
    }
    lesson.secrets.forEach((secret) => {
      const ids = secretCache.get(cacheKey(lesson.key, secret.key))?.attemptedQuestionIds ?? new Set<string>();
      ids.forEach((id) => all.add(id));
    });
  });
  return all;
}

export function getFirstUnattemptedQuestionIndex(lessonKey: string, secretKey?: string): number {
  const resolvedSecretKey = secretKey ?? lessonKey;
  const resolvedLessonKey = secretKey ? lessonKey : DEFAULT_LESSON_KEY;
  const attempted = getAttemptedQuestionIdSet(resolvedLessonKey, resolvedSecretKey);
  const list = getMentalMathSecret(resolvedLessonKey, resolvedSecretKey)?.questions ?? [];
  const index = list.findIndex((question) => !attempted.has(question.id));
  return index >= 0 ? index : 0;
}

function getLessonProgressFromSecretCache(lessonKey: string): number {
  const total = getLessonQuestionTotal(lessonKey);
  if (total <= 0) {
    return 0;
  }
  const lesson = getMentalMathLesson(lessonKey);
  if (!lesson) {
    return 0;
  }
  const attempted = lesson.secrets.reduce((sum, secret) => sum + getSecretSolvedCount(lessonKey, secret.key), 0);
  return Math.min(100, Math.round((attempted / total) * 100));
}

export function getSecretProgressPercent(lessonKey: string, secretKey?: string): number {
  const resolvedSecretKey = secretKey ?? lessonKey;
  const resolvedLessonKey = secretKey ? lessonKey : DEFAULT_LESSON_KEY;
  ensureBaseCache();
  return secretCache.get(cacheKey(resolvedLessonKey, resolvedSecretKey))?.progressPercentAttempted ?? 0;
}

export function getLessonProgressPercentByPractice(lessonKey: string): number {
  return lessonProgressCache.get(lessonKey) ?? getLessonProgressFromSecretCache(lessonKey);
}
