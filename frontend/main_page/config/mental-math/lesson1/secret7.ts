import { buildSecretQuestions } from "./shared";

export const SECRET7_DEFINITION = {
  title: "Left-to-Right Addition",
  techniqueSummary: "",
  expressions: [
    "243 + 324",
    "352 + 416",
    "471 + 328",
    "582 + 217",
    "631 + 248",
    "724 + 135",
    "853 + 126",
    "462 + 317",
    "541 + 238",
    "673 + 214",
    "781 + 118",
    "424 + 353",
    "536 + 242",
    "645 + 133",
    "712 + 186",
    "823 + 145",
    "934 + 52",
    "351 + 427",
    "562 + 314",
    "741 + 157",
  ],
} as const;

export const SECRET7_QUESTIONS = buildSecretQuestions("secret7", SECRET7_DEFINITION);
