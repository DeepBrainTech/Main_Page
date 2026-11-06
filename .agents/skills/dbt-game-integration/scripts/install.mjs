import { cp, lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const name = 'dbt-game-integration';

export async function installSkill(targetRoot) {
  if (!targetRoot) throw new Error('Usage: node scripts/install.mjs EXISTING_GAME_REPOSITORY_ROOT');
  const root = await realpath(resolve(targetRoot));
  if (!(await lstat(root)).isDirectory()) throw new Error('Target must be an existing directory.');
  const fromPackage = relative(packageRoot, root);
  if (!fromPackage || (!fromPackage.startsWith('..') && !fromPackage.includes(':'))) {
    throw new Error('Choose the game repository, outside this package checkout.');
  }
  const destination = join(root, '.agents', 'skills', name);
  for (const folder of [join(root, '.agents'), join(root, '.agents', 'skills')]) {
    try {
      if ((await lstat(folder)).isSymbolicLink()) throw new Error('Skill parent directories must not be symbolic links.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  try {
    await lstat(destination);
    throw new Error('Skill already exists. Review and back it up before updating; no files were overwritten.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const { version } = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  let sourceCommit = null;
  try {
    const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: packageRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const sourceWithinRepo = relative(await realpath(gitRoot), await realpath(packageRoot));
    if (!sourceWithinRepo.startsWith('..') && !sourceWithinRepo.includes(':')) {
      sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: packageRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    }
  } catch {
    // A copied package without Git metadata remains installable.
  }
  await mkdir(dirname(destination), { recursive: true });
  await mkdir(destination);
  for (const entry of ['SKILL.md', 'agents', 'references', 'assets', 'scripts', 'tests', 'package.json', '.gitignore']) {
    await cp(join(packageRoot, entry), join(destination, entry), { recursive: true, force: false, errorOnExist: true });
  }
  await writeFile(join(destination, 'installation.json'), JSON.stringify({
    package: name, version, sourceCommit, installedAt: new Date().toISOString(),
  }, null, 2) + '\n', 'utf8');
  return destination;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/install.mjs EXISTING_GAME_REPOSITORY_ROOT');
    console.log(`Installed ${name} into ${await installSkill(process.argv[2])}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
