import type { MentalMathQuestionMap, MentalMathSecretKey } from "@/types/learning";
import { SECRET10_DEFINITION, SECRET10_QUESTIONS } from "./secret10";
import { SECRET1_DEFINITION, SECRET1_QUESTIONS } from "./secret1";
import { SECRET2_DEFINITION, SECRET2_QUESTIONS } from "./secret2";
import { SECRET3_DEFINITION, SECRET3_QUESTIONS } from "./secret3";
import { SECRET4_DEFINITION, SECRET4_QUESTIONS } from "./secret4";
import { SECRET5_DEFINITION, SECRET5_QUESTIONS } from "./secret5";
import { SECRET6_DEFINITION, SECRET6_QUESTIONS } from "./secret6";
import { SECRET7_DEFINITION, SECRET7_QUESTIONS } from "./secret7";
import { SECRET8_DEFINITION, SECRET8_QUESTIONS } from "./secret8";
import { SECRET9_DEFINITION, SECRET9_QUESTIONS } from "./secret9";

export const LESSON1_SECRET_ORDER: MentalMathSecretKey[] = [
  "secret1",
  "secret2",
  "secret3",
  "secret4",
  "secret5",
  "secret6",
  "secret7",
  "secret8",
  "secret9",
  "secret10",
];

export const LESSON1_SECRET_METADATA = {
  secret1: SECRET1_DEFINITION,
  secret2: SECRET2_DEFINITION,
  secret3: SECRET3_DEFINITION,
  secret4: SECRET4_DEFINITION,
  secret5: SECRET5_DEFINITION,
  secret6: SECRET6_DEFINITION,
  secret7: SECRET7_DEFINITION,
  secret8: SECRET8_DEFINITION,
  secret9: SECRET9_DEFINITION,
  secret10: SECRET10_DEFINITION,
} as const;

export const LESSON1_SECRET_QUESTIONS: MentalMathQuestionMap = {
  secret1: SECRET1_QUESTIONS,
  secret2: SECRET2_QUESTIONS,
  secret3: SECRET3_QUESTIONS,
  secret4: SECRET4_QUESTIONS,
  secret5: SECRET5_QUESTIONS,
  secret6: SECRET6_QUESTIONS,
  secret7: SECRET7_QUESTIONS,
  secret8: SECRET8_QUESTIONS,
  secret9: SECRET9_QUESTIONS,
  secret10: SECRET10_QUESTIONS,
};
