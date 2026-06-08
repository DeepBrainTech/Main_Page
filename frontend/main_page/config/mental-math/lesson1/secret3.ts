import type { MentalMathSecret } from "@/types/learning";

export const SECRET3: MentalMathSecret = {
  "key": "secret3",
  "sourceTopicNumber": 7,
  "title": "Benchmark Number Addition",
  "techniqueSummary": "Choose a benchmark number such as 20, 30, 50, or 100. Compare each number to the benchmark, then combine the differences.",
  "review": [
    "Choose a benchmark number such as 20, 30, 50, or 100. Compare each number to the benchmark, then combine the differences."
  ],
  "questions": [
    {
      "id": "lesson1-secret3-q01",
      "expression": "21 + 19 + 18 + 22 + 20",
      "hints": [
        "5 addends in 21 + 19 + 18 + 22 + 20 — try benchmark 20.",
        "21 is +1 from 20; 19 is -1 from 20; 18 is -2 from 20; 22 is +2 from 20; 20 is +0 from 20.",
        "Compute 20 × 5 plus the sum of those gaps — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret3-q02",
      "expression": "29 + 31 + 30 + 28 + 32",
      "hints": [
        "5 addends in 29 + 31 + 30 + 28 + 32 — try benchmark 30.",
        "29 is -1 from 30; 31 is +1 from 30; 30 is +0 from 30; 28 is -2 from 30; 32 is +2 from 30.",
        "Compute 30 × 5 plus the sum of those gaps — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret3-q03",
      "expression": "41 + 39 + 38 + 42 + 40",
      "hints": [
        "5 addends in 41 + 39 + 38 + 42 + 40 — try benchmark 40.",
        "41 is +1 from 40; 39 is -1 from 40; 38 is -2 from 40; 42 is +2 from 40; 40 is +0 from 40.",
        "Compute 40 × 5 plus the sum of those gaps — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret3-q04",
      "expression": "47 + 53 + 49 + 51 + 50",
      "hints": [
        "5 addends in 47 + 53 + 49 + 51 + 50 — try benchmark 50.",
        "47 is -3 from 50; 53 is +3 from 50; 49 is -1 from 50; 51 is +1 from 50; 50 is +0 from 50.",
        "Compute 50 × 5 plus the sum of those gaps — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret3-q05",
      "expression": "18 + 20 + 22 + 24 + 16",
      "hints": [
        "5 addends in 18 + 20 + 22 + 24 + 16 — try benchmark 20.",
        "18 is -2 from 20; 20 is +0 from 20; 22 is +2 from 20; 24 is +4 from 20; 16 is -4 from 20.",
        "Compute 20 × 5 plus the sum of those gaps — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret3-q06",
      "expression": "35 + 37 + 39 + 41 + 43",
      "hints": [
        "5 addends in 35 + 37 + 39 + 41 + 43 — try benchmark 40.",
        "35 is -5 from 40; 37 is -3 from 40; 39 is -1 from 40; 41 is +1 from 40; 43 is +3 from 40.",
        "Compute 40 × 5 plus the sum of those gaps — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret3-q07",
      "expression": "22 + 18 + 19 + 21 + 20 + 17",
      "hints": [
        "6 addends in 22 + 18 + 19 + 21 + 20 + 17 — try benchmark 20.",
        "22 is +2 from 20; 18 is -2 from 20; 19 is -1 from 20; 21 is +1 from 20; 20 is +0 from 20; 17 is -3 from 20.",
        "Compute 20 × 6 plus the sum of those gaps — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret3-q08",
      "expression": "34 + 36 + 38 + 32 + 30 + 40",
      "hints": [
        "6 addends in 34 + 36 + 38 + 32 + 30 + 40 — try benchmark 30.",
        "34 is +4 from 30; 36 is +6 from 30; 38 is +8 from 30; 32 is +2 from 30; 30 is +0 from 30; 40 is +10 from 30.",
        "Compute 30 × 6 plus the sum of those gaps — what do you get?"
      ]
    }
  ]
} as const;
