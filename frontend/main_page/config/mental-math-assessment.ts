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

export const MENTAL_MATH_ASSESSMENT_SECONDS_PER_QUESTION = 10;

