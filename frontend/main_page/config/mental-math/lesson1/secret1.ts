import { buildSecretQuestions } from "./shared";

export const SECRET1_DEFINITION = {
  title: "Friend Numbers",
  techniqueSummary: "Pair numbers to make round totals (like 10 or 100) first, then add the rest to simplify mental math.",
  expressions: [
    "1 + 9 + 37",
    "2 + 8 + 46",
    "3 + 7 + 55",
    "4 + 6 + 28",
    "5 + 5 + 63",
    "11 + 9 + 24",
    "12 + 8 + 35",
    "13 + 7 + 49",
    "14 + 6 + 52",
    "15 + 5 + 27",
    "21 + 29 + 18",
    "22 + 28 + 47",
    "23 + 27 + 56",
    "24 + 26 + 39",
    "31 + 69 + 14",
    "42 + 58 + 26",
    "57 + 43 + 35",
    "64 + 36 + 19",
    "72 + 28 + 44",
    "81 + 19 + 23",
  ],
} as const;

export const SECRET1_QUESTIONS = buildSecretQuestions("secret1", SECRET1_DEFINITION);
