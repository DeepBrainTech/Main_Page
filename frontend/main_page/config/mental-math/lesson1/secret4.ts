import { buildSecretQuestions } from "./shared";

export const SECRET4_DEFINITION = {
  title: "Close Enough",
  techniqueSummary: "",
  expressions: [
    "78 + 99",
    "156 + 101",
    "432 + 98",
    "247 + 102",
    "89 + 11",
    "364 + 97",
    "518 + 103",
    "275 + 99",
    "63 + 101",
    "448 + 1001",
    "129 + 999",
    "542 + 101",
    "687 + 98",
    "75 + 19",
    "836 + 1002",
    "921 + 97",
    "58 + 12",
    "409 + 101",
    "733 + 999",
    "284 + 89",
  ],
} as const;

export const SECRET4_QUESTIONS = buildSecretQuestions("secret4", SECRET4_DEFINITION);
