import type { MentalMathSecret } from "@/types/learning";

export const SECRET17: MentalMathSecret = {
  "key": "secret17",
  "sourceTopicNumber": 44,
  "title": "Using the Rounding Strategy for Decimal Subtraction",
  "techniqueSummary": "In decimal subtraction, when the subtrahend is slightly smaller than a whole number: Rewrite the subtrahend as: whole number − the difference Subtract the whole number from the minuend first. Then add back the difference between the subtrahend and the whole number. Rearrange and simplify the expression mentally. Example 1",
  "review": [
    "In decimal subtraction, when the subtrahend is slightly smaller than a whole number:",
    "Rewrite the subtrahend as: whole number − the difference",
    "Subtract the whole number from the minuend first.",
    "Then add back the difference between the subtrahend and the whole number.",
    "Rearrange and simplify the expression mentally.",
    "Example 1",
    "15.6 − 9.8",
    "→ 9.8 = 10 − 0.2",
    "→ 15.6 − 10 + 0.2",
    "→ 5.6 + 0.2",
    "→ 5.8",
    "Example 2",
    "32.4 − 19.7",
    "→ 19.7 = 20 − 0.3",
    "→ 32.4 − 20 + 0.3",
    "→ 12.4 + 0.3",
    "→ 12.7"
  ],
  "questions": [
    {
      "id": "lesson1-secret17-q01",
      "expression": "14.8 − 9.9",
      "hints": [
        "Round 9.9 to 10 — difference is +0.09999999999999964.",
        "Subtract 10 from 14.8 instead of 9.9.",
        "Correct by adding 0.09999999999999964 — you subtracted too much."
      ]
    },
    {
      "id": "lesson1-secret17-q02",
      "expression": "27.5 − 19.8",
      "hints": [
        "Round 19.8 to 20 — difference is +0.1999999999999993.",
        "Subtract 20 from 27.5 instead of 19.8.",
        "Correct by adding 0.1999999999999993 — you subtracted too much."
      ]
    },
    {
      "id": "lesson1-secret17-q03",
      "expression": "53.2 − 29.7",
      "hints": [
        "Round 29.7 to 30 — difference is +0.3000000000000007.",
        "Subtract 30 from 53.2 instead of 29.7.",
        "Correct by adding 0.3000000000000007 — you subtracted too much."
      ]
    },
    {
      "id": "lesson1-secret17-q04",
      "expression": "81.6 − 39.9",
      "hints": [
        "Round 39.9 to 40 — difference is +0.10000000000000142.",
        "Subtract 40 from 81.6 instead of 39.9.",
        "Correct by adding 0.10000000000000142 — you subtracted too much."
      ]
    },
    {
      "id": "lesson1-secret17-q05",
      "expression": "125.4 − 99.8",
      "hints": [
        "Round 99.8 to 100 — difference is +0.20000000000000284.",
        "Subtract 100 from 125.4 instead of 99.8.",
        "Correct by adding 0.20000000000000284 — you subtracted too much."
      ]
    },
    {
      "id": "lesson1-secret17-q06",
      "expression": "348.7 − 199.6",
      "hints": [
        "Round 199.6 to 200 — difference is +0.4000000000000057.",
        "Subtract 200 from 348.7 instead of 199.6.",
        "Correct by adding 0.4000000000000057 — you subtracted too much."
      ]
    },
    {
      "id": "lesson1-secret17-q07",
      "expression": "502.3 − 299.9",
      "hints": [
        "Round 299.9 to 300 — difference is +0.10000000000002274.",
        "Subtract 300 from 502.3 instead of 299.9.",
        "Correct by adding 0.10000000000002274 — you subtracted too much."
      ]
    },
    {
      "id": "lesson1-secret17-q08",
      "expression": "910.5 − 499.7",
      "hints": [
        "Round 499.7 to 500 — difference is +0.30000000000001137.",
        "Subtract 500 from 910.5 instead of 499.7.",
        "Correct by adding 0.30000000000001137 — you subtracted too much."
      ]
    },
    {
      "id": "lesson1-secret17-q09",
      "expression": "25.75 − 9.98",
      "hints": [
        "Round 9.98 to 10 — difference is +0.019999999999999574.",
        "Subtract 10 from 25.75 instead of 9.98.",
        "Correct by adding 0.019999999999999574 — you subtracted too much."
      ]
    },
    {
      "id": "lesson1-secret17-q10",
      "expression": "108.4 − 49.95",
      "hints": [
        "Round 49.95 to 50 — difference is +0.04999999999999716.",
        "Subtract 50 from 108.4 instead of 49.95.",
        "Correct by adding 0.04999999999999716 — you subtracted too much."
      ]
    },
    {
      "id": "lesson1-secret17-q11",
      "expression": "502.08 − 199.97",
      "hints": [
        "Round 199.97 to 200 — difference is +0.030000000000001137.",
        "Subtract 200 from 502.08 instead of 199.97.",
        "Correct by adding 0.030000000000001137 — you subtracted too much."
      ]
    },
    {
      "id": "lesson1-secret17-q12",
      "expression": "1000.6 − 499.8",
      "hints": [
        "Round 499.8 to 500 — difference is +0.19999999999998863.",
        "Subtract 500 from 1000.6 instead of 499.8.",
        "Correct by adding 0.19999999999998863 — you subtracted too much."
      ]
    }
  ]
} as const;
