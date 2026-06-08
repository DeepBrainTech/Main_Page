import { MENTAL_MATH_LESSONS } from "@/config/mental-math/catalog";
import { buildQuestionHints } from "@/lib/mentalMathQuestionHints";
import type { MentalMathCategoryKey, MentalMathQuestion } from "@/types/learning";

export interface MentalMathAssessmentTopic {
  id: string;
  category: MentalMathCategoryKey;
  titleKey: string;
  questions: MentalMathQuestion[];
}

export const MENTAL_MATH_ASSESSMENT_TOPICS: MentalMathAssessmentTopic[] = MENTAL_MATH_LESSONS.flatMap((lesson) =>
  lesson.secrets.map((secret) => ({
    id: `${lesson.key}.${secret.key}`,
    category: lesson.key as MentalMathCategoryKey,
    titleKey: secret.title,
    questions: secret.questions.map((question) => ({
      id: question.id,
      lessonKey: lesson.key,
      secretKey: secret.key,
      expression: question.expression,
      prompt: question.expression,
      techniqueTitle: secret.title,
      techniqueSummary: secret.techniqueSummary,
      hints: buildQuestionHints({
        lesson,
        secret,
        expression: question.expression,
        presetHints: question.hints,
      }),
    })),
  }))
);

/** Whole-assessment time budget (matches Lesson 0 intro copy). */
export const MENTAL_MATH_ASSESSMENT_TOTAL_MINUTES = 5;
export const MENTAL_MATH_ASSESSMENT_TOTAL_MS = MENTAL_MATH_ASSESSMENT_TOTAL_MINUTES * 60 * 1000;
