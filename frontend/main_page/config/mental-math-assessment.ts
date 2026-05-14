import { MENTAL_MATH_SECRET_ORDER, MENTAL_MATH_SECRET_QUESTIONS } from "@/config/mental-math-questions";
import type { MentalMathCategoryKey, MentalMathQuestion, MentalMathSecretKey } from "@/types/learning";

export interface MentalMathAssessmentTopic {
  id: string;
  category: MentalMathCategoryKey;
  titleKey: string;
  questions: MentalMathQuestion[];
}

const makingWholeTopics: MentalMathAssessmentTopic[] = MENTAL_MATH_SECRET_ORDER.map((secretKey: MentalMathSecretKey) => ({
  id: `makingWhole.${secretKey}`,
  category: "makingWhole",
  titleKey: `makingWholeSecrets.${secretKey}`,
  questions: MENTAL_MATH_SECRET_QUESTIONS[secretKey] ?? [],
}));

const breakIntoPartsTopics: MentalMathAssessmentTopic[] = [];
const rearrangeTopics: MentalMathAssessmentTopic[] = [];
const roundAndAdjustTopics: MentalMathAssessmentTopic[] = [];
const leftToRightFlowTopics: MentalMathAssessmentTopic[] = [];

export const MENTAL_MATH_ASSESSMENT_TOPICS: MentalMathAssessmentTopic[] = [
  ...makingWholeTopics,
  ...breakIntoPartsTopics,
  ...rearrangeTopics,
  ...roundAndAdjustTopics,
  ...leftToRightFlowTopics,
];

/** Whole-assessment time budget (matches Lesson 0 intro copy). */
export const MENTAL_MATH_ASSESSMENT_TOTAL_MINUTES = 5;
export const MENTAL_MATH_ASSESSMENT_TOTAL_MS = MENTAL_MATH_ASSESSMENT_TOTAL_MINUTES * 60 * 1000;

