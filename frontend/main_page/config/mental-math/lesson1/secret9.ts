import { buildSecretQuestions } from "./shared";

export const SECRET9_DEFINITION = {
  title: "Over-Subtract and Adjust",
  techniqueSummary: "",
  expressions: [
    "143 - 48",
    "167 - 59",
    "205 - 39",
    "238 - 47",
    "264 - 58",
    "319 - 69",
    "342 - 28",
    "387 - 49",
    "415 - 76",
    "468 - 88",
    "502 - 29",
    "547 - 38",
    "589 - 57",
    "624 - 79",
    "673 - 48",
    "718 - 59",
    "764 - 68",
    "805 - 27",
    "849 - 39",
    "932 - 58",
  ],
} as const;

export const SECRET9_QUESTIONS = buildSecretQuestions("secret9", SECRET9_DEFINITION);
