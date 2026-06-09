import type { MentalMathLesson } from "@/types/learning";

export type MentalMathLessonListKey =
  | "assessment"
  | "lesson1"
  | "lesson2"
  | "lesson3"
  | "lesson4"
  | "lesson5";

const LESSON_LIST_KEYS = new Set<string>([
  "assessment",
  "lesson1",
  "lesson2",
  "lesson3",
  "lesson4",
  "lesson5",
]);

export function isMentalMathLessonListKey(key: string): key is MentalMathLessonListKey {
  return LESSON_LIST_KEYS.has(key);
}

export function mentalMathLessonListKey(key: string): MentalMathLessonListKey | null {
  return isMentalMathLessonListKey(key) ? key : null;
}

/** Fallback when i18n is unavailable; prefers zhTitle in Chinese locales. */
export function getMentalMathLessonDisplayTitle(
  lesson: Pick<MentalMathLesson, "title" | "zhTitle"> | null | undefined,
  locale: string,
): string {
  if (!lesson) {
    return "";
  }
  return locale.startsWith("zh") ? lesson.zhTitle : lesson.title;
}
