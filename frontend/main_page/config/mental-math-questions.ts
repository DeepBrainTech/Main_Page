import { MENTAL_MATH_LESSONS } from "@/config/mental-math/catalog";
import { buildQuestionHints } from "@/lib/mentalMathQuestionHints";
import type { MentalMathQuestion, MentalMathQuestionMap } from "@/types/learning";

export const MENTAL_MATH_SECRET_ORDER = MENTAL_MATH_LESSONS.flatMap((lesson) =>
  lesson.secrets.map((secret) => `${lesson.key}.${secret.key}`)
);

export const MENTAL_MATH_SECRET_METADATA = Object.fromEntries(
  MENTAL_MATH_LESSONS.flatMap((lesson) =>
    lesson.secrets.map((secret) => [
      `${lesson.key}.${secret.key}`,
      {
        title: secret.title,
        techniqueSummary: secret.techniqueSummary,
        expressions: secret.questions.map((question) => question.expression),
      },
    ])
  )
);

export const MENTAL_MATH_SECRET_QUESTIONS: MentalMathQuestionMap = Object.fromEntries(
  MENTAL_MATH_LESSONS.flatMap((lesson) =>
    lesson.secrets.map((secret) => {
      const questions: MentalMathQuestion[] = secret.questions.map((question) => ({
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
      }));
      return [`${lesson.key}.${secret.key}`, questions];
    })
  )
);

export const MENTAL_MATH_VIDEO_QUESTION_BANK = MENTAL_MATH_SECRET_ORDER.flatMap(
  (secretKey) => MENTAL_MATH_SECRET_QUESTIONS[secretKey] ?? []
);
