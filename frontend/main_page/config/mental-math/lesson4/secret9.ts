import type { MentalMathSecret } from "@/types/learning";

export const SECRET9: MentalMathSecret = {
  "key": "secret9",
  "sourceTopicNumber": 54,
  "title": "Using the “Butterfly Method” for Fraction Subtraction",
  "techniqueSummary": "Circle the numerator of the minuend and the denominator of the subtrahend. Multiply them together. Then circle the numerator of the subtrahend and the denominator of the minuend. Multiply them together. Find the product of the two denominators. Use the denominator product as the denominator of the final answer.",
  "review": [
    "Circle the numerator of the minuend and the denominator of the subtrahend.",
    "Multiply them together.",
    "Then circle the numerator of the subtrahend and the denominator of the minuend.",
    "Multiply them together.",
    "Find the product of the two denominators.",
    "Use the denominator product as the denominator of the final answer.",
    "Use the difference of the two cross-products as the numerator.",
    "This method follows the same crossing pattern as the Butterfly Method used in fraction addition.",
    "Example 1",
    "5/6 − 2/9",
    "→ 5 × 9 = 45",
    "→ 2 × 6 = 12",
    "→ 6 × 9 = 54",
    "→ (45 − 12) / 54",
    "→ 33/54",
    "→ 11/18",
    "Example 2",
    "7/8 − 3/10",
    "→ 7 × 10 = 70",
    "→ 3 × 8 = 24",
    "→ 8 × 10 = 80",
    "→ (70 − 24) / 80",
    "→ 46/80",
    "→ 23/40"
  ],
  "questions": [
    {
      "id": "lesson4-secret9-q01",
      "expression": "5/6 − 2/9",
      "hints": [
        "Butterfly for 5/6 − 2/9.",
        "Top: 5×9 − 2×6; bottom: 6×9.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    },
    {
      "id": "lesson4-secret9-q02",
      "expression": "7/8 − 3/10",
      "hints": [
        "Butterfly for 7/8 − 3/10.",
        "Top: 7×10 − 3×8; bottom: 8×10.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    },
    {
      "id": "lesson4-secret9-q03",
      "expression": "11/12 − 5/18",
      "hints": [
        "Butterfly for 11/12 − 5/18.",
        "Top: 11×18 − 5×12; bottom: 12×18.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    },
    {
      "id": "lesson4-secret9-q04",
      "expression": "13/15 − 7/20",
      "hints": [
        "Butterfly for 13/15 − 7/20.",
        "Top: 13×20 − 7×15; bottom: 15×20.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    },
    {
      "id": "lesson4-secret9-q05",
      "expression": "5/9 − 1/6",
      "hints": [
        "Butterfly for 5/9 − 1/6.",
        "Top: 5×6 − 1×9; bottom: 9×6.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    },
    {
      "id": "lesson4-secret9-q06",
      "expression": "7/11 − 2/5",
      "hints": [
        "Butterfly for 7/11 − 2/5.",
        "Top: 7×5 − 2×11; bottom: 11×5.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    },
    {
      "id": "lesson4-secret9-q07",
      "expression": "17/21 − 5/14",
      "hints": [
        "Butterfly for 17/21 − 5/14.",
        "Top: 17×14 − 5×21; bottom: 21×14.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    },
    {
      "id": "lesson4-secret9-q08",
      "expression": "19/24 − 7/16",
      "hints": [
        "Butterfly for 19/24 − 7/16.",
        "Top: 19×16 − 7×24; bottom: 24×16.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    },
    {
      "id": "lesson4-secret9-q09",
      "expression": "23/30 − 11/18",
      "hints": [
        "Butterfly for 23/30 − 11/18.",
        "Top: 23×18 − 11×30; bottom: 30×18.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    },
    {
      "id": "lesson4-secret9-q10",
      "expression": "29/35 − 13/21",
      "hints": [
        "Butterfly for 29/35 − 13/21.",
        "Top: 29×21 − 13×35; bottom: 35×21.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    },
    {
      "id": "lesson4-secret9-q11",
      "expression": "13/20 − 7/15",
      "hints": [
        "Butterfly for 13/20 − 7/15.",
        "Top: 13×15 − 7×20; bottom: 20×15.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    },
    {
      "id": "lesson4-secret9-q12",
      "expression": "17/28 − 11/24",
      "hints": [
        "Butterfly for 17/28 − 11/24.",
        "Top: 17×24 − 11×28; bottom: 28×24.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    },
    {
      "id": "lesson4-secret9-q13",
      "expression": "31/42 − 19/30",
      "hints": [
        "Butterfly for 31/42 − 19/30.",
        "Top: 31×30 − 19×42; bottom: 42×30.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    },
    {
      "id": "lesson4-secret9-q14",
      "expression": "37/45 − 23/36",
      "hints": [
        "Butterfly for 37/45 − 23/36.",
        "Top: 37×36 − 23×45; bottom: 45×36.",
        "Subtract the cross products — same denominator from the butterfly."
      ]
    }
  ]
} as const;
