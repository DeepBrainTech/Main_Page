import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cache = new Map();

function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const context = {
    exports: {},
    URL,
    require(name) {
      assert.ok(name.startsWith("@/"), `Unexpected dependency: ${name}`);
      return load(`${name.slice(2)}.ts`);
    },
  };
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(compiled, context, { filename: relative });
  cache.set(relative, context.exports);
  return context.exports;
}

const { safeReturnTo, authHref } = load("lib/navigation.ts");

for (const [input, expected] of [
  ["/leaderboard?tab=dimension", "/leaderboard?tab=dimension"],
  ["/zh/braingames/freefall-chess?category=logic#preview", "/braingames/freefall-chess?category=logic#preview"],
  ["/en/learning?category=math", "/learning?category=math"],
  ["/membership", "/membership"],
  ["/test", "/test"],
]) {
  assert.equal(safeReturnTo(input), expected);
}

for (const input of [
  null, undefined, "", "https://example.com", "//example.com", "///example.com",
  "javascript:alert(1)", "/\\example.com", "/en/login?returnTo=/learning",
  "/register", "/forgot-password", "/", "/en", "/not-an-app-page",
  "/learning/../../login", "/learning/%2e%2e/login", "/learning/%5cexample.com",
  "/learning/%0aexample.com", "/learning/%ZZ", "/learning\n",
]) {
  assert.equal(safeReturnTo(input), "/dashboard", `Unsafe destination: ${input}`);
}

const flow = authHref("/register", "/en/braingames/fogchess?category=memory#preview");
const returnTo = new URL(flow, "https://example.test").searchParams.get("returnTo");
assert.equal(returnTo, "/braingames/fogchess?category=memory#preview");
const login = new URL(authHref("/login?registered=true", returnTo), "https://example.test");
assert.equal(login.searchParams.get("registered"), "true");
assert.equal(login.searchParams.get("returnTo"), returnTo);
assert.equal(safeReturnTo(login.searchParams.get("returnTo")), returnTo);
assert.equal(authHref("/login"), "/login");
assert.equal(new URL(authHref("/login", "//example.com"), "https://example.test").searchParams.get("returnTo"), "/dashboard");

console.log("Navigation checks passed: local destinations, unsafe redirects, and auth flow round trips.");
