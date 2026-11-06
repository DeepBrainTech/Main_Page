import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";

const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "warn",
      "no-debugger": "error",
      "no-unreachable": "error",
      "prefer-const": "warn",
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["scripts/**"],
    rules: { "react/display-name": "off" },
  },
];

export default eslintConfig;
