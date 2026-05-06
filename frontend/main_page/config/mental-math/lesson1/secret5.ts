import { buildSecretQuestions } from "./shared";

export const SECRET5_DEFINITION = {
  title: "Big Chunks and Little Crumbs",
  techniqueSummary: "",
  expressions: [
    "245 + 300 + 27",
    "318 + 500 + 16",
    "472 + 200 + 38",
    "561 + 400 + 24",
    "689 + 100 + 33",
    "754 + 600 + 15",
    "827 + 300 + 42",
    "193 + 700 + 28",
    "264 + 500 + 19",
    "346 + 200 + 57",
    "418 + 400 + 26",
    "537 + 300 + 18",
    "625 + 100 + 49",
    "742 + 200 + 31",
    "856 + 500 + 22",
    "914 + 300 + 17",
    "278 + 600 + 14",
    "365 + 400 + 35",
    "483 + 200 + 41",
    "591 + 100 + 29",
  ],
} as const;

export const SECRET5_QUESTIONS = buildSecretQuestions("secret5", SECRET5_DEFINITION);
