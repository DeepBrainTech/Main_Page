export type MentalMathCategoryKey =
  | "assessment"
  | "makingWhole"
  | "breakIntoParts"
  | "rearrange"
  | "roundAndAdjust"
  | "leftToRightFlow";

export type MentalMathSecretKey =
  | "secret1"
  | "secret2"
  | "secret3"
  | "secret4"
  | "secret5"
  | "secret6"
  | "secret7"
  | "secret8"
  | "secret9"
  | "secret10";

export interface MentalMathQuestion {
  id: string;
  secretKey: MentalMathSecretKey;
  expression: string;
  prompt: string;
  answer: number;
  techniqueTitle: string;
  techniqueSummary: string;
}

export type MentalMathQuestionMap = Record<MentalMathSecretKey, MentalMathQuestion[]>;

export type MentalMathPracticePhase = "ready" | "inProgress" | "questionResult" | "milestone" | "summary";
