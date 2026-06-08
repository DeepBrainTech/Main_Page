import type { MentalMathSecret } from "@/types/learning";

export const SECRET14: MentalMathSecret = {
  "key": "secret14",
  "sourceTopicNumber": 40,
  "title": "Multiplying Numbers Close to 200",
  "techniqueSummary": "Method 1 — Both Factors Are Less Than 200 Use: ( larger factor − smaller factor’s complement ) × 200 + ( larger factor’s complement × smaller factor’s complement ) The complements are found using 200 as the benchmark number. Example 1 196 × 192",
  "review": [
    "Method 1 — Both Factors Are Less Than 200",
    "Use:",
    "( larger factor − smaller factor’s complement ) × 200 + ( larger factor’s complement × smaller factor’s complement )",
    "The complements are found using 200 as the benchmark number.",
    "Example 1",
    "196 × 192",
    "→ Complements: 4 and 8",
    "→ (196 − 8) × 200 + (4 × 8)",
    "→ 188 × 200 + 32",
    "→ 37600 + 32",
    "→ 37632",
    "Example 2",
    "184 × 197",
    "→ Complements: 16 and 3",
    "→ (197 − 16) × 200 + (16 × 3)",
    "→ 181 × 200 + 48",
    "→ 36200 + 48",
    "→ 36248",
    "Method 2 — One Factor Greater Than 200 and One Factor Less Than 200",
    "Use:",
    "( larger factor − smaller factor’s complement ) × 200 − ( smaller factor’s complement × larger factor’s ending part )",
    "The complements are found using 200 as the benchmark number.",
    "Example 1",
    "208 × 194",
    "→ Complement of 194 is 6",
    "→ Ending part of 208 is 8",
    "→ (208 − 6) × 200 − (6 × 8)",
    "→ 202 × 200 − 48",
    "→ 40400 − 48",
    "→ 40352",
    "Example 2",
    "217 × 198",
    "→ Complement of 198 is 2",
    "→ Ending part of 217 is 17",
    "→ (217 − 2) × 200 − (2 × 17)",
    "→ 215 × 200 − 34",
    "→ 43000 − 34",
    "→ 42966",
    "Method 3 — Both Factors Are Greater Than 200",
    "Use:",
    "( one factor + the other factor’s ending part ) × 200 + ( one factor’s ending part × the other factor’s ending part )",
    "Example 1",
    "206 × 213",
    "→ Ending parts: 6 and 13",
    "→ (206 + 13) × 200 + (6 × 13)",
    "→ 219 × 200 + 78",
    "→ 43800 + 78",
    "→ 43878",
    "Example 2",
    "224 × 218",
    "→ Ending parts: 24 and 18",
    "→ (224 + 18) × 200 + (24 × 18)",
    "→ 242 × 200 + 432",
    "→ 48400 + 432",
    "→ 48832"
  ],
  "questions": [
    {
      "id": "lesson1-secret14-q01",
      "expression": "198 × 196",
      "hints": [
        "198 is 2 below 200; 196 is 4 below 200 — complements from 200.",
        "Compute (198 − 2) × 200 = 196 × 200.",
        "Add 2 × 2 = 4 to that product."
      ]
    },
    {
      "id": "lesson1-secret14-q02",
      "expression": "194 × 187",
      "hints": [
        "194 is 6 below 200; 187 is 13 below 200 — complements from 200.",
        "Compute (194 − 6) × 200 = 188 × 200.",
        "Add 6 × 6 = 36 to that product."
      ]
    },
    {
      "id": "lesson1-secret14-q03",
      "expression": "205 × 197",
      "hints": [
        "205 and 197 straddle 200 — complement of 197 from 200 is 3.",
        "Compute (205 − 3) × 200 = 202 × 200.",
        "Subtract 3 × 5 = 15 from that product."
      ]
    },
    {
      "id": "lesson1-secret14-q04",
      "expression": "208 × 203",
      "hints": [
        "208 and 203 straddle 200 — complement of 203 from 200 is -3.",
        "Compute (208 − -3) × 200 = 211 × 200.",
        "Subtract -3 × 8 = -24 from that product."
      ]
    },
    {
      "id": "lesson1-secret14-q05",
      "expression": "214 × 219",
      "hints": [
        "214 and 219 straddle 200 — complement of 214 from 200 is -14.",
        "Compute (219 − -14) × 200 = 233 × 200.",
        "Subtract -14 × 19 = -266 from that product."
      ]
    },
    {
      "id": "lesson1-secret14-q06",
      "expression": "192 × 199",
      "hints": [
        "192 is 8 below 200; 199 is 1 below 200 — complements from 200.",
        "Compute (199 − 1) × 200 = 198 × 200.",
        "Add 1 × 1 = 1 to that product."
      ]
    },
    {
      "id": "lesson1-secret14-q07",
      "expression": "184 × 193",
      "hints": [
        "184 is 16 below 200; 193 is 7 below 200 — complements from 200.",
        "Compute (193 − 7) × 200 = 186 × 200.",
        "Add 7 × 7 = 49 to that product."
      ]
    },
    {
      "id": "lesson1-secret14-q08",
      "expression": "217 × 196",
      "hints": [
        "217 and 196 straddle 200 — complement of 196 from 200 is 4.",
        "Compute (217 − 4) × 200 = 213 × 200.",
        "Subtract 4 × 17 = 68 from that product."
      ]
    },
    {
      "id": "lesson1-secret14-q09",
      "expression": "226 × 208",
      "hints": [
        "226 and 208 straddle 200 — complement of 208 from 200 is -8.",
        "Compute (226 − -8) × 200 = 234 × 200.",
        "Subtract -8 × 26 = -208 from that product."
      ]
    },
    {
      "id": "lesson1-secret14-q10",
      "expression": "189 × 194",
      "hints": [
        "189 is 11 below 200; 194 is 6 below 200 — complements from 200.",
        "Compute (194 − 6) × 200 = 188 × 200.",
        "Add 6 × 6 = 36 to that product."
      ]
    },
    {
      "id": "lesson1-secret14-q11",
      "expression": "212 × 218",
      "hints": [
        "212 and 218 straddle 200 — complement of 212 from 200 is -12.",
        "Compute (218 − -12) × 200 = 230 × 200.",
        "Subtract -12 × 18 = -216 from that product."
      ]
    },
    {
      "id": "lesson1-secret14-q12",
      "expression": "207 × 204",
      "hints": [
        "207 and 204 straddle 200 — complement of 204 from 200 is -4.",
        "Compute (207 − -4) × 200 = 211 × 200.",
        "Subtract -4 × 7 = -28 from that product."
      ]
    },
    {
      "id": "lesson1-secret14-q13",
      "expression": "196 × 204",
      "hints": [
        "196 and 204 straddle 200 — complement of 196 from 200 is 4.",
        "Compute (204 − 4) × 200 = 200 × 200.",
        "Subtract 4 × 4 = 16 from that product."
      ]
    },
    {
      "id": "lesson1-secret14-q14",
      "expression": "188 × 212",
      "hints": [
        "188 and 212 straddle 200 — complement of 188 from 200 is 12.",
        "Compute (212 − 12) × 200 = 200 × 200.",
        "Subtract 12 × 12 = 144 from that product."
      ]
    },
    {
      "id": "lesson1-secret14-q15",
      "expression": "224 × 197",
      "hints": [
        "224 and 197 straddle 200 — complement of 197 from 200 is 3.",
        "Compute (224 − 3) × 200 = 221 × 200.",
        "Subtract 3 × 24 = 72 from that product."
      ]
    },
    {
      "id": "lesson1-secret14-q16",
      "expression": "218 × 216",
      "hints": [
        "218 and 216 straddle 200 — complement of 216 from 200 is -16.",
        "Compute (218 − -16) × 200 = 234 × 200.",
        "Subtract -16 × 18 = -288 from that product."
      ]
    },
    {
      "id": "lesson1-secret14-q17",
      "expression": "193 × 207",
      "hints": [
        "193 and 207 straddle 200 — complement of 193 from 200 is 7.",
        "Compute (207 − 7) × 200 = 200 × 200.",
        "Subtract 7 × 7 = 49 from that product."
      ]
    },
    {
      "id": "lesson1-secret14-q18",
      "expression": "228 × 214",
      "hints": [
        "228 and 214 straddle 200 — complement of 214 from 200 is -14.",
        "Compute (228 − -14) × 200 = 242 × 200.",
        "Subtract -14 × 28 = -392 from that product."
      ]
    }
  ]
} as const;
