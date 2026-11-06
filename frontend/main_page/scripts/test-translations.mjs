import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, TYPE } from "@formatjs/icu-messageformat-parser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function flatten(value, prefix = "", result = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") result.set(name, child);
    else {
      assert.ok(child && typeof child === "object" && !Array.isArray(child), `Invalid translation: ${name}`);
      flatten(child, name, result);
    }
  }
  return result;
}

function argumentsOf(message) {
  const names = new Set();
  function visit(nodes) {
    for (const node of nodes) {
      if ([TYPE.argument, TYPE.number, TYPE.date, TYPE.time, TYPE.select, TYPE.plural].includes(node.type)) names.add(node.value);
      if (node.type === TYPE.tag) {
        names.add(`tag:${node.value}`);
        visit(node.children);
      }
      if (node.type === TYPE.select || node.type === TYPE.plural) {
        for (const option of Object.values(node.options)) visit(option.value);
      }
    }
  }
  visit(parse(message));
  return [...names].sort();
}

const en = flatten(JSON.parse(fs.readFileSync(path.join(root, "language/en.json"), "utf8")));
const zh = flatten(JSON.parse(fs.readFileSync(path.join(root, "language/zh.json"), "utf8")));
const failures = [];
for (const key of new Set([...en.keys(), ...zh.keys()])) {
  if (!en.has(key) || !zh.has(key)) {
    failures.push(`${key}: missing from ${en.has(key) ? "zh" : "en"}`);
    continue;
  }
  try {
    assert.deepEqual(argumentsOf(en.get(key)), argumentsOf(zh.get(key)));
  } catch (error) {
    failures.push(`${key}: ${error.message}`);
  }
}
assert.equal(failures.length, 0, failures.join("\n"));
console.log(`Translation checks passed: ${en.size} keys, ICU syntax, interpolation arguments, and rich-text tags.`);
