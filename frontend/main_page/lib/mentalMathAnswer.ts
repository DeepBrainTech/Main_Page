type Rational = {
  n: bigint;
  d: bigint;
};

type Token =
  | { type: "number"; value: Rational }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" };

export type MentalMathAnswer = {
  display: string;
  accepted: string[];
};

const EPSILON = 1e-9;
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const FIVE = BigInt(5);
const TEN = BigInt(10);
const NEGATIVE_ONE = BigInt(-1);

function gcd(a: bigint, b: bigint): bigint {
  let x = a < ZERO ? -a : a;
  let y = b < ZERO ? -b : b;
  while (y !== ZERO) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || ONE;
}

function rational(n: bigint, d = ONE): Rational {
  if (d === ZERO) {
    throw new Error("division_by_zero");
  }
  const sign = d < ZERO ? NEGATIVE_ONE : ONE;
  const g = gcd(n, d);
  return { n: (n / g) * sign, d: (d / g) * sign };
}

function add(a: Rational, b: Rational): Rational {
  return rational(a.n * b.d + b.n * a.d, a.d * b.d);
}

function sub(a: Rational, b: Rational): Rational {
  return rational(a.n * b.d - b.n * a.d, a.d * b.d);
}

function mul(a: Rational, b: Rational): Rational {
  return rational(a.n * b.n, a.d * b.d);
}

function div(a: Rational, b: Rational): Rational {
  return rational(a.n * b.d, a.d * b.n);
}

function toNumber(value: Rational): number {
  return Number(value.n) / Number(value.d);
}

function parseDecimal(raw: string): Rational {
  if (!raw.includes(".")) {
    return rational(BigInt(raw));
  }
  const sign = raw.startsWith("-") ? NEGATIVE_ONE : ONE;
  const unsigned = raw.replace(/^-/, "");
  const [whole, fraction = ""] = unsigned.split(".");
  const scale = TEN ** BigInt(fraction.length);
  return rational(sign * BigInt(`${whole || "0"}${fraction}`), scale);
}

function parseNumberAt(input: string, start: number): { value: Rational; end: number } | null {
  const slice = input.slice(start);
  const mixed = slice.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (mixed) {
    const whole = BigInt(mixed[1]);
    const n = BigInt(mixed[2]);
    const d = BigInt(mixed[3]);
    return { value: rational(whole * d + n, d), end: start + mixed[0].length };
  }

  const fraction = slice.match(/^(\d+)\/(\d+)/);
  if (fraction) {
    return { value: rational(BigInt(fraction[1]), BigInt(fraction[2])), end: start + fraction[0].length };
  }

  const decimal = slice.match(/^\d+(?:\.\d+)?/);
  if (decimal) {
    return { value: parseDecimal(decimal[0]), end: start + decimal[0].length };
  }

  return null;
}

function tokenize(expression: string): Token[] {
  const normalized = expression
    .replaceAll("−", "-")
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("（", "(")
    .replaceAll("）", ")");
  const tokens: Token[] = [];
  let i = 0;
  while (i < normalized.length) {
    const char = normalized[i];
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      i += 1;
      continue;
    }
    if (char === "+" || char === "-" || char === "*" || char === "/") {
      const previous = tokens[tokens.length - 1];
      const unary = char === "-" && (!previous || previous.type === "op" || previous.value === "(");
      if (unary) {
        const parsed = parseNumberAt(normalized, i + 1);
        if (!parsed) {
          throw new Error("invalid_unary_minus");
        }
        tokens.push({ type: "number", value: rational(-parsed.value.n, parsed.value.d) });
        i = parsed.end;
        continue;
      }
      tokens.push({ type: "op", value: char });
      i += 1;
      continue;
    }
    const parsed = parseNumberAt(normalized, i);
    if (!parsed) {
      throw new Error("invalid_token");
    }
    tokens.push({ type: "number", value: parsed.value });
    i = parsed.end;
  }
  return tokens;
}

function parseExpression(tokens: Token[]): Rational {
  let cursor = 0;

  const parseFactor = (): Rational => {
    const token = tokens[cursor];
    if (!token) {
      throw new Error("missing_factor");
    }
    if (token.type === "number") {
      cursor += 1;
      return token.value;
    }
    if (token.type === "paren" && token.value === "(") {
      cursor += 1;
      const value = parseAddSub();
      if (tokens[cursor]?.type !== "paren" || tokens[cursor]?.value !== ")") {
        throw new Error("missing_closing_paren");
      }
      cursor += 1;
      return value;
    }
    throw new Error("invalid_factor");
  };

  const parseMulDiv = (): Rational => {
    let value = parseFactor();
    while (tokens[cursor]?.type === "op" && (tokens[cursor]?.value === "*" || tokens[cursor]?.value === "/")) {
      const op = tokens[cursor].value;
      cursor += 1;
      const right = parseFactor();
      value = op === "*" ? mul(value, right) : div(value, right);
    }
    return value;
  };

  const parseAddSub = (): Rational => {
    let value = parseMulDiv();
    while (tokens[cursor]?.type === "op" && (tokens[cursor]?.value === "+" || tokens[cursor]?.value === "-")) {
      const op = tokens[cursor].value;
      cursor += 1;
      const right = parseMulDiv();
      value = op === "+" ? add(value, right) : sub(value, right);
    }
    return value;
  };

  const value = parseAddSub();
  if (cursor !== tokens.length) {
    throw new Error("trailing_tokens");
  }
  return value;
}

function evaluateConsecutiveSum(expression: string): Rational | null {
  const match = expression.replaceAll("−", "-").match(/^(\d+)\s*\+\s*(\d+)\s*\+\s*…\s*\+\s*(\d+)$/u);
  if (!match) {
    return null;
  }
  const first = Number(match[1]);
  const second = Number(match[2]);
  const last = Number(match[3]);
  const step = second - first;
  if (step <= 0 || (last - first) % step !== 0) {
    return null;
  }
  const count = BigInt((last - first) / step + 1);
  return rational(count * BigInt(first + last), TWO);
}

function evaluate(expression: string): Rational {
  const consecutive = evaluateConsecutiveSum(expression);
  if (consecutive) {
    return consecutive;
  }
  return parseExpression(tokenize(expression));
}

function finiteDecimalText(value: Rational): string | null {
  let denominator = value.d;
  while (denominator % TWO === ZERO) denominator /= TWO;
  while (denominator % FIVE === ZERO) denominator /= FIVE;
  if (denominator !== ONE) {
    return null;
  }
  return String(toNumber(value));
}

function toMixedText(value: Rational): string | null {
  const absN = value.n < ZERO ? -value.n : value.n;
  if (absN <= value.d || value.d === ONE) {
    return null;
  }
  const sign = value.n < ZERO ? "-" : "";
  const whole = absN / value.d;
  const remainder = absN % value.d;
  return remainder === ZERO ? `${sign}${whole}` : `${sign}${whole} ${remainder}/${value.d}`;
}

function answerTexts(value: Rational): string[] {
  const texts = new Set<string>();
  if (value.d === ONE) {
    texts.add(String(value.n));
  } else {
    texts.add(`${value.n}/${value.d}`);
    const mixed = toMixedText(value);
    if (mixed) {
      texts.add(mixed);
    }
    const decimal = finiteDecimalText(value);
    if (decimal !== null && Math.abs(toNumber(value)) < Number.MAX_SAFE_INTEGER) {
      texts.add(decimal);
    }
  }
  return Array.from(texts);
}

export function normalizeMentalMathAnswer(raw: string): string {
  return raw
    .trim()
    .replaceAll("−", "-")
    .replaceAll("＞", ">")
    .replaceAll("＜", "<")
    .replaceAll("＝", "=")
    .replace(/\s+/g, " ");
}

export function resolveMentalMathAnswer(expression: string): MentalMathAnswer {
  const compare = expression.match(/^(.*?)\s*○\s*(.*?)$/u);
  if (compare) {
    const left = evaluate(compare[1]);
    const right = evaluate(compare[2]);
    const delta = toNumber(sub(left, right));
    const symbol = Math.abs(delta) < EPSILON ? "=" : delta > 0 ? ">" : "<";
    return { display: symbol, accepted: [symbol] };
  }

  const value = evaluate(expression);
  const accepted = answerTexts(value);
  return { display: accepted[0] ?? String(toNumber(value)), accepted };
}

export function questionExprForDisplay(expression: string): string {
  return expression.replace(/\s*=\s*\?+\s*$/u, "").trim();
}

export function parseFillInAnswer(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }
  return trimmed;
}

export function isMentalMathAnswerCorrect(raw: string, expression: string, acceptedAnswers?: readonly string[]): boolean {
  const userAnswer = normalizeMentalMathAnswer(raw);
  if (!userAnswer) {
    return false;
  }
  const accepted = acceptedAnswers?.length ? acceptedAnswers : resolveMentalMathAnswer(expression).accepted;
  if (accepted.map(normalizeMentalMathAnswer).includes(userAnswer)) {
    return true;
  }
  const userNumber = Number(userAnswer);
  if (!Number.isFinite(userNumber)) {
    return false;
  }
  return accepted.some((answer) => {
    const answerNumber = Number(answer);
    return Number.isFinite(answerNumber) && Math.abs(answerNumber - userNumber) < EPSILON;
  });
}
