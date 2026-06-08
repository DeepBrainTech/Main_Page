import type { MentalMathSecret } from "@/types/learning";

export const SECRET15: MentalMathSecret = {
  "key": "secret15",
  "sourceTopicNumber": 42,
  "title": "Calculating Using Hundreds or Thousands as Benchmark Numbers",
  "techniqueSummary": "When multiplying two numbers close to a benchmark such as 100, 1000, or another round number: Use the benchmark number to simplify the calculation. When finding complements, use the nearest hundred or thousand as the benchmark number. Method 1 — Both Factors Are Greater Than the Benchmark Number Use: ( one factor + the other factor’s ending part ) × benchmark number + ( one factor’s ending part × the other factor’s ending part )",
  "review": [
    "When multiplying two numbers close to a benchmark such as 100, 1000, or another round number:",
    "Use the benchmark number to simplify the calculation.",
    "When finding complements, use the nearest hundred or thousand as the benchmark number.",
    "Method 1 — Both Factors Are Greater Than the Benchmark Number",
    "Use:",
    "( one factor + the other factor’s ending part ) × benchmark number + ( one factor’s ending part × the other factor’s ending part )",
    "Example 1",
    "1003 × 1013",
    "→ Ending parts: 3 and 13",
    "→ (1003 + 13) × 1000 + (3 × 13)",
    "→ 1016 × 1000 + 39",
    "→ 1016039",
    "Example 2",
    "302 × 309",
    "→ Ending parts: 2 and 9",
    "→ (302 + 9) × 100 + (2 × 9)",
    "→ 311 × 100 + 18",
    "→ 31118",
    "Method 2 — Both Factors Are Less Than the Benchmark Number",
    "Use:",
    "( one factor − the other factor’s complement ) × benchmark number + ( one factor’s complement × the other factor’s complement )",
    "Example 1",
    "996 × 993",
    "→ Complements: 4 and 7",
    "→ (996 − 7) × 1000 + (4 × 7)",
    "→ 989 × 1000 + 28",
    "→ 989028",
    "Example 2",
    "295 × 294",
    "→ Complements: 5 and 6",
    "→ (295 − 6) × 100 + (5 × 6)",
    "→ 289 × 100 + 30",
    "→ 28930",
    "Method 3 — One Factor Greater Than the Benchmark Number and One Factor Less Than the Benchmark Number",
    "Use:",
    "( larger factor − smaller factor’s complement ) × benchmark number − ( larger factor’s ending part × smaller factor’s complement )",
    "Example 1",
    "1008 × 992",
    "→ Complement of 992 is 8",
    "→ Ending part of 1008 is 8",
    "→ (1008 − 8) × 1000 − (8 × 8)",
    "→ 1000 × 1000 − 64",
    "→ 999936",
    "Example 2",
    "496 × 498",
    "→ Complements: 4 and 2",
    "→ (498 − 4) × 100 + (4 × 2)",
    "→ 49400 + 8",
    "→ 49408"
  ],
  "questions": [
    {
      "id": "lesson1-secret15-q01",
      "expression": "996 × 993",
      "hints": [
        "996 and 993 are above 100 — ending parts 96 and 93.",
        "Compute (996 + 93) × 100 = 1089 × 100.",
        "Add 96 × 93 = 8928 to that product."
      ]
    },
    {
      "id": "lesson1-secret15-q02",
      "expression": "1003 × 1013",
      "hints": [
        "1003 and 1013 are above 1000 — ending parts 3 and 13.",
        "Compute (1003 + 13) × 1000 = 1016 × 1000.",
        "Add 3 × 13 = 39 to that product."
      ]
    },
    {
      "id": "lesson1-secret15-q03",
      "expression": "989 × 998",
      "hints": [
        "989 and 998 are above 100 — ending parts 89 and 98.",
        "Compute (989 + 98) × 100 = 1087 × 100.",
        "Add 89 × 98 = 8722 to that product."
      ]
    },
    {
      "id": "lesson1-secret15-q04",
      "expression": "496 × 498",
      "hints": [
        "496 and 498 are above 100 — ending parts 96 and 98.",
        "Compute (496 + 98) × 100 = 594 × 100.",
        "Add 96 × 98 = 9408 to that product."
      ]
    },
    {
      "id": "lesson1-secret15-q05",
      "expression": "295 × 294",
      "hints": [
        "295 and 294 are above 100 — ending parts 95 and 94.",
        "Compute (295 + 94) × 100 = 389 × 100.",
        "Add 95 × 94 = 8930 to that product."
      ]
    },
    {
      "id": "lesson1-secret15-q06",
      "expression": "302 × 309",
      "hints": [
        "302 and 309 are above 100 — ending parts 2 and 9.",
        "Compute (302 + 9) × 100 = 311 × 100.",
        "Add 2 × 9 = 18 to that product."
      ]
    },
    {
      "id": "lesson1-secret15-q07",
      "expression": "1008 × 992",
      "hints": [
        "1008 and 992 straddle 1000 — complement of 992 is 8.",
        "Compute (1008 − 8) × 1000 = 1000 × 1000.",
        "Subtract 8 × 8 = 64 from that product."
      ]
    },
    {
      "id": "lesson1-secret15-q08",
      "expression": "1010 × 1014",
      "hints": [
        "1010 and 1014 are above 1000 — ending parts 10 and 14.",
        "Compute (1010 + 14) × 1000 = 1024 × 1000.",
        "Add 10 × 14 = 140 to that product."
      ]
    },
    {
      "id": "lesson1-secret15-q09",
      "expression": "102 × 206 × 2",
      "hints": [
        "102 and 206 are above 100 — ending parts 2 and 6.",
        "Compute (102 + 6) × 100 = 108 × 100.",
        "Add 2 × 6 = 12 to that product."
      ]
    },
    {
      "id": "lesson1-secret15-q10",
      "expression": "1008 × 2 × 503",
      "hints": [
        "1008 and 2 straddle 1000 — complement of 2 is 998.",
        "Compute (1008 − 998) × 1000 = 10 × 1000.",
        "Subtract 998 × 8 = 7984 from that product."
      ]
    },
    {
      "id": "lesson1-secret15-q11",
      "expression": "314 × 612",
      "hints": [
        "314 and 612 are above 100 — ending parts 14 and 12.",
        "Compute (314 + 12) × 100 = 326 × 100.",
        "Add 14 × 12 = 168 to that product."
      ]
    },
    {
      "id": "lesson1-secret15-q12",
      "expression": "496 × 1008",
      "hints": [
        "496 and 1008 straddle 1000 — complement of 496 is 504.",
        "Compute (1008 − 504) × 1000 = 504 × 1000.",
        "Subtract 504 × 8 = 4032 from that product."
      ]
    }
  ]
} as const;
