import { buildSecretQuestions } from "./shared";

export const SECRET10_DEFINITION = {
  title: "Left-to-Right Subtraction",
  techniqueSummary: "",
  expressions: [
    "864 - 321",
    "953 - 412",
    "742 - 231",
    "685 - 243",
    "978 - 456",
    "831 - 420",
    "764 - 132",
    "695 - 241",
    "887 - 354",
    "926 - 513",
    "754 - 221",
    "643 - 112",
    "982 - 471",
    "875 - 342",
    "761 - 250",
    "844 - 333",
    "693 - 271",
    "958 - 624",
    "736 - 215",
    "821 - 410",
  ],
} as const;

export const SECRET10_QUESTIONS = buildSecretQuestions("secret10", SECRET10_DEFINITION);
