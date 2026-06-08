export type MentalMathCategoryKey =
  | "assessment"
  | "lesson1"
  | "lesson2"
  | "lesson3"
  | "lesson4"
  | "lesson5";

export type MentalMathLessonKey = string;
export type MentalMathSecretKey = string;

export interface MentalMathSourceQuestion {
  id: string;
  expression: string;
  /** Up to 3 thinking-direction hints stored in secret config files. */
  hints?: readonly string[];
}

export interface MentalMathSecret {
  key: MentalMathSecretKey;
  sourceTopicNumber: number;
  title: string;
  techniqueSummary: string;
  review: readonly string[];
  questions: readonly MentalMathSourceQuestion[];
}

export interface MentalMathLesson {
  key: MentalMathLessonKey;
  title: string;
  zhTitle: string;
  secrets: readonly MentalMathSecret[];
}

export interface MentalMathQuestion {
  id: string;
  lessonKey?: MentalMathLessonKey;
  secretKey: MentalMathSecretKey;
  expression: string;
  prompt: string;
  answer?: number;
  answerText?: string;
  acceptedAnswers?: readonly string[];
  techniqueTitle: string;
  techniqueSummary: string;
  hints?: readonly string[];
}

export type MentalMathQuestionMap = Record<string, MentalMathQuestion[]>;

export type MentalMathPracticePhase = "ready" | "inProgress" | "questionResult" | "milestone" | "summary";
