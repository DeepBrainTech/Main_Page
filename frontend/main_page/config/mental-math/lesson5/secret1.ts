import type { MentalMathSecret } from "@/types/learning";

export const SECRET1: MentalMathSecret = {
  "key": "secret1",
  "sourceTopicNumber": 8,
  "title": "Reverse Number Addition",
  "techniqueSummary": "For two-digit reversed numbers: 58 + 85 First, add the outer digits and place them on the outside of the answer. Then add those two results together and place the sum in the middle. 5+8 = 13 1+3=4 So, the answer is 143",
  "review": [
    "For two-digit reversed numbers: 58 + 85 First, add the outer digits and place them on the outside of the answer. Then add those two results together and place the sum in the middle.",
    "5+8 = 13",
    "1+3=4",
    "So, the answer is 143"
  ],
  "questions": [
    {
      "id": "lesson5-secret1-q01",
      "expression": "47 + 74",
      "hints": [
        "47 + 74 are reverses with digits 4 and 7.",
        "Add the digits: 4 + 7 = 11 — split into 1 and 1 for the outside.",
        "Middle digit is 1 + 1 = 2 — place outside–middle–outside to form the answer."
      ]
    },
    {
      "id": "lesson5-secret1-q02",
      "expression": "63 + 36",
      "hints": [
        "63 and 36 are digit reverses — the digits 6 and 3 swap places.",
        "Add those digits: 6 + 3 = 9.",
        "A one-digit sum gives a repeated pair: think 9 × 11 — what three-digit number is that?"
      ]
    },
    {
      "id": "lesson5-secret1-q03",
      "expression": "28 + 82",
      "hints": [
        "28 + 82 are reverses with digits 2 and 8.",
        "Add the digits: 2 + 8 = 10 — split into 1 and 0 for the outside.",
        "Middle digit is 1 + 0 = 1 — place outside–middle–outside to form the answer."
      ]
    },
    {
      "id": "lesson5-secret1-q04",
      "expression": "54 + 45",
      "hints": [
        "54 and 45 are digit reverses — the digits 5 and 4 swap places.",
        "Add those digits: 5 + 4 = 9.",
        "A one-digit sum gives a repeated pair: think 9 × 11 — what three-digit number is that?"
      ]
    },
    {
      "id": "lesson5-secret1-q05",
      "expression": "79 + 97",
      "hints": [
        "79 + 97 are reverses with digits 7 and 9.",
        "Add the digits: 7 + 9 = 16 — split into 1 and 6 for the outside.",
        "Middle digit is 1 + 6 = 7 — place outside–middle–outside to form the answer."
      ]
    },
    {
      "id": "lesson5-secret1-q06",
      "expression": "68 + 86",
      "hints": [
        "68 + 86 are reverses with digits 6 and 8.",
        "Add the digits: 6 + 8 = 14 — split into 1 and 4 for the outside.",
        "Middle digit is 1 + 4 = 5 — place outside–middle–outside to form the answer."
      ]
    },
    {
      "id": "lesson5-secret1-q07",
      "expression": "66 + 99",
      "hints": [
        "66 + 99 are reverses with digits 6 and 6.",
        "Add the digits: 6 + 6 = 12 — split into 1 and 2 for the outside.",
        "Middle digit is 1 + 2 = 3 — place outside–middle–outside to form the answer."
      ]
    },
    {
      "id": "lesson5-secret1-q08",
      "expression": "87 + 78",
      "hints": [
        "87 + 78 are reverses with digits 8 and 7.",
        "Add the digits: 8 + 7 = 15 — split into 1 and 5 for the outside.",
        "Middle digit is 1 + 5 = 6 — place outside–middle–outside to form the answer."
      ]
    },
    {
      "id": "lesson5-secret1-q09",
      "expression": "58 + 85",
      "hints": [
        "58 + 85 are reverses with digits 5 and 8.",
        "Add the digits: 5 + 8 = 13 — split into 1 and 3 for the outside.",
        "Middle digit is 1 + 3 = 4 — place outside–middle–outside to form the answer."
      ]
    },
    {
      "id": "lesson5-secret1-q10",
      "expression": "46 + 64",
      "hints": [
        "46 + 64 are reverses with digits 4 and 6.",
        "Add the digits: 4 + 6 = 10 — split into 1 and 0 for the outside.",
        "Middle digit is 1 + 0 = 1 — place outside–middle–outside to form the answer."
      ]
    },
    {
      "id": "lesson5-secret1-q11",
      "expression": "39 + 93",
      "hints": [
        "39 + 93 are reverses with digits 3 and 9.",
        "Add the digits: 3 + 9 = 12 — split into 1 and 2 for the outside.",
        "Middle digit is 1 + 2 = 3 — place outside–middle–outside to form the answer."
      ]
    },
    {
      "id": "lesson5-secret1-q12",
      "expression": "77 + 88",
      "hints": [
        "77 + 88 are reverses with digits 7 and 7.",
        "Add the digits: 7 + 7 = 14 — split into 1 and 4 for the outside.",
        "Middle digit is 1 + 4 = 5 — place outside–middle–outside to form the answer."
      ]
    }
  ]
} as const;
