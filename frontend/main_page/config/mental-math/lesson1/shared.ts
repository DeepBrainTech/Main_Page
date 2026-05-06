import type { MentalMathQuestion, MentalMathSecretKey } from "@/types/learning";

export type MentalMathSecretDefinition = {
  title: string;
  techniqueSummary: string;
  expressions: readonly string[];
};

function evaluateExpression(expression: string): number {
  const normalized = expression.replaceAll(" ", "");
  const tokens = normalized.match(/\d+|[+-]/g) ?? [];
  if (tokens.length === 0) {
    return 0;
  }

  let total = Number(tokens[0]);
  for (let i = 1; i < tokens.length; i += 2) {
    const operator = tokens[i];
    const next = Number(tokens[i + 1]);
    if (Number.isNaN(next)) {
      continue;
    }
    total = operator === "+" ? total + next : total - next;
  }

  return total;
}

export function buildSecretQuestions(
  secretKey: MentalMathSecretKey,
  definition: MentalMathSecretDefinition
): MentalMathQuestion[] {
  return definition.expressions.map((expression, index) => {
    const prompt = `${expression} = ?`;
    return {
      id: `${secretKey}-q${String(index + 1).padStart(2, "0")}`,
      secretKey,
      expression: prompt,
      prompt,
      answer: evaluateExpression(expression),
      techniqueTitle: definition.title,
      techniqueSummary: definition.techniqueSummary,
    };
  });
}
