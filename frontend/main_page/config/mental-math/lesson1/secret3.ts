import { buildSecretQuestions } from "./shared";

export const SECRET3_DEFINITION = {
  title: "Switch-a-Roo",
  techniqueSummary: "",
  expressions: [
    "1 + 9 + 3 + 7",
    "2 + 8 + 4 + 6",
    "11 + 9 + 5 + 5",
    "12 + 8 + 13 + 7",
    "21 + 29 + 4 + 6",
    "22 + 28 + 11 + 9",
    "23 + 27 + 12 + 8",
    "24 + 26 + 15 + 5",
    "31 + 19 + 41 + 9",
    "32 + 18 + 13 + 7",
    "33 + 17 + 24 + 26",
    "34 + 16 + 21 + 29",
    "35 + 15 + 14 + 6",
    "36 + 14 + 23 + 27",
    "41 + 9 + 22 + 28",
    "42 + 8 + 17 + 3",
    "43 + 7 + 31 + 19",
    "44 + 6 + 24 + 26",
    "45 + 5 + 12 + 8",
    "46 + 4 + 13 + 7",
  ],
} as const;

export const SECRET3_QUESTIONS = buildSecretQuestions("secret3", SECRET3_DEFINITION);
