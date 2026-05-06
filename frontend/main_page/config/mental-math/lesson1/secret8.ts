import { buildSecretQuestions } from "./shared";

export const SECRET8_DEFINITION = {
  title: "Subtraction by Addition",
  techniqueSummary: "",
  expressions: [
    "184 - 97",
    "263 - 198",
    "347 - 191",
    "562 - 489",
    "645 - 498",
    "738 - 192",
    "821 - 497",
    "945 - 188",
    "376 - 99",
    "458 - 196",
    "614 - 497",
    "703 - 498",
    "882 - 191",
    "967 - 499",
    "532 - 197",
    "689 - 98",
    "774 - 199",
    "843 - 492",
    "918 - 198",
    "1005 - 497",
  ],
} as const;

export const SECRET8_QUESTIONS = buildSecretQuestions("secret8", SECRET8_DEFINITION);
