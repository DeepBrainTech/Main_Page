/** Shop item ids (backend shop_items). Full-course diamond unlock: learningCommerce.ts */
import type { MentalMathCategoryKey } from "@/types/learning";

export const MENTAL_MATH_SHOP_GAME_MODE = "learning-mental-math";

export const MENTAL_MATH_CATEGORY_ITEM_IDS: Partial<Record<MentalMathCategoryKey, string>> = {
  lesson1: "learning_mental_math_making_whole",
  lesson2: "learning_mental_math_break_into_parts",
  lesson3: "learning_mental_math_rearrange",
  lesson4: "learning_mental_math_round_and_adjust",
  lesson5: "learning_mental_math_left_to_right_flow",
};
