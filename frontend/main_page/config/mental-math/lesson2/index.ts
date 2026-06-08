import { SECRET1 } from "./secret1";
import { SECRET2 } from "./secret2";
import { SECRET3 } from "./secret3";
import { SECRET4 } from "./secret4";
import { SECRET5 } from "./secret5";
import type { MentalMathLesson } from "@/types/learning";

export const LESSON2 = {
  key: "lesson2",
  title: "Break Apart Thinking",
  zhTitle: "拆分思维",
  secrets: [
    SECRET1,
    SECRET2,
    SECRET3,
    SECRET4,
    SECRET5,
  ],
} as const satisfies MentalMathLesson;
