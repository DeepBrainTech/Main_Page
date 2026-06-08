import type { MentalMathSecret } from "@/types/learning";

export const SECRET9: MentalMathSecret = {
  "key": "secret9",
  "sourceTopicNumber": 27,
  "title": "Multiplying “Sum-to-9” Numbers by Consecutive Numbers",
  "techniqueSummary": "Calculate: (leading digit of the “sum-to-9” number + 1) × leading digit of the consecutive number Place the result at the front. Multiply: complement of the smaller ending digit × complement of the larger ending digit Place the result at the back. If the ending product is less than 10, add a leading zero. Example 1",
  "review": [
    "Calculate: (leading digit of the “sum-to-9” number + 1) × leading digit of the consecutive number",
    "Place the result at the front.",
    "Multiply: complement of the smaller ending digit × complement of the larger ending digit",
    "Place the result at the back.",
    "If the ending product is less than 10, add a leading zero.",
    "Example 1",
    "34 × 36",
    "→ (3 + 1) × 3",
    "→ 4 × 3 = 12",
    "→ 4 × 6 = 24",
    "→ 1224",
    "Example 2",
    "45 × 45",
    "→ (4 + 1) × 4",
    "→ 20",
    "→ 5 × 5 = 25",
    "→ 2025"
  ],
  "questions": [
    {
      "id": "lesson5-secret9-q01",
      "expression": "54 × 56",
      "hints": [
        "54's digits sum to 9 — pair with 56.",
        "Front: (5 + 1) × 5 = 30. Back: 4 × 6 = 24.",
        "Place 30 at the front and 24 at the back — pad with 0 if the back product is one digit."
      ]
    },
    {
      "id": "lesson5-secret9-q02",
      "expression": "63 × 67",
      "hints": [
        "63's digits sum to 9 — pair with 67.",
        "Front: (6 + 1) × 6 = 42. Back: 3 × 7 = 21.",
        "Place 42 at the front and 21 at the back — pad with 0 if the back product is one digit."
      ]
    },
    {
      "id": "lesson5-secret9-q03",
      "expression": "78 × 45",
      "hints": [
        "45's digits sum to 9 — pair with 78.",
        "Front: (4 + 1) × 7 = 35. Back: 2 × 5 = 10.",
        "Place 35 at the front and 10 at the back — pad with 0 if the back product is one digit."
      ]
    },
    {
      "id": "lesson5-secret9-q04",
      "expression": "54 × 78",
      "hints": [
        "54's digits sum to 9 — pair with 78.",
        "Front: (5 + 1) × 7 = 42. Back: 2 × 6 = 12.",
        "Place 42 at the front and 12 at the back — pad with 0 if the back product is one digit."
      ]
    },
    {
      "id": "lesson5-secret9-q05",
      "expression": "23 × 72",
      "hints": [
        "72's digits sum to 9 — pair with 23.",
        "Front: (7 + 1) × 2 = 16. Back: 7 × 8 = 56.",
        "Place 16 at the front and 56 at the back — pad with 0 if the back product is one digit."
      ]
    },
    {
      "id": "lesson5-secret9-q06",
      "expression": "67 × 27",
      "hints": [
        "27's digits sum to 9 — pair with 67.",
        "Front: (2 + 1) × 6 = 18. Back: 3 × 3 = 9.",
        "Place 18 at the front and 09 at the back — pad with 0 if the back product is one digit."
      ]
    },
    {
      "id": "lesson5-secret9-q07",
      "expression": "78 × 72",
      "hints": [
        "72's digits sum to 9 — pair with 78.",
        "Front: (7 + 1) × 7 = 56. Back: 2 × 8 = 16.",
        "Place 56 at the front and 16 at the back — pad with 0 if the back product is one digit."
      ]
    },
    {
      "id": "lesson5-secret9-q08",
      "expression": "81 × 67",
      "hints": [
        "81's digits sum to 9 — pair with 67.",
        "Front: (8 + 1) × 6 = 54. Back: 3 × 9 = 27.",
        "Place 54 at the front and 27 at the back — pad with 0 if the back product is one digit."
      ]
    },
    {
      "id": "lesson5-secret9-q09",
      "expression": "63 × 89",
      "hints": [
        "63's digits sum to 9 — pair with 89.",
        "Front: (6 + 1) × 8 = 56. Back: 1 × 7 = 7.",
        "Place 56 at the front and 07 at the back — pad with 0 if the back product is one digit."
      ]
    },
    {
      "id": "lesson5-secret9-q10",
      "expression": "67 × 72",
      "hints": [
        "72's digits sum to 9 — pair with 67.",
        "Front: (7 + 1) × 6 = 48. Back: 3 × 8 = 24.",
        "Place 48 at the front and 24 at the back — pad with 0 if the back product is one digit."
      ]
    },
    {
      "id": "lesson5-secret9-q11",
      "expression": "89 × 72",
      "hints": [
        "72's digits sum to 9 — pair with 89.",
        "Front: (7 + 1) × 8 = 64. Back: 1 × 8 = 8.",
        "Place 64 at the front and 08 at the back — pad with 0 if the back product is one digit."
      ]
    },
    {
      "id": "lesson5-secret9-q12",
      "expression": "81 × 78",
      "hints": [
        "81's digits sum to 9 — pair with 78.",
        "Front: (8 + 1) × 7 = 63. Back: 2 × 9 = 18.",
        "Place 63 at the front and 18 at the back — pad with 0 if the back product is one digit."
      ]
    },
    {
      "id": "lesson5-secret9-q13",
      "expression": "8 × 89 × 9",
      "hints": [
        "Find the sum-to-9 factor and its consecutive partner.",
        "Front = (leading digit + 1) × partner's leading digit.",
        "Back = complement of smaller ones × complement of larger ones."
      ]
    },
    {
      "id": "lesson5-secret9-q14",
      "expression": "9 × 78 × 9",
      "hints": [
        "Find the sum-to-9 factor and its consecutive partner.",
        "Front = (leading digit + 1) × partner's leading digit.",
        "Back = complement of smaller ones × complement of larger ones."
      ]
    },
    {
      "id": "lesson5-secret9-q15",
      "expression": "7 × 67 + 67 × 29",
      "hints": [
        "Find the sum-to-9 factor and its consecutive partner.",
        "Front = (leading digit + 1) × partner's leading digit.",
        "Back = complement of smaller ones × complement of larger ones."
      ]
    },
    {
      "id": "lesson5-secret9-q16",
      "expression": "61 × 56 − 34 × 56",
      "hints": [
        "Find the sum-to-9 factor and its consecutive partner.",
        "Front = (leading digit + 1) × partner's leading digit.",
        "Back = complement of smaller ones × complement of larger ones."
      ]
    },
    {
      "id": "lesson5-secret9-q17",
      "expression": "54 × 36 + 54 × 63",
      "hints": [
        "54's digits sum to 9 — pair with 36.",
        "Front: (5 + 1) × 3 = 18. Back: 4 × 6 = 24.",
        "Place 18 at the front and 24 at the back — pad with 0 if the back product is one digit."
      ]
    },
    {
      "id": "lesson5-secret9-q18",
      "expression": "45 × 27 + 45 × 72",
      "hints": [
        "45's digits sum to 9 — pair with 27.",
        "Front: (4 + 1) × 2 = 10. Back: 3 × 5 = 15.",
        "Place 10 at the front and 15 at the back — pad with 0 if the back product is one digit."
      ]
    }
  ]
} as const;
