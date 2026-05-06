import { buildSecretQuestions } from "./shared";

export const SECRET2_DEFINITION = {
  title: "Subtracting in Steps",
  techniqueSummary: "",
  expressions: [
    "164 - 27",
    "183 - 46",
    "245 - 38",
    "276 - 59",
    "318 - 27",
    "352 - 48",
    "407 - 36",
    "438 - 57",
    "465 - 29",
    "524 - 68",
    "587 - 49",
    "612 - 37",
    "645 - 58",
    "703 - 26",
    "754 - 47",
    "816 - 69",
    "842 - 35",
    "905 - 28",
    "936 - 57",
    "978 - 49",
  ],
} as const;

export const SECRET2_QUESTIONS = buildSecretQuestions("secret2", SECRET2_DEFINITION);
