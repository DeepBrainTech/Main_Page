import { buildSecretQuestions } from "./shared";

export const SECRET1_DEFINITION = {
  title: "Friend Numbers",
  techniqueSummary: "Pair numbers to make round totals (like 10 or 100) first, then add the rest to simplify mental math.",
  expressions: [
    "37 + 48 + 63",
    "28 + 19 + 72",
    "46 + 55 + 34",
    "23 + 41 + 77",
    "64 + 18 + 36",
    "81 + 27 + 19",
    "52 + 36 + 48",
    "39 + 44 + 61",
    "75 + 68 + 25",
    "17 + 26 + 83",
    "145 + 38 + 55",
    "310 + 124 + 690",
    "425 + 109 + 575",
    "630 + 86 + 370",
    "812 + 54 + 188",
    "24 + 300 + 76 + 700",
    "465 + 72 + 535 + 28",
    "120 + 45 + 880 + 55",
    "250 + 33 + 750 + 67",
    "718 + 46 + 282 + 54",
  ],
} as const;

export const SECRET1_QUESTIONS = buildSecretQuestions("secret1", SECRET1_DEFINITION);
