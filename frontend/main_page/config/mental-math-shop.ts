import type { MentalMathCategoryKey } from "@/types/learning";

export const MENTAL_MATH_SHOP_GAME_MODE = "learning-mental-math";

export const MENTAL_MATH_CATEGORY_ITEM_IDS: Partial<Record<MentalMathCategoryKey, string>> = {
  makingWhole: "learning_mental_math_making_whole",
  breakIntoParts: "learning_mental_math_break_into_parts",
  rearrange: "learning_mental_math_rearrange",
  roundAndAdjust: "learning_mental_math_round_and_adjust",
  leftToRightFlow: "learning_mental_math_left_to_right_flow",
};
