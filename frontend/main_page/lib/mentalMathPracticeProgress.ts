/**
 * Client-side persisted progress for mental math practice (making-whole lesson).
 * Tracks unique question IDs answered correctly at least once.
 */
import { MENTAL_MATH_SECRET_ORDER, MENTAL_MATH_SECRET_QUESTIONS } from "../config/mental-math-questions";

const STORAGE_KEY = "dbt.learning.mental_math.practice.v1";

export type MentalMathStoredProgress = {
  v: 1;
  makingWholeSolvedIds: string[];
  practiceTimeSeconds: number;
};

const emptyState = (): MentalMathStoredProgress => ({
  v: 1,
  makingWholeSolvedIds: [],
  practiceTimeSeconds: 0,
});

function readRaw(): MentalMathStoredProgress {
  if (typeof window === "undefined") {
    return emptyState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyState();
    }
    const parsed = JSON.parse(raw) as Partial<MentalMathStoredProgress>;
    if (parsed.v !== 1 || !Array.isArray(parsed.makingWholeSolvedIds)) {
      return emptyState();
    }
    return {
      v: 1,
      makingWholeSolvedIds: parsed.makingWholeSolvedIds.filter((id) => typeof id === "string"),
      practiceTimeSeconds:
        typeof parsed.practiceTimeSeconds === "number" && parsed.practiceTimeSeconds >= 0
          ? Math.floor(parsed.practiceTimeSeconds)
          : 0,
    };
  } catch {
    return emptyState();
  }
}

function writeRaw(state: MentalMathStoredProgress) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
  bumpPracticeProgressVersion();
}

let clientVersion = 0;

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

export function getMakingWholeQuestionTotal(): number {
  return MENTAL_MATH_SECRET_ORDER.reduce(
    (acc, key) => acc + (MENTAL_MATH_SECRET_QUESTIONS[key]?.length ?? 0),
    0
  );
}

export function getLessonQuestionTotal(lessonKey: string): number {
  if (lessonKey === "makingWhole") {
    return getMakingWholeQuestionTotal();
  }
  return 0;
}

export function recordMakingWholeCorrectAnswer(questionId: string) {
  if (!questionId) {
    return;
  }
  const state = readRaw();
  if (state.makingWholeSolvedIds.includes(questionId)) {
    return;
  }
  state.makingWholeSolvedIds.push(questionId);
  writeRaw(state);
}

export function addAccumulatedPracticeSeconds(seconds: number) {
  if (seconds <= 0) {
    return;
  }
  const state = readRaw();
  state.practiceTimeSeconds += Math.floor(seconds);
  writeRaw(state);
}

export function getMakingWholeSolvedCount(): number {
  return readRaw().makingWholeSolvedIds.length;
}

export function getPracticeTimeSeconds(): number {
  return readRaw().practiceTimeSeconds;
}

export function getSecretSolvedCount(secretKey: (typeof MENTAL_MATH_SECRET_ORDER)[number]): number {
  const solved = new Set(readRaw().makingWholeSolvedIds);
  const ids = (MENTAL_MATH_SECRET_QUESTIONS[secretKey] ?? []).map((q) => q.id);
  return ids.filter((id) => solved.has(id)).length;
}

export function getSecretQuestionTotal(secretKey: (typeof MENTAL_MATH_SECRET_ORDER)[number]): number {
  return MENTAL_MATH_SECRET_QUESTIONS[secretKey]?.length ?? 0;
}

export function getMakingWholeProgressPercent(): number {
  const total = getMakingWholeQuestionTotal();
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((getMakingWholeSolvedCount() / total) * 100));
}

export function getSecretProgressPercent(
  secretKey: (typeof MENTAL_MATH_SECRET_ORDER)[number]
): number {
  const total = getSecretQuestionTotal(secretKey);
  if (total <= 0) {
    return 0;
  }
  const solved = getSecretSolvedCount(secretKey);
  return Math.min(100, Math.round((solved / total) * 100));
}

export function isLessonFullyCompleteByPractice(lessonKey: string): boolean {
  if (lessonKey === "makingWhole") {
    const t = getMakingWholeQuestionTotal();
    return t > 0 && getMakingWholeSolvedCount() >= t;
  }
  return false;
}

export function getLessonProgressPercentByPractice(lessonKey: string): number {
  if (lessonKey === "makingWhole") {
    return getMakingWholeProgressPercent();
  }
  return 0;
}
