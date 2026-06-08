import { generateLeetcodeHints } from "@/lib/mentalMathLeetcodeHints";
import type { MentalMathLesson, MentalMathSecret } from "@/types/learning";

const MAX_HINTS = 3;

type HintStrategy =
  | "addition_within_20"
  | "subtraction_within_20"
  | "benchmark"
  | "compensation"
  | "rounding"
  | "split_tens_ones"
  | "multiply_by_9"
  | "multiply_close_100"
  | "multiply_by_11"
  | "multiply_by_5_25"
  | "fraction"
  | "decimal"
  | "compare"
  | "chain"
  | "reverse_number"
  | "consecutive_sum"
  | "pattern"
  | "generic";

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isExampleLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return true;
  }
  if (/^example\s*\d*$/i.test(trimmed)) {
    return true;
  }
  if (trimmed.includes("→")) {
    return true;
  }
  if (/^[\d./\s+−\-×○]+$/.test(trimmed) && /\d/.test(trimmed)) {
    return true;
  }
  return false;
}

/** Pull instructional lines from secret review — skip worked examples and answers. */
export function extractReviewSteps(review: readonly string[]): string[] {
  const steps: string[] = [];
  for (const line of review) {
    const trimmed = normalizeText(line);
    if (!trimmed || isExampleLine(trimmed)) {
      continue;
    }
    if (steps.includes(trimmed)) {
      continue;
    }
    steps.push(trimmed);
  }
  return steps;
}

function detectStrategy(secret: MentalMathSecret): HintStrategy {
  const title = secret.title.toLowerCase();
  const summary = secret.techniqueSummary.toLowerCase();
  const blob = `${title} ${summary}`;

  if (blob.includes("within 20") && blob.includes("addition")) {
    return "addition_within_20";
  }
  if (blob.includes("within 20") && blob.includes("subtraction")) {
    return "subtraction_within_20";
  }
  if (blob.includes("within 100") || blob.includes("tens first")) {
    return "split_tens_ones";
  }
  if (blob.includes("multiply by 9") || blob.includes("repeated 9")) {
    return "multiply_by_9";
  }
  if (blob.includes("× 11") || blob.includes("by 11") || blob.includes("multiply") && blob.includes("11")) {
    return "multiply_by_11";
  }
  if (blob.includes("multiply by 5") || blob.includes("divide by 5") || blob.includes("multiply by 25") || blob.includes("divide by 25")) {
    return "multiply_by_5_25";
  }
  if (blob.includes("close to 100") || blob.includes("middle number") || blob.includes("90s")) {
    return "multiply_close_100";
  }
  if (blob.includes("benchmark") || blob.includes("compensation by adjusting")) {
    return "benchmark";
  }
  if (blob.includes("compensation")) {
    return "compensation";
  }
  if (blob.includes("rounding") || blob.includes("round")) {
    return "rounding";
  }
  if (blob.includes("decimal")) {
    return "decimal";
  }
  if (blob.includes("fraction")) {
    return "fraction";
  }
  if (blob.includes("reverse")) {
    return "reverse_number";
  }
  if (blob.includes("consecutive")) {
    return "consecutive_sum";
  }
  if (blob.includes("pattern") || blob.includes("splitting") || blob.includes("properties")) {
    return "pattern";
  }
  return "generic";
}

function parseNumbers(expression: string): number[] {
  const normalized = expression.replace(/×/g, "*").replace(/−/g, "-");
  const matches = normalized.match(/-?\d+(?:\.\d+)?/g);
  if (!matches) {
    return [];
  }
  return matches.map((value) => Number(value)).filter((value) => Number.isFinite(value));
}

function isComparison(expression: string): boolean {
  return expression.includes("○");
}

function isFraction(expression: string): boolean {
  return expression.includes("/") && !expression.includes("○");
}

function isDecimal(expression: string): boolean {
  return /\d\.\d/.test(expression);
}

function isMultiplication(expression: string): boolean {
  return expression.includes("×") || expression.includes("*");
}

function isChain(expression: string): boolean {
  const ops = expression.match(/[+−\-×]/g) ?? [];
  return ops.length >= 2;
}

function nearTenHint(a: number, b: number, isAddition: boolean): string | null {
  const pair = isAddition ? [a, b] : [a, b];
  const [left, right] = pair;
  const target = isAddition ? right : right;

  if (isAddition) {
    if (target === 9) {
      return `One addend is 9 — try “add 10, then subtract 1” on this pair.`;
    }
    if (target === 8) {
      return `One addend is 8 — try “add 10, then subtract 2”.`;
    }
    if (target === 7) {
      return `One addend is 7 — try “add 10, then subtract 3”.`;
    }
    if (left < 10 && right < 10 && left + right > 10) {
      return `Can you split one number so the other reaches 10 first, then add what is left?`;
    }
  } else {
    if (target === 9) {
      return `Subtracting 9? Think “subtract 10, then add 1”.`;
    }
    if (target === 8) {
      return `Subtracting 8? Think “subtract 10, then add 2”.`;
    }
    if (target === 7) {
      return `Subtracting 7? Think “subtract 10, then add 3”.`;
    }
  }
  return null;
}

function buildExpressionHints(strategy: HintStrategy, expression: string): string[] {
  const hints: string[] = [];
  const numbers = parseNumbers(expression);

  if (isComparison(expression)) {
    hints.push("Round or benchmark each side first — which side looks larger before you compute exactly?");
    hints.push("Use the secret’s comparison trick on the fractions; only decide ○ after both sides are in a friendly form.");
    return hints;
  }

  if (isChain(expression) && (expression.includes("−") || expression.includes("-"))) {
    hints.push("Handle one operation at a time from left to right — simplify the first step before the next.");
    if (numbers.length >= 3) {
      hints.push(`Start with ${numbers[0]} and the next number only. What easy mental chunk can you subtract first?`);
    }
    return hints;
  }

  if (isFraction(expression)) {
    hints.push("Look for a benchmark (1, ½) or a common denominator — rewrite before you combine.");
    if (expression.includes("−")) {
      hints.push("If denominators differ, group same-denominator parts first, then deal with the rest.");
    } else {
      hints.push("Can both fractions be rewritten with the same denominator or a whole-number benchmark?");
    }
    return hints;
  }

  if (isDecimal(expression)) {
    hints.push("Round one or both decimals to a friendly value, then plan how you will adjust at the end.");
    if (numbers.length >= 2) {
      hints.push(`Which decimal is closer to a whole number or to ${Math.round(numbers[1])}? Use that as your first move.`);
    }
    return hints;
  }

  if (isMultiplication(expression)) {
    if (strategy === "multiply_by_9") {
      hints.push("Rewrite ×9 as ×10, then think about subtracting one copy of the other factor.");
    } else if (strategy === "multiply_by_11") {
      hints.push("For ×11: split the digits of the two-digit number — where can the middle digit come from?");
    } else if (strategy === "multiply_close_100") {
      if (numbers.length >= 2) {
        hints.push(`How far is each factor from 100 (or 200)? Use those gaps — not the final product yet.`);
      }
    } else if (numbers.length >= 2) {
      hints.push(`Before multiplying fully, check whether ${numbers[0]} or ${numbers[1]} can be split into easier parts.`);
    }
    return hints;
  }

  if (numbers.length >= 2 && expression.includes("+")) {
    const [a, b] = numbers;
    if (strategy === "addition_within_20") {
      const near = nearTenHint(a, b, true);
      if (near) {
        hints.push(near);
      }
      hints.push("Split one addend to make 10 with the other — carry only after you form the friendly ten.");
    } else if (strategy === "split_tens_ones") {
      hints.push(`Split each number into tens and ones — add the tens of ${a} and ${b} first.`);
      hints.push("Now add the ones column to your tens total.");
    } else if (strategy === "benchmark" || strategy === "compensation") {
      hints.push(`Pick a round benchmark near ${a} or ${b}. How far is each number from it?`);
      hints.push("Adjust both numbers (or one) to the benchmark, then plan the compensation step.");
    } else {
      hints.push(`Look for pairs that make 10, 100, or another round total inside ${expression}.`);
    }
    return hints;
  }

  if (numbers.length >= 2 && (expression.includes("−") || expression.includes("-"))) {
    const [a, b] = numbers;
    if (strategy === "subtraction_within_20") {
      const near = nearTenHint(a, b, false);
      if (near) {
        hints.push(near);
      }
    }
    if (strategy === "rounding") {
      hints.push(`If the ones digit of ${b} is larger than the ones of ${a}, can you rewrite the subtracted number into a friendly tail plus extra?`);
    }
    hints.push("Subtract in one friendly chunk first — avoid borrowing until you have a simpler intermediate.");
    return hints;
  }

  return hints;
}

/** Topic-level meta hint — redundant when the learner is already practicing within a secret. */
export function isTopicMetaHint(hint: string): boolean {
  return /^This question uses .+ from .+\. Focus on that technique, not a standard school algorithm\.$/.test(
    hint.trim(),
  );
}

function withoutTopicMetaHints(hints: readonly string[]): string[] {
  return hints.filter((hint) => !isTopicMetaHint(hint));
}

function strategyHint(strategy: HintStrategy, secret: MentalMathSecret): string | null {
  const steps = extractReviewSteps(secret.review);
  if (steps[0]) {
    const step = steps[0].replace(/:+$/, "").trim();
    return step.endsWith("?") ? step : `${step} — what is your first move on this expression?`;
  }

  const summary = normalizeText(secret.techniqueSummary);
  if (!summary) {
    return null;
  }
  const firstSentence = summary.split(/(?<=[.!?])\s+/)[0] ?? summary;
  if (firstSentence.length > 160) {
    return `${firstSentence.slice(0, 157)}… — how does it apply here?`;
  }
  return `${firstSentence} — how does it apply here?`;
}

function dedupeHints(hints: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const hint of hints) {
    const key = hint.toLowerCase();
    if (!hint || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(hint);
  }
  return result.slice(0, MAX_HINTS);
}

export interface BuildQuestionHintsParams {
  lesson: MentalMathLesson;
  secret: MentalMathSecret;
  expression: string;
  presetHints?: readonly string[];
}

/** Resolve up to 3 LeetCode-style hints: preset from config, else generated per expression. */
export function buildQuestionHints({
  lesson: _lesson,
  secret,
  expression,
  presetHints,
}: BuildQuestionHintsParams): string[] {
  if (presetHints && presetHints.length > 0) {
    return dedupeHints(withoutTopicMetaHints(presetHints));
  }

  return dedupeHints(generateLeetcodeHints(secret, expression));
}
