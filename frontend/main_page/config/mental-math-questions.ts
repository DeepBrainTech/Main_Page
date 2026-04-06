import type { MentalMathQuestionMap, MentalMathSecretKey } from "@/types/learning";

export const MENTAL_MATH_SECRET_ORDER: MentalMathSecretKey[] = [
  "secret1",
  "secret2",
  "secret3",
  "secret4",
  "secret5",
  "secret6",
  "secret7",
  "secret8",
  "secret9",
  "secret10",
];

const ASSESSMENT_POOL_SIZE = 20;
const GENERATION_RETRY_LIMIT = 200;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildQuestion(expression: string): { expression: string } {
  return { expression: `${expression} = ?` };
}

function generateWithRetry(builder: () => string, validator: (expression: string) => boolean): string {
  for (let i = 0; i < GENERATION_RETRY_LIMIT; i += 1) {
    const expression = builder();
    if (validator(expression)) {
      return expression;
    }
  }
  return builder();
}

function sumToTarget(numbers: number[], target: number): boolean {
  for (let i = 0; i < numbers.length; i += 1) {
    for (let j = i + 1; j < numbers.length; j += 1) {
      if (numbers[i] + numbers[j] === target) {
        return true;
      }
    }
  }
  return false;
}

function toNumberList(expression: string): number[] {
  return expression
    .replace(" = ?", "")
    .split(/[+\-]/)
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
}

function parseSubtraction(expression: string): { a: number; b: number } | null {
  const match = expression.match(/^(\d+)\s-\s(\d+)\s=\s\?$/);
  if (!match) {
    return null;
  }
  return { a: Number(match[1]), b: Number(match[2]) };
}

function generateSecret1(): string {
  return generateWithRetry(
    () => {
      const target = [10, 20, 50, 100][randomInt(0, 3)];
      const a = randomInt(1, target - 1);
      const b = target - a;
      const c = randomInt(11, 89);
      return `${a} + ${b} + ${c} = ?`;
    },
    (expression) => {
      const numbers = toNumberList(expression);
      return numbers.length === 3 && (sumToTarget(numbers, 10) || sumToTarget(numbers, 20) || sumToTarget(numbers, 50) || sumToTarget(numbers, 100));
    }
  );
}

function generateSecret2(): string {
  return generateWithRetry(
    () => {
      const stepBase = randomInt(2, 25) * 10;
      const tail = randomInt(1, 9);
      const b = stepBase + tail;
      const a = b + randomInt(40, 500);
      return `${a} - ${b} = ?`;
    },
    (expression) => {
      const parsed = parseSubtraction(expression);
      if (!parsed) {
        return false;
      }
      return parsed.a > parsed.b && parsed.b >= 21 && parsed.b % 10 !== 0;
    }
  );
}

function generateSecret3(): string {
  return generateWithRetry(
    () => {
      const t1 = [10, 20, 50][randomInt(0, 2)];
      const t2 = [10, 20, 50][randomInt(0, 2)];
      const a = randomInt(1, t1 - 1);
      const b = t1 - a;
      const c = randomInt(1, t2 - 1);
      const d = t2 - c;
      const values = [a, b, c, d];
      for (let i = values.length - 1; i > 0; i -= 1) {
        const j = randomInt(0, i);
        [values[i], values[j]] = [values[j], values[i]];
      }
      return `${values[0]} + ${values[1]} + ${values[2]} + ${values[3]} = ?`;
    },
    (expression) => {
      const numbers = toNumberList(expression);
      if (numbers.length !== 4) {
        return false;
      }
      const roundTargets = [10, 20, 50, 100];
      let pairCount = 0;
      for (let i = 0; i < numbers.length; i += 1) {
        for (let j = i + 1; j < numbers.length; j += 1) {
          if (roundTargets.includes(numbers[i] + numbers[j])) {
            pairCount += 1;
          }
        }
      }
      return pairCount >= 2;
    }
  );
}

function generateSecret4(): string {
  return generateWithRetry(
    () => {
      const left = randomInt(50, 900);
      const pivot = [10, 100, 1000][randomInt(0, 2)];
      const delta = randomInt(1, 9);
      const near = pivot + (Math.random() < 0.5 ? -delta : delta);
      return `${left} + ${near} = ?`;
    },
    (expression) => {
      const numbers = toNumberList(expression);
      if (numbers.length !== 2) {
        return false;
      }
      const near = numbers[1];
      const pivots = [10, 100, 1000];
      return pivots.some((pivot) => Math.abs(near - pivot) >= 1 && Math.abs(near - pivot) <= 9);
    }
  );
}

function generateSecret5(): string {
  return generateWithRetry(
    () => {
      const base = randomInt(120, 890);
      const bigChunk = randomInt(1, 7) * 100;
      const smallChunk = randomInt(12, 89);
      return `${base} + ${bigChunk} + ${smallChunk} = ?`;
    },
    (expression) => {
      const numbers = toNumberList(expression);
      if (numbers.length !== 3) {
        return false;
      }
      const hasBigChunk = numbers.some((num) => num % 100 === 0 && num >= 100);
      const hasSmallChunk = numbers.some((num) => num >= 10 && num < 100);
      const hasBase = numbers.some((num) => num >= 100 && num % 100 !== 0);
      return hasBigChunk && hasSmallChunk && hasBase;
    }
  );
}

function generateSecret6(): string {
  return generateWithRetry(
    () => {
      const a = randomInt(20, 95);
      const b = randomInt(6, 35);
      const c = randomInt(6, 35);
      const d = randomInt(4, 25);
      return `${a} - ${b} + ${c} - ${d} = ?`;
    },
    (expression) => {
      const match = expression.match(/^(\d+)\s-\s(\d+)\s\+\s(\d+)\s-\s(\d+)\s=\s\?$/);
      if (!match) {
        return false;
      }
      const a = Number(match[1]);
      const b = Number(match[2]);
      const c = Number(match[3]);
      const d = Number(match[4]);
      const result = a - b + c - d;
      return result >= 0 && (b !== c || a !== d);
    }
  );
}

function generateSecret7(): string {
  return generateWithRetry(
    () => {
      const aHundreds = randomInt(2, 8);
      const bHundreds = randomInt(1, 9 - aHundreds);
      const aTens = randomInt(1, 8);
      const bTens = randomInt(1, 8 - aTens);
      const aOnes = randomInt(1, 8);
      const bOnes = randomInt(1, 8 - aOnes);
      const a = aHundreds * 100 + aTens * 10 + aOnes;
      const b = bHundreds * 100 + bTens * 10 + bOnes;
      return `${a} + ${b} = ?`;
    },
    (expression) => {
      const numbers = toNumberList(expression);
      if (numbers.length !== 2) {
        return false;
      }
      const [a, b] = numbers;
      const onesNoCarry = a % 10 + (b % 10) < 10;
      const tensNoCarry = Math.floor((a % 100) / 10) + Math.floor((b % 100) / 10) < 10;
      return a >= 100 && b >= 100 && onesNoCarry && tensNoCarry;
    }
  );
}

function generateSecret8(): string {
  return generateWithRetry(
    () => {
      const pivot = [100, 200, 500, 1000][randomInt(0, 3)];
      const delta = randomInt(2, 18);
      const b = pivot - delta;
      const a = b + randomInt(120, 700);
      return `${a} - ${b} = ?`;
    },
    (expression) => {
      const parsed = parseSubtraction(expression);
      if (!parsed) {
        return false;
      }
      const pivots = [100, 200, 500, 1000];
      return pivots.some((pivot) => pivot - parsed.b >= 2 && pivot - parsed.b <= 18);
    }
  );
}

function generateSecret9(): string {
  return generateWithRetry(
    () => {
      const pivot = [20, 30, 40, 50, 60, 70, 80, 90, 100][randomInt(0, 8)];
      const delta = randomInt(1, 8);
      const b = pivot - delta;
      const a = b + randomInt(25, 240);
      return `${a} - ${b} = ?`;
    },
    (expression) => {
      const parsed = parseSubtraction(expression);
      if (!parsed) {
        return false;
      }
      if (parsed.a > 499 || parsed.b > 199) {
        return false;
      }
      const nearTen = Math.ceil(parsed.b / 10) * 10;
      return nearTen - parsed.b >= 1 && nearTen - parsed.b <= 8;
    }
  );
}

function generateSecret10(): string {
  return generateWithRetry(
    () => {
      const aHundreds = randomInt(4, 9);
      const bHundreds = randomInt(1, aHundreds);
      const aTens = randomInt(2, 9);
      const bTens = randomInt(1, aTens);
      const aOnes = randomInt(2, 9);
      const bOnes = randomInt(1, aOnes);
      const a = aHundreds * 100 + aTens * 10 + aOnes;
      const b = bHundreds * 100 + bTens * 10 + bOnes;
      return `${a} - ${b} = ?`;
    },
    (expression) => {
      const parsed = parseSubtraction(expression);
      if (!parsed) {
        return false;
      }
      const a = parsed.a;
      const b = parsed.b;
      const aHundreds = Math.floor(a / 100);
      const bHundreds = Math.floor(b / 100);
      const aTens = Math.floor((a % 100) / 10);
      const bTens = Math.floor((b % 100) / 10);
      const aOnes = a % 10;
      const bOnes = b % 10;
      return aHundreds >= bHundreds && aTens >= bTens && aOnes >= bOnes;
    }
  );
}

const SECRET_GENERATORS: Record<MentalMathSecretKey, () => string> = {
  secret1: generateSecret1,
  secret2: generateSecret2,
  secret3: generateSecret3,
  secret4: generateSecret4,
  secret5: generateSecret5,
  secret6: generateSecret6,
  secret7: generateSecret7,
  secret8: generateSecret8,
  secret9: generateSecret9,
  secret10: generateSecret10,
};

export function generateMentalMathQuestion(secretKey: MentalMathSecretKey): { expression: string } {
  return buildQuestion(SECRET_GENERATORS[secretKey]().replace(" = ?", ""));
}

export function generateMentalMathQuestions(secretKey: MentalMathSecretKey, count: number): { expression: string }[] {
  const seen = new Set<string>();
  const items: { expression: string }[] = [];
  while (items.length < count) {
    const next = generateMentalMathQuestion(secretKey);
    if (seen.has(next.expression)) {
      continue;
    }
    seen.add(next.expression);
    items.push(next);
  }
  return items;
}

export const MENTAL_MATH_SECRET_QUESTIONS: MentalMathQuestionMap = MENTAL_MATH_SECRET_ORDER.reduce(
  (acc, secretKey) => {
    acc[secretKey] = generateMentalMathQuestions(secretKey, ASSESSMENT_POOL_SIZE);
    return acc;
  },
  {} as MentalMathQuestionMap
);
