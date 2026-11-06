import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, basename } from 'node:path';
import { installSkill } from '../scripts/install.mjs';
import { execFileSync } from 'node:child_process';

test('install copies references and dotfiles and refuses to overwrite local changes', async () => {
  const gameRoot = await mkdtemp(join(tmpdir(), 'dbt-install-test-'));
  try {
    const destination = await installSkill(gameRoot);
    assert.match(await readFile(join(destination, 'SKILL.md'), 'utf8'), /name: dbt-game-integration/);
    assert.match(await readFile(join(destination, 'references', 'database.md'), 'utf8'), /portal_user_id/);
    assert.match(await readFile(join(destination, 'assets', 'examples', '.env.example'), 'utf8'), /MYGAME_JWT_SECRET=/);
    const manifest = JSON.parse(await readFile(join(destination, 'installation.json'), 'utf8'));
    assert.equal(manifest.version, '0.3.0');
    assert.match(await readFile(join(destination, 'agents', 'openai.yaml'), 'utf8'), /allow_implicit_invocation: false/);
    assert.match(execFileSync(process.execPath, [join(destination, 'scripts', 'validate.mjs')], { encoding: 'utf8' }), /Validated skill frontmatter/);
    await assert.rejects(installSkill(gameRoot), /already exists/);
    assert.equal(JSON.parse(await readFile(join(destination, 'installation.json'), 'utf8')).installedAt, manifest.installedAt);
  } finally {
    assert.equal(dirname(resolve(gameRoot)), resolve(tmpdir()));
    assert(basename(gameRoot).startsWith('dbt-install-test-'));
    await rm(gameRoot, { recursive: true, force: true });
  }
});
