import type { MentalMathSecret } from "@/types/learning";

export const SECRET1: MentalMathSecret = {
  "key": "secret1",
  "sourceTopicNumber": 16,
  "title": "Multiplying by 5",
  "techniqueSummary": "When multiplying a number by 5: if the number is even, divide it by 2 first, then add a zero to the result; if the number is odd, add a zero first, then divide by 2. This is called the “halve-and-times-10” strategy. Example 1 248 × 5",
  "review": [
    "When multiplying a number by 5:",
    "if the number is even, divide it by 2 first, then add a zero to the result;",
    "if the number is odd, add a zero first, then divide by 2.",
    "This is called the “halve-and-times-10” strategy.",
    "Example 1",
    "248 × 5",
    "→ 248 ÷ 2 = 124",
    "→ 1240",
    "Example 2",
    "375 × 5",
    "→ 375 × 10 = 3750",
    "→ 3750 ÷ 2",
    "→ 1875"
  ],
  "questions": [
    {
      "id": "lesson4-secret1-q01",
      "expression": "164 × 5",
      "hints": [
        "164 is even — halve first, then append a zero (×10).",
        "164 ÷ 2 = 82.",
        "Append 0 to 82 — what is 164 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q02",
      "expression": "326 × 5",
      "hints": [
        "326 is even — halve first, then append a zero (×10).",
        "326 ÷ 2 = 163.",
        "Append 0 to 163 — what is 326 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q03",
      "expression": "247 × 5",
      "hints": [
        "247 is odd — multiply by 10 first, then halve.",
        "247 × 10 = 2470.",
        "Halve 2470 mentally — what is 247 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q04",
      "expression": "518 × 5",
      "hints": [
        "518 is even — halve first, then append a zero (×10).",
        "518 ÷ 2 = 259.",
        "Append 0 to 259 — what is 518 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q05",
      "expression": "864 × 5",
      "hints": [
        "864 is even — halve first, then append a zero (×10).",
        "864 ÷ 2 = 432.",
        "Append 0 to 432 — what is 864 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q06",
      "expression": "1275 × 5",
      "hints": [
        "1275 is odd — multiply by 10 first, then halve.",
        "1275 × 10 = 12750.",
        "Halve 12750 mentally — what is 1275 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q07",
      "expression": "943 × 5",
      "hints": [
        "943 is odd — multiply by 10 first, then halve.",
        "943 × 10 = 9430.",
        "Halve 9430 mentally — what is 943 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q08",
      "expression": "2806 × 5",
      "hints": [
        "2806 is even — halve first, then append a zero (×10).",
        "2806 ÷ 2 = 1403.",
        "Append 0 to 1403 — what is 2806 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q09",
      "expression": "451 × 5",
      "hints": [
        "451 is odd — multiply by 10 first, then halve.",
        "451 × 10 = 4510.",
        "Halve 4510 mentally — what is 451 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q10",
      "expression": "6824 × 5",
      "hints": [
        "6824 is even — halve first, then append a zero (×10).",
        "6824 ÷ 2 = 3412.",
        "Append 0 to 3412 — what is 6824 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q11",
      "expression": "25 × 486",
      "hints": [
        "25 is odd — multiply by 10 first, then halve.",
        "25 × 10 = 250.",
        "Halve 250 mentally — what is 25 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q12",
      "expression": "375 × 5 + 25",
      "hints": [
        "375 is odd — multiply by 10 first, then halve.",
        "375 × 10 = 3750.",
        "Halve 3750 mentally — what is 375 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q13",
      "expression": "128 × 25",
      "hints": [
        "128 is even — halve first, then append a zero (×10).",
        "128 ÷ 2 = 64.",
        "Append 0 to 64 — what is 128 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q14",
      "expression": "250 × 64",
      "hints": [
        "250 is even — halve first, then append a zero (×10).",
        "250 ÷ 2 = 125.",
        "Append 0 to 125 — what is 250 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q15",
      "expression": "875 × 5",
      "hints": [
        "875 is odd — multiply by 10 first, then halve.",
        "875 × 10 = 8750.",
        "Halve 8750 mentally — what is 875 × 5?"
      ]
    },
    {
      "id": "lesson4-secret1-q16",
      "expression": "512 × 25",
      "hints": [
        "512 is even — halve first, then append a zero (×10).",
        "512 ÷ 2 = 256.",
        "Append 0 to 256 — what is 512 × 5?"
      ]
    }
  ]
} as const;
