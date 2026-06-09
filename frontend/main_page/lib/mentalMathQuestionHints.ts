import { generateLeetcodeHints } from "@/lib/mentalMathLeetcodeHints";
import type { MentalMathLesson, MentalMathSecret } from "@/types/learning";

const MAX_HINTS = 3;

function isTopicMetaHint(hint: string): boolean {
  return /^This question uses .+ from .+\. Focus on that technique, not a standard school algorithm\.$/.test(
    hint.trim(),
  );
}

function withoutTopicMetaHints(hints: readonly string[]): string[] {
  return hints.filter((hint) => !isTopicMetaHint(hint));
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
