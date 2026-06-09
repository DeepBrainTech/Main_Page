import { LESSON1 } from "./lesson1";
import { LESSON2 } from "./lesson2";
import { LESSON3 } from "./lesson3";
import { LESSON4 } from "./lesson4";
import { LESSON5 } from "./lesson5";
import type { MentalMathLesson } from "@/types/learning";

export const MENTAL_MATH_LESSONS = [
  LESSON1,
  LESSON2,
  LESSON3,
  LESSON4,
  LESSON5,
] as const satisfies readonly MentalMathLesson[];

export function getMentalMathLesson(lessonKey: string) {
  return MENTAL_MATH_LESSONS.find((lesson) => lesson.key === lessonKey) ?? null;
}

export function getMentalMathSecret(lessonKey: string, secretKey: string) {
  return getMentalMathLesson(lessonKey)?.secrets.find((secret) => secret.key === secretKey) ?? null;
}
