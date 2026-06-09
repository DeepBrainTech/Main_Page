/**
 * Display-only diamond prices per course key. Authoritative charges: backend
 * `config/learning_commerce.py` and POST .../unlock-with-diamonds.
 * When adding a course, extend LEARNING_BUNDLE_COMMERCE and keep numbers in sync.
 */
export const MENTAL_MATH_COURSE_KEY = "mental_math" as const;

export const LEARNING_BUNDLE_COMMERCE = {
  [MENTAL_MATH_COURSE_KEY]: {
    diamondsThreeMonth: 100,
    diamondsLifetime: 200,
  },
} as const;

export const MENTAL_MATH_DIAMOND_THREE_MONTH_COST =
  LEARNING_BUNDLE_COMMERCE[MENTAL_MATH_COURSE_KEY].diamondsThreeMonth;
export const MENTAL_MATH_DIAMOND_LIFETIME_COST =
  LEARNING_BUNDLE_COMMERCE[MENTAL_MATH_COURSE_KEY].diamondsLifetime;
