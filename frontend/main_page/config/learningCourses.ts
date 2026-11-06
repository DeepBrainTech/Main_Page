export const LEARNING_CATEGORIES = ["all", "math", "language", "chess"] as const;

export type LearningCategory = (typeof LEARNING_CATEGORIES)[number];

export const LEARNING_COURSES = [
  { id: "mental_math", category: "math", titleKey: "mentalMathCourseTitle" },
] as const;
