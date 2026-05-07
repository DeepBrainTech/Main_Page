/**
 * Server-side persisted progress for mental math practice (making-whole lesson).
 * No browser storage is used.
 */
import { MENTAL_MATH_SECRET_ORDER, MENTAL_MATH_SECRET_QUESTIONS } from "../config/mental-math-questions";
import {
  fetchLearningModuleProgress,
  fetchLearningSubjectProgress,
  recordLearningQuestionAttempt,
} from "@/services/userApi";

type SecretKey = (typeof MENTAL_MATH_SECRET_ORDER)[number];
type SecretCache = {
  totalQuestions: number;
  attemptedQuestionIds: Set<string>;
  attemptedUniqueQuestions: number;
  progressPercentAttempted: number;
};

const SUBJECT_KEY = "mental_math";
const MODULE_KEY = "making_whole";
const LESSON_TO_MODULE_KEY: Record<string, string> = {
  makingWhole: "making_whole",
  breakIntoParts: "break_into_parts",
  rearrange: "rearrange",
  roundAdjust: "round_adjust",
  leftToRightFlow: "left_to_right_flow",
  friendlyNumbers: "friendly_numbers",
  compensation: "compensation",
  multiplicationPatterns: "multiplication_patterns",
  divisionShortcuts: "division_shortcuts",
};

const secretCache = new Map<SecretKey, SecretCache>();
const lessonProgressCache = new Map<string, number>();
let clientVersion = 0;
let loadingPromise: Promise<void> | null = null;

function ensureBaseCache() {
  MENTAL_MATH_SECRET_ORDER.forEach((secretKey) => {
    if (!secretCache.has(secretKey)) {
      secretCache.set(secretKey, {
        totalQuestions: MENTAL_MATH_SECRET_QUESTIONS[secretKey]?.length ?? 0,
        attemptedQuestionIds: new Set<string>(),
        attemptedUniqueQuestions: 0,
        progressPercentAttempted: 0,
      });
    }
  });
}

ensureBaseCache();

export function getPracticeProgressVersion(): number {
  return clientVersion;
}

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

export async function refreshMakingWholeProgress(): Promise<void> {
  if (!loadingPromise) {
    loadingPromise = (async () => {
      ensureBaseCache();
      const result = await fetchLearningModuleProgress(SUBJECT_KEY, MODULE_KEY);
      result.topics.forEach((topic) => {
        const topicKey = topic.topic_key as SecretKey;
        if (!secretCache.has(topicKey)) {
          return;
        }
        secretCache.set(topicKey, {
          totalQuestions: topic.total_questions || (MENTAL_MATH_SECRET_QUESTIONS[topicKey]?.length ?? 0),
          attemptedQuestionIds: new Set(topic.attempted_question_keys ?? []),
          attemptedUniqueQuestions: topic.attempted_unique_questions ?? 0,
          progressPercentAttempted: topic.progress_percent_attempted ?? 0,
        });
      });
      lessonProgressCache.set("makingWhole", getMakingWholeProgressPercent());
      bumpPracticeProgressVersion();
    })()
      .catch(() => {})
      .finally(() => {
        loadingPromise = null;
      });
  }
  await loadingPromise;
}

export async function refreshMentalMathLessonProgress(): Promise<void> {
  try {
    const result = await fetchLearningSubjectProgress(SUBJECT_KEY);
    const moduleProgressMap = new Map<string, number>();
    result.modules.forEach((moduleRow) => {
      moduleProgressMap.set(moduleRow.module_key, moduleRow.progress_percent_attempted ?? 0);
    });
    Object.entries(LESSON_TO_MODULE_KEY).forEach(([lessonKey, moduleKey]) => {
      lessonProgressCache.set(lessonKey, moduleProgressMap.get(moduleKey) ?? 0);
    });
    // Keep makingWhole card consistent with secret-level progress cache.
    lessonProgressCache.set("makingWhole", getMakingWholeProgressPercent());
    bumpPracticeProgressVersion();
  } catch {
    // ignore refresh failure; caller can retry later
  }
}

export function getMakingWholeQuestionTotal(): number {
  return MENTAL_MATH_SECRET_ORDER.reduce((acc, key) => acc + getSecretQuestionTotal(key), 0);
}

export function getLessonQuestionTotal(lessonKey: string): number {
  if (lessonKey === "makingWhole") {
    return getMakingWholeQuestionTotal();
  }
  return 0;
}

export async function recordMakingWholeAttempt(
  questionId: string,
  secretKey: SecretKey,
  isCorrect: boolean = false
): Promise<void> {
  if (!questionId) {
    return;
  }
  ensureBaseCache();
  const topicResult = await recordLearningQuestionAttempt({
    subject_key: SUBJECT_KEY,
    module_key: MODULE_KEY,
    topic_key: secretKey,
    question_key: questionId,
    total_questions: MENTAL_MATH_SECRET_QUESTIONS[secretKey]?.length ?? 0,
    is_correct: isCorrect,
  });
  secretCache.set(secretKey, {
    totalQuestions: topicResult.total_questions || (MENTAL_MATH_SECRET_QUESTIONS[secretKey]?.length ?? 0),
    attemptedQuestionIds: new Set(topicResult.attempted_question_keys ?? []),
    attemptedUniqueQuestions: topicResult.attempted_unique_questions ?? 0,
    progressPercentAttempted: topicResult.progress_percent_attempted ?? 0,
  });
  bumpPracticeProgressVersion();
}

export function getSecretSolvedCount(secretKey: SecretKey): number {
  ensureBaseCache();
  return secretCache.get(secretKey)?.attemptedUniqueQuestions ?? 0;
}

export function getSecretQuestionTotal(secretKey: SecretKey): number {
  ensureBaseCache();
  return secretCache.get(secretKey)?.totalQuestions ?? MENTAL_MATH_SECRET_QUESTIONS[secretKey]?.length ?? 0;
}

export function getAttemptedQuestionIdSet(secretKey?: SecretKey): Set<string> {
  ensureBaseCache();
  if (secretKey) {
    return new Set(secretCache.get(secretKey)?.attemptedQuestionIds ?? []);
  }
  const all = new Set<string>();
  MENTAL_MATH_SECRET_ORDER.forEach((key) => {
    const ids = secretCache.get(key)?.attemptedQuestionIds ?? new Set<string>();
    ids.forEach((id) => all.add(id));
  });
  return all;
}

export function getFirstUnattemptedQuestionIndex(secretKey: SecretKey): number {
  const attempted = getAttemptedQuestionIdSet(secretKey);
  const list = MENTAL_MATH_SECRET_QUESTIONS[secretKey] ?? [];
  const index = list.findIndex((question) => !attempted.has(question.id));
  return index >= 0 ? index : 0;
}

export function getMakingWholeProgressPercent(): number {
  const total = getMakingWholeQuestionTotal();
  if (total <= 0) {
    return 0;
  }
  const attempted = MENTAL_MATH_SECRET_ORDER.reduce((acc, key) => acc + getSecretSolvedCount(key), 0);
  return Math.min(100, Math.round((attempted / total) * 100));
}

export function getSecretProgressPercent(secretKey: SecretKey): number {
  ensureBaseCache();
  return secretCache.get(secretKey)?.progressPercentAttempted ?? 0;
}

export function isLessonFullyCompleteByPractice(lessonKey: string): boolean {
  if (lessonKey === "makingWhole") {
    const total = getMakingWholeQuestionTotal();
    const attempted = MENTAL_MATH_SECRET_ORDER.reduce((acc, key) => acc + getSecretSolvedCount(key), 0);
    return total > 0 && attempted >= total;
  }
  return false;
}

export function getLessonProgressPercentByPractice(lessonKey: string): number {
  if (lessonKey === "makingWhole") {
    return getMakingWholeProgressPercent();
  }
  return lessonProgressCache.get(lessonKey) ?? 0;
}
