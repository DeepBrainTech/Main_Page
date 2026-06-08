import type { MentalMathSecret } from "@/types/learning";

export const SECRET11: MentalMathSecret = {
  "key": "secret11",
  "sourceTopicNumber": 36,
  "title": "Multiplying a Number in the 90s by a Number Just Over 100",
  "techniqueSummary": "Use 100 as the benchmark number. Find the complement of the number in the 90s from 100. Subtract that complement from the number just over 100. Multiply the result by 100. Then subtract: the complement × the ones digit of the number just over 100. Example 1",
  "review": [
    "Use 100 as the benchmark number.",
    "Find the complement of the number in the 90s from 100.",
    "Subtract that complement from the number just over 100.",
    "Multiply the result by 100.",
    "Then subtract: the complement × the ones digit of the number just over 100.",
    "Example 1",
    "97 × 104",
    "→ 97 is 3 less than 100",
    "→ 104 − 3 = 101",
    "→ 101 × 100 = 10100",
    "→ 3 × 4 = 12",
    "→ 10100 − 12 = 10088",
    "Example 2",
    "94 × 108",
    "→ 94 is 6 less than 100",
    "→ 108 − 6 = 102",
    "→ 102 × 100 = 10200",
    "→ 6 × 8 = 48",
    "→ 10200 − 48 = 10152"
  ],
  "questions": [
    {
      "id": "lesson1-secret11-q01",
      "expression": "96 × 103",
      "hints": [
        "96 is 4 below 100; 103 is just above 100.",
        "Subtract 4 from 103: 103 − 4 = 99.",
        "Multiply 99 × 100, then subtract 4 × 3 (complement × ones digit of 103)."
      ]
    },
    {
      "id": "lesson1-secret11-q02",
      "expression": "92 × 105",
      "hints": [
        "92 is 8 below 100; 105 is just above 100.",
        "Subtract 8 from 105: 105 − 8 = 97.",
        "Multiply 97 × 100, then subtract 8 × 5 (complement × ones digit of 105)."
      ]
    },
    {
      "id": "lesson1-secret11-q03",
      "expression": "98 × 107",
      "hints": [
        "98 is 2 below 100; 107 is just above 100.",
        "Subtract 2 from 107: 107 − 2 = 105.",
        "Multiply 105 × 100, then subtract 2 × 7 (complement × ones digit of 107)."
      ]
    },
    {
      "id": "lesson1-secret11-q04",
      "expression": "94 × 106",
      "hints": [
        "94 is 6 below 100; 106 is just above 100.",
        "Subtract 6 from 106: 106 − 6 = 100.",
        "Multiply 100 × 100, then subtract 6 × 6 (complement × ones digit of 106)."
      ]
    },
    {
      "id": "lesson1-secret11-q05",
      "expression": "91 × 108",
      "hints": [
        "91 is 9 below 100; 108 is just above 100.",
        "Subtract 9 from 108: 108 − 9 = 99.",
        "Multiply 99 × 100, then subtract 9 × 8 (complement × ones digit of 108)."
      ]
    },
    {
      "id": "lesson1-secret11-q06",
      "expression": "97 × 102",
      "hints": [
        "97 is 3 below 100; 102 is just above 100.",
        "Subtract 3 from 102: 102 − 3 = 99.",
        "Multiply 99 × 100, then subtract 3 × 2 (complement × ones digit of 102)."
      ]
    }
  ]
} as const;
