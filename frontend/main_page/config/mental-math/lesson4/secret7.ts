import type { MentalMathSecret } from "@/types/learning";

export const SECRET7: MentalMathSecret = {
  "key": "secret7",
  "sourceTopicNumber": 41,
  "title": "Advanced Strategies for Multiplying by Repeated 9s",
  "techniqueSummary": "Method 1 — The Number Has the Same Number of Digits as the Repeated 9s or Fewer Digits (“Subtract 1 and Fill the Complement” Method) Subtract 1 from the number. Place the result at the front of the answer. Find the complement of the original number.",
  "review": [
    "Method 1 — The Number Has the Same Number of Digits as the Repeated 9s",
    "or Fewer Digits",
    "(“Subtract 1 and Fill the Complement” Method)",
    "Subtract 1 from the number.",
    "Place the result at the front of the answer.",
    "Find the complement of the original number.",
    "Place the complement at the end of the answer.",
    "When finding the complement, use the next whole number after the repeated 9s as the benchmark number.",
    "Example 1",
    "79 × 999",
    "→ 79 − 1 = 78",
    "→ Complement of 79 to 1000 is 921",
    "→ 78921",
    "Example 2",
    "581 × 999",
    "→ 581 − 1 = 580",
    "→ Complement of 581 to 1000 is 419",
    "→ 580419",
    "Method 2 — The Number Has More Digits Than the Repeated 9s",
    "(“Subtract 1, Remove the Front, Fill the Tail Complement” Method)",
    "Subtract 1 from the number.",
    "Remove the leading digit(s) that exceed the number of repeated 9s.",
    "Place the remaining front part at the beginning of the answer.",
    "Find the complement of the ending part of the original number.",
    "Place that complement at the end of the answer.",
    "When finding the complement, use the next multiple of 10 after the repeated 9s as the benchmark number.",
    "Example 1",
    "1209 × 999",
    "→ 1209 − 1 = 1208",
    "→ Front part: 1208 → 120",
    "→ Tail part: 209",
    "→ Complement of 209 to 1000 is 791",
    "→ 1207791",
    "Example 2",
    "6871 × 999",
    "→ 6871 − 1 = 6870",
    "→ Front part: 6870 → 687",
    "→ Tail part: 871",
    "→ Complement of 871 to 1000 is 129",
    "→ 6864129"
  ],
  "questions": [
    {
      "id": "lesson4-secret7-q01",
      "expression": "79 × 999",
      "hints": [
        "79 × 999: subtract 1 from 79 → 78.",
        "Complement of 79 to 1000 is 921.",
        "Place 78 at the front and 921 at the back — join for the product."
      ]
    },
    {
      "id": "lesson4-secret7-q02",
      "expression": "999 × 41",
      "hints": [
        "999 × 41: subtract 1 from 999 → 998.",
        "Complement of 999 to 100 is -899.",
        "Place 998 at the front and -899 at the back — join for the product."
      ]
    },
    {
      "id": "lesson4-secret7-q03",
      "expression": "581 × 99",
      "hints": [
        "581 × 99: subtract 1 from 581 → 580.",
        "Complement of 581 to 100 is -481.",
        "Place 580 at the front and -481 at the back — join for the product."
      ]
    },
    {
      "id": "lesson4-secret7-q04",
      "expression": "465 × 99",
      "hints": [
        "465 × 99: subtract 1 from 465 → 464.",
        "Complement of 465 to 100 is -365.",
        "Place 464 at the front and -365 at the back — join for the product."
      ]
    },
    {
      "id": "lesson4-secret7-q05",
      "expression": "108 × 99",
      "hints": [
        "108 × 99: subtract 1 from 108 → 107.",
        "Complement of 108 to 100 is -8.",
        "Place 107 at the front and -8 at the back — join for the product."
      ]
    },
    {
      "id": "lesson4-secret7-q06",
      "expression": "99 × 429",
      "hints": [
        "99 × 429: subtract 1 from 99 → 98.",
        "Complement of 99 to 1000 is 901.",
        "Place 98 at the front and 901 at the back — join for the product."
      ]
    },
    {
      "id": "lesson4-secret7-q07",
      "expression": "999 × 1209",
      "hints": [
        "999 × 1209: subtract 1 from 999 → 998.",
        "Complement of 999 to 10000 is 9001.",
        "Place 998 at the front and 9001 at the back — join for the product."
      ]
    },
    {
      "id": "lesson4-secret7-q08",
      "expression": "6871 × 999",
      "hints": [
        "6871 × 999: subtract 1 from 6871 → 6870.",
        "Complement of 6871 to 1000 is -5871.",
        "Place 6870 at the front and -5871 at the back — join for the product."
      ]
    },
    {
      "id": "lesson4-secret7-q09",
      "expression": "1016 × 36 − 36 × 17",
      "hints": [
        "1016 × 36: subtract 1 from 1016 → 1015.",
        "Complement of 1016 to 100 is -916.",
        "Place 1015 at the front and -916 at the back — join for the product."
      ]
    },
    {
      "id": "lesson4-secret7-q10",
      "expression": "333 × 53 × 3",
      "hints": [
        "333 × 53: subtract 1 from 333 → 332.",
        "Complement of 333 to 100 is -233.",
        "Place 332 at the front and -233 at the back — join for the product."
      ]
    },
    {
      "id": "lesson4-secret7-q11",
      "expression": "9 × 11 × 362",
      "hints": [
        "9 × 11: subtract 1 from 9 → 8.",
        "Complement of 9 to 100 is 91.",
        "Place 8 at the front and 91 at the back — join for the product."
      ]
    },
    {
      "id": "lesson4-secret7-q12",
      "expression": "27 × 593 + 593 × 72",
      "hints": [
        "27 × 593: subtract 1 from 27 → 26.",
        "Complement of 27 to 1000 is 973.",
        "Place 26 at the front and 973 at the back — join for the product."
      ]
    }
  ]
} as const;
