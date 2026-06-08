/**
 * Regenerate per-question LeetCode-style hints in all secret*.ts files.
 * Run: npx tsx scripts/regenerate-mental-math-hints.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MENTAL_MATH_LESSONS } from "../config/mental-math/catalog";
import { generateLeetcodeHints } from "../lib/mentalMathLeetcodeHints";
import type { MentalMathSecret } from "../types/learning";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function secretExportName(secretKey: string): string {
  return secretKey.toUpperCase();
}

function formatQuestionBlock(id: string, expression: string, hints: string[]): string {
  const hintLines = hints.map((hint) => `        ${JSON.stringify(hint)}`).join(",\n");
  return `    {
      "id": ${JSON.stringify(id)},
      "expression": ${JSON.stringify(expression)},
      "hints": [
${hintLines}
      ]
    }`;
}

function serializeSecret(secret: MentalMathSecret): string {
  const exportName = secretExportName(secret.key);
  const questionBlocks = secret.questions
    .map((question) => {
      const hints = generateLeetcodeHints(secret, question.expression);
      return formatQuestionBlock(question.id, question.expression, hints);
    })
    .join(",\n");

  const reviewLines = secret.review.map((line) => `    ${JSON.stringify(line)}`).join(",\n");

  return `import type { MentalMathSecret } from "@/types/learning";

export const ${exportName}: MentalMathSecret = {
  "key": ${JSON.stringify(secret.key)},
  "sourceTopicNumber": ${secret.sourceTopicNumber},
  "title": ${JSON.stringify(secret.title)},
  "techniqueSummary": ${JSON.stringify(secret.techniqueSummary)},
  "review": [
${reviewLines}
  ],
  "questions": [
${questionBlocks}
  ]
} as const;
`;
}

let totalQuestions = 0;

for (const lesson of MENTAL_MATH_LESSONS) {
  for (const secret of lesson.secrets) {
    const filePath = path.join(ROOT, "config", "mental-math", lesson.key, `${secret.key}.ts`);
    const content = serializeSecret(secret);
    fs.writeFileSync(filePath, content, "utf8");
    totalQuestions += secret.questions.length;
    console.log(`Updated ${lesson.key}/${secret.key}.ts (${secret.questions.length} questions)`);
  }
}

console.log(`Done. Regenerated hints for ${totalQuestions} questions.`);
