import { SECRET1 } from "./secret1";
import { SECRET2 } from "./secret2";
import { SECRET3 } from "./secret3";
import { SECRET4 } from "./secret4";
import { SECRET5 } from "./secret5";
import { SECRET6 } from "./secret6";
import { SECRET7 } from "./secret7";
import { SECRET8 } from "./secret8";
import { SECRET9 } from "./secret9";
import { SECRET10 } from "./secret10";
import { SECRET11 } from "./secret11";
import { SECRET12 } from "./secret12";
import { SECRET13 } from "./secret13";
import { SECRET14 } from "./secret14";
import { SECRET15 } from "./secret15";
import { SECRET16 } from "./secret16";
import { SECRET17 } from "./secret17";
import { SECRET18 } from "./secret18";
import { SECRET19 } from "./secret19";
import { SECRET20 } from "./secret20";
import type { MentalMathLesson } from "@/types/learning";

export const LESSON1 = {
  key: "lesson1",
  title: "Benchmark Thinking",
  zhTitle: "基准数思维",
  secrets: [
    SECRET1,
    SECRET2,
    SECRET3,
    SECRET4,
    SECRET5,
    SECRET6,
    SECRET7,
    SECRET8,
    SECRET9,
    SECRET10,
    SECRET11,
    SECRET12,
    SECRET13,
    SECRET14,
    SECRET15,
    SECRET16,
    SECRET17,
    SECRET18,
    SECRET19,
    SECRET20,
  ],
} as const satisfies MentalMathLesson;
