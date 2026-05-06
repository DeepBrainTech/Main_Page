import { buildSecretQuestions } from "./shared";

export const SECRET6_DEFINITION = {
  title: "Moving House with Signs",
  techniqueSummary: "",
  expressions: [
    "54 - 18 + 23 - 9",
    "67 - 25 + 14 - 6",
    "82 - 17 + 28 - 13",
    "95 - 36 + 19 - 8",
    "73 - 21 + 27 - 11",
    "88 - 29 + 16 - 7",
    "61 - 14 + 22 - 5",
    "79 - 32 + 18 - 9",
    "92 - 24 + 15 - 6",
    "85 - 27 + 31 - 12",
    "70 - 16 + 24 - 8",
    "98 - 35 + 17 - 9",
    "64 - 19 + 26 - 10",
    "77 - 22 + 21 - 7",
    "83 - 28 + 13 - 4",
    "91 - 34 + 29 - 15",
    "68 - 23 + 18 - 6",
    "74 - 15 + 25 - 9",
    "86 - 31 + 20 - 8",
    "99 - 37 + 16 - 5",
  ],
} as const;

export const SECRET6_QUESTIONS = buildSecretQuestions("secret6", SECRET6_DEFINITION);
