import type { MentalMathSecret } from "@/types/learning";

export const SECRET20: MentalMathSecret = {
  "key": "secret20",
  "sourceTopicNumber": 52,
  "title": "Using the Rounding Strategy for Fraction Subtraction",
  "techniqueSummary": "When the minuend and subtrahend have the same denominator: First subtract the fraction with the matching denominator directly. Then simplify the remaining expression. When several subtrahends have the same denominator but differ from the denominator of the minuend: First add the fractions with the same denominator together. Then subtract their sum from the minuend.",
  "review": [
    "When the minuend and subtrahend have the same denominator:",
    "First subtract the fraction with the matching denominator directly.",
    "Then simplify the remaining expression.",
    "When several subtrahends have the same denominator but differ from the denominator of the minuend:",
    "First add the fractions with the same denominator together.",
    "Then subtract their sum from the minuend.",
    "This strategy helps simplify fraction subtraction mentally.",
    "Example 1",
    "23/24 − 9/24 − 3/14",
    "→ (23/24 − 9/24) − 3/14",
    "→ 14/24 − 3/14",
    "→ 7/12 − 3/14",
    "→ 31/84",
    "Example 2",
    "19/20 − 11/45 − 19/45",
    "→ 19/20 − (11/45 + 19/45)",
    "→ 19/20 − 30/45",
    "→ 19/20 − 2/3",
    "→ 17/60"
  ],
  "questions": [
    {
      "id": "lesson1-secret20-q01",
      "expression": "23/24 − 9/24 − 5/12",
      "hints": [
        "In 23/24 − 9/24 − 5/12, 23/24 and 9/24 share denominator 24.",
        "Subtract like fractions first: 23/24 − 9/24.",
        "Simplify the result, then handle any remaining unlike terms."
      ]
    },
    {
      "id": "lesson1-secret20-q02",
      "expression": "17/18 − 13/18 − 5/9",
      "hints": [
        "In 17/18 − 13/18 − 5/9, 17/18 and 13/18 share denominator 18.",
        "Subtract like fractions first: 17/18 − 13/18.",
        "Simplify the result, then handle any remaining unlike terms."
      ]
    },
    {
      "id": "lesson1-secret20-q03",
      "expression": "19/16 − 3/64 − 8/16",
      "hints": [
        "In 19/16 − 3/64 − 8/16, 19/16 and 8/16 share denominator 16.",
        "Subtract like fractions first: 19/16 − 8/16.",
        "Simplify the result, then handle any remaining unlike terms."
      ]
    },
    {
      "id": "lesson1-secret20-q04",
      "expression": "19/20 − 11/45 − 19/45",
      "hints": [
        "Fraction chain 19/20 − 11/45 − 19/45 — look for matching denominators.",
        "Subtract or combine like fractions before unlike ones.",
        "Simplify each step before moving to the next subtraction."
      ]
    },
    {
      "id": "lesson1-secret20-q05",
      "expression": "29/12 − 25/36 − 7/4",
      "hints": [
        "Fraction chain 29/12 − 25/36 − 7/4 — look for matching denominators.",
        "Subtract or combine like fractions before unlike ones.",
        "Simplify each step before moving to the next subtraction."
      ]
    },
    {
      "id": "lesson1-secret20-q06",
      "expression": "5/3 − 2/9 − 4/3",
      "hints": [
        "In 5/3 − 2/9 − 4/3, 5/3 and 4/3 share denominator 3.",
        "Subtract like fractions first: 5/3 − 4/3.",
        "Simplify the result, then handle any remaining unlike terms."
      ]
    },
    {
      "id": "lesson1-secret20-q07",
      "expression": "17/15 − 4/15 − 2/5",
      "hints": [
        "In 17/15 − 4/15 − 2/5, 17/15 and 4/15 share denominator 15.",
        "Subtract like fractions first: 17/15 − 4/15.",
        "Simplify the result, then handle any remaining unlike terms."
      ]
    },
    {
      "id": "lesson1-secret20-q08",
      "expression": "31/28 − 9/14 − 11/28",
      "hints": [
        "In 31/28 − 9/14 − 11/28, 31/28 and 11/28 share denominator 28.",
        "Subtract like fractions first: 31/28 − 11/28.",
        "Simplify the result, then handle any remaining unlike terms."
      ]
    },
    {
      "id": "lesson1-secret20-q09",
      "expression": "41/30 − 7/15 − 13/30",
      "hints": [
        "In 41/30 − 7/15 − 13/30, 41/30 and 13/30 share denominator 30.",
        "Subtract like fractions first: 41/30 − 13/30.",
        "Simplify the result, then handle any remaining unlike terms."
      ]
    },
    {
      "id": "lesson1-secret20-q10",
      "expression": "25/18 − 11/36 − 5/9",
      "hints": [
        "Fraction chain 25/18 − 11/36 − 5/9 — look for matching denominators.",
        "Subtract or combine like fractions before unlike ones.",
        "Simplify each step before moving to the next subtraction."
      ]
    },
    {
      "id": "lesson1-secret20-q11",
      "expression": "13/8 − 5/24 − 7/12",
      "hints": [
        "Fraction chain 13/8 − 5/24 − 7/12 — look for matching denominators.",
        "Subtract or combine like fractions before unlike ones.",
        "Simplify each step before moving to the next subtraction."
      ]
    },
    {
      "id": "lesson1-secret20-q12",
      "expression": "49/40 − 13/20 − 9/40",
      "hints": [
        "In 49/40 − 13/20 − 9/40, 49/40 and 9/40 share denominator 40.",
        "Subtract like fractions first: 49/40 − 9/40.",
        "Simplify the result, then handle any remaining unlike terms."
      ]
    }
  ]
} as const;
