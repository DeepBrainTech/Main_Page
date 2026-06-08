import type { MentalMathSecret } from "@/types/learning";

export const SECRET3: MentalMathSecret = {
  "key": "secret3",
  "sourceTopicNumber": 15,
  "title": "Finding the Sum of Consecutive Numbers",
  "techniqueSummary": "The sum of consecutive natural numbers can be found using: (number of terms) × (first number + last number) ÷ 2 Example 1 1 + 2 + 3 + 4 + 5 + 6 → 6 × (1 + 6) ÷ 2 → 6 × 7 ÷ 2",
  "review": [
    "The sum of consecutive natural numbers can be found using:",
    "(number of terms) × (first number + last number) ÷ 2",
    "Example 1",
    "1 + 2 + 3 + 4 + 5 + 6",
    "→ 6 × (1 + 6) ÷ 2",
    "→ 6 × 7 ÷ 2",
    "→ 21",
    "Example 2",
    "12 + 13 + 14 + 15 + 16 + 17",
    "→ 6 × (12 + 17) ÷ 2",
    "→ 6 × 29 ÷ 2",
    "→ 87"
  ],
  "questions": [
    {
      "id": "lesson5-secret3-q01",
      "expression": "1 + 2 + 3 + … + 20",
      "hints": [
        "These are 4 consecutive numbers from 1 to 20.",
        "Average is (1 + 20) ÷ 2 — what is that middle value?",
        "Multiply the average by 4 — that is the sum of 1 + 2 + 3 + … + 20."
      ]
    },
    {
      "id": "lesson5-secret3-q02",
      "expression": "15 + 16 + … + 30",
      "hints": [
        "These are 3 consecutive numbers from 15 to 30.",
        "Average is (15 + 30) ÷ 2 — what is that middle value?",
        "Multiply the average by 3 — that is the sum of 15 + 16 + … + 30."
      ]
    },
    {
      "id": "lesson5-secret3-q03",
      "expression": "41 + 42 + … + 50",
      "hints": [
        "These are 3 consecutive numbers from 41 to 50.",
        "Average is (41 + 50) ÷ 2 — what is that middle value?",
        "Multiply the average by 3 — that is the sum of 41 + 42 + … + 50."
      ]
    },
    {
      "id": "lesson5-secret3-q04",
      "expression": "88 + 89 + … + 100",
      "hints": [
        "These are 3 consecutive numbers from 88 to 100.",
        "Average is (88 + 100) ÷ 2 — what is that middle value?",
        "Multiply the average by 3 — that is the sum of 88 + 89 + … + 100."
      ]
    },
    {
      "id": "lesson5-secret3-q05",
      "expression": "7 + 8 + … + 27",
      "hints": [
        "These are 3 consecutive numbers from 7 to 27.",
        "Average is (7 + 27) ÷ 2 — what is that middle value?",
        "Multiply the average by 3 — that is the sum of 7 + 8 + … + 27."
      ]
    },
    {
      "id": "lesson5-secret3-q06",
      "expression": "34 + 35 + … + 49",
      "hints": [
        "These are 3 consecutive numbers from 34 to 49.",
        "Average is (34 + 49) ÷ 2 — what is that middle value?",
        "Multiply the average by 3 — that is the sum of 34 + 35 + … + 49."
      ]
    },
    {
      "id": "lesson5-secret3-q07",
      "expression": "52 + 53 + … + 78",
      "hints": [
        "These are 3 consecutive numbers from 52 to 78.",
        "Average is (52 + 78) ÷ 2 — what is that middle value?",
        "Multiply the average by 3 — that is the sum of 52 + 53 + … + 78."
      ]
    },
    {
      "id": "lesson5-secret3-q08",
      "expression": "105 + 106 + … + 120",
      "hints": [
        "These are 3 consecutive numbers from 105 to 120.",
        "Average is (105 + 120) ÷ 2 — what is that middle value?",
        "Multiply the average by 3 — that is the sum of 105 + 106 + … + 120."
      ]
    },
    {
      "id": "lesson5-secret3-q09",
      "expression": "101 + 102 + … + 150",
      "hints": [
        "These are 3 consecutive numbers from 101 to 150.",
        "Average is (101 + 150) ÷ 2 — what is that middle value?",
        "Multiply the average by 3 — that is the sum of 101 + 102 + … + 150."
      ]
    },
    {
      "id": "lesson5-secret3-q10",
      "expression": "221 + 222 + … + 280",
      "hints": [
        "These are 3 consecutive numbers from 221 to 280.",
        "Average is (221 + 280) ÷ 2 — what is that middle value?",
        "Multiply the average by 3 — that is the sum of 221 + 222 + … + 280."
      ]
    },
    {
      "id": "lesson5-secret3-q11",
      "expression": "75 + 76 + … + 135",
      "hints": [
        "These are 3 consecutive numbers from 75 to 135.",
        "Average is (75 + 135) ÷ 2 — what is that middle value?",
        "Multiply the average by 3 — that is the sum of 75 + 76 + … + 135."
      ]
    },
    {
      "id": "lesson5-secret3-q12",
      "expression": "999 + 1000 + … + 1050",
      "hints": [
        "These are 3 consecutive numbers from 999 to 1050.",
        "Average is (999 + 1050) ÷ 2 — what is that middle value?",
        "Multiply the average by 3 — that is the sum of 999 + 1000 + … + 1050."
      ]
    }
  ]
} as const;
