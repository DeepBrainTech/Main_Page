import assert from 'node:assert/strict';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skill = root;
const entry = await readFile(join(skill, 'SKILL.md'), 'utf8');
const frontmatter = entry.match(/^---\n([\s\S]*?)\n---\n/);
assert(frontmatter, 'SKILL.md must have YAML frontmatter.');
assert.match(frontmatter[1], /^name: dbt-game-integration$/m);
assert.match(frontmatter[1], /^description: .+$/m);
assert(!entry.includes('[TODO:'), 'Remove unfinished scaffold instructions.');
const policy = await readFile(join(skill, 'agents', 'openai.yaml'), 'utf8');
assert.match(policy, /^policy:\s*\n  allow_implicit_invocation: false\s*$/);

const files = [];
async function walk(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(item.name)) continue;
    const path = join(directory, item.name);
    assert(!item.isSymbolicLink(), `Unexpected package symlink: ${path}`);
    if (item.isDirectory()) await walk(path);
    else files.push(path);
  }
}
await walk(root);
const decoder = new TextDecoder('utf-8', { fatal: true });
let links = 0;
for (const path of files) {
  const body = decoder.decode(await readFile(path));
  assert(!body.includes('\uFFFD'), `Replacement character in ${path}`);
  if (!path.endsWith('.md')) continue;
  for (const match of body.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const resolved = resolve(dirname(path), decodeURIComponent(target.split('#')[0]));
    const info = await lstat(resolved);
    assert(info.isFile() || info.isDirectory(), `Broken local link: ${path} -> ${target}`);
    links++;
  }
}
for (const name of ['.env.example', 'portal-client.ts', 'portal_grants.py', 'verify-login.mjs']) {
  assert((await lstat(join(skill, 'assets', 'examples', name))).isFile());
}
console.log(`Validated skill frontmatter, ${files.length} UTF-8 files, ${links} local documentation links, and example assets.`);
