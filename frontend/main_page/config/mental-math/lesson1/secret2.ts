import type { MentalMathSecret } from "@/types/learning";

export const SECRET2: MentalMathSecret = {
  "key": "secret2",
  "sourceTopicNumber": 2,
  "title": "Subtraction Within 20 (Borrowing)",
  "techniqueSummary": "For subtraction near 10: Subtracting 9 means “subtract 10, then add 1.” Subtracting 8 means “subtract 10, then add 2.” Subtracting 7 means “subtract 10, then add 3.”",
  "review": [
    "For subtraction near 10:",
    "Subtracting 9 means “subtract 10, then add 1.”",
    "Subtracting 8 means “subtract 10, then add 2.”",
    "Subtracting 7 means “subtract 10, then add 3.”"
  ],
  "questions": [
    {
      "id": "lesson1-secret2-q01",
      "expression": "16 − 7",
      "hints": [
        "16 − 7: think “subtract 10, add 3”.",
        "16 − 10 = ? — write that intermediate value.",
        "Now add 3 to recover — what is 16 − 7?"
      ]
    },
    {
      "id": "lesson1-secret2-q02",
      "expression": "15 − 8",
      "hints": [
        "15 − 8: treat 8 as 10 − 2.",
        "Subtract 10 from 15, then add 2 back.",
        "What number do you land on after both adjustments?"
      ]
    },
    {
      "id": "lesson1-secret2-q03",
      "expression": "14 − 6",
      "hints": [
        "14 − 6: treat 6 as 10 − 4.",
        "Subtract 10 from 14, then add 4 back.",
        "What number do you land on after both adjustments?"
      ]
    },
    {
      "id": "lesson1-secret2-q04",
      "expression": "17 − 9",
      "hints": [
        "Subtracting 9 from 17 is the same as subtracting 10, then adding 1.",
        "Compute 17 − 10 first — what do you get?",
        "Add 1 back to fix the over-subtraction — what is the result?"
      ]
    },
    {
      "id": "lesson1-secret2-q05",
      "expression": "13 − 5",
      "hints": [
        "13 − 5: treat 5 as 10 − 5.",
        "Subtract 10 from 13, then add 5 back.",
        "What number do you land on after both adjustments?"
      ]
    },
    {
      "id": "lesson1-secret2-q06",
      "expression": "12 − 7",
      "hints": [
        "12 − 7: think “subtract 10, add 3”.",
        "12 − 10 = ? — write that intermediate value.",
        "Now add 3 to recover — what is 12 − 7?"
      ]
    },
    {
      "id": "lesson1-secret2-q07",
      "expression": "18 − 9",
      "hints": [
        "Subtracting 9 from 18 is the same as subtracting 10, then adding 1.",
        "Compute 18 − 10 first — what do you get?",
        "Add 1 back to fix the over-subtraction — what is the result?"
      ]
    },
    {
      "id": "lesson1-secret2-q08",
      "expression": "11 − 6",
      "hints": [
        "11 − 6: treat 6 as 10 − 4.",
        "Subtract 10 from 11, then add 4 back.",
        "What number do you land on after both adjustments?"
      ]
    },
    {
      "id": "lesson1-secret2-q09",
      "expression": "6 + 7 − 8",
      "hints": [
        "6 + 7 − 8: compute 6 + 7 before subtracting 8.",
        "For 6 + 7: 7 is 3 below 10 — rewrite as 6 + 10 − 3.",
        "Take that sum, subtract 8 — one step at a time."
      ]
    },
    {
      "id": "lesson1-secret2-q10",
      "expression": "5 + 9 − 7",
      "hints": [
        "5 + 9 − 7: compute 5 + 9 before subtracting 7.",
        "For 5 + 9: 9 is 1 below 10 — rewrite as 5 + 10 − 1.",
        "Take that sum, subtract 7 — one step at a time."
      ]
    },
    {
      "id": "lesson1-secret2-q11",
      "expression": "8 + 6 − 9",
      "hints": [
        "8 + 6 − 9: compute 8 + 6 before subtracting 9.",
        "For 8 + 6: 6 is 4 below 10 — rewrite as 8 + 10 − 4.",
        "Take that sum, subtract 9 — one step at a time."
      ]
    },
    {
      "id": "lesson1-secret2-q12",
      "expression": "7 + 8 − 6",
      "hints": [
        "7 + 8 − 6: compute 7 + 8 before subtracting 6.",
        "For 7 + 8: 8 is 2 below 10 — rewrite as 7 + 10 − 2.",
        "Take that sum, subtract 6 — one step at a time."
      ]
    }
  ]
} as const;
