import type { MentalMathSecret } from "@/types/learning";

export const SECRET1: MentalMathSecret = {
  "key": "secret1",
  "sourceTopicNumber": 1,
  "title": "Addition Within 20 (With Carrying)",
  "techniqueSummary": "When adding numbers close to 10: Adding 9 means “add 10, then subtract 1.” Adding 8 means “add 10, then subtract 2.” Adding 7 means “add 10, then subtract 3.”",
  "review": [
    "When adding numbers close to 10:",
    "Adding 9 means “add 10, then subtract 1.”",
    "Adding 8 means “add 10, then subtract 2.”",
    "Adding 7 means “add 10, then subtract 3.”"
  ],
  "questions": [
    {
      "id": "lesson1-secret1-q01",
      "expression": "7 + 6",
      "hints": [
        "In 7 + 6, the 6 is 4 away from 10.",
        "Rewrite as 7 + 10 − 4 — add 10 first, then subtract the gap.",
        "Compute 7 + 10, then subtract 4 — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret1-q02",
      "expression": "8 + 5",
      "hints": [
        "In 8 + 5, the 5 is 5 away from 10.",
        "Rewrite as 8 + 10 − 5 — add 10 first, then subtract the gap.",
        "Compute 8 + 10, then subtract 5 — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret1-q03",
      "expression": "9 + 4",
      "hints": [
        "In 9 + 4, the 4 is 6 away from 10.",
        "Rewrite as 9 + 10 − 6 — add 10 first, then subtract the gap.",
        "Compute 9 + 10, then subtract 6 — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret1-q04",
      "expression": "6 + 8",
      "hints": [
        "In 6 + 8, the 8 is 2 away from 10.",
        "Rewrite as 6 + 10 − 2 — add 10 first, then subtract the gap.",
        "Compute 6 + 10, then subtract 2 — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret1-q05",
      "expression": "7 + 7",
      "hints": [
        "In 7 + 7, the 7 is 3 away from 10.",
        "Rewrite as 7 + 10 − 3 — add 10 first, then subtract the gap.",
        "Compute 7 + 10, then subtract 3 — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret1-q06",
      "expression": "5 + 9",
      "hints": [
        "In 5 + 9, the 9 is 1 away from 10.",
        "Rewrite as 5 + 10 − 1 — add 10 first, then subtract the gap.",
        "Compute 5 + 10, then subtract 1 — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret1-q07",
      "expression": "8 + 6",
      "hints": [
        "In 8 + 6, the 6 is 4 away from 10.",
        "Rewrite as 8 + 10 − 4 — add 10 first, then subtract the gap.",
        "Compute 8 + 10, then subtract 4 — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret1-q08",
      "expression": "4 + 9",
      "hints": [
        "In 4 + 9, the 9 is 1 away from 10.",
        "Rewrite as 4 + 10 − 1 — add 10 first, then subtract the gap.",
        "Compute 4 + 10, then subtract 1 — what do you get?"
      ]
    },
    {
      "id": "lesson1-secret1-q09",
      "expression": "14 − 6 − 3",
      "hints": [
        "Work left to right on 14 − 6 − 3: focus on 14 − 6 first.",
        "6 is 4 below 10 — try 14 − 10 + 4 (subtract 10, then add 4 back).",
        "Take that result and subtract 3 — one step at a time."
      ]
    },
    {
      "id": "lesson1-secret1-q10",
      "expression": "15 − 7 − 2",
      "hints": [
        "Work left to right on 15 − 7 − 2: focus on 15 − 7 first.",
        "7 is 3 below 10 — try 15 − 10 + 3 (subtract 10, then add 3 back).",
        "Take that result and subtract 2 — one step at a time."
      ]
    },
    {
      "id": "lesson1-secret1-q11",
      "expression": "16 − 8 − 4",
      "hints": [
        "Work left to right on 16 − 8 − 4: focus on 16 − 8 first.",
        "8 is 2 below 10 — try 16 − 10 + 2 (subtract 10, then add 2 back).",
        "Take that result and subtract 4 — one step at a time."
      ]
    },
    {
      "id": "lesson1-secret1-q12",
      "expression": "17 − 9 − 3",
      "hints": [
        "Work left to right on 17 − 9 − 3: focus on 17 − 9 first.",
        "9 is 1 below 10 — try 17 − 10 + 1 (subtract 10, then add 1 back).",
        "Take that result and subtract 3 — one step at a time."
      ]
    }
  ]
} as const;
