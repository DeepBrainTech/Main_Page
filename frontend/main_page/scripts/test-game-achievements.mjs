import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTranslator } from 'next-intl';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let translate;
const cache = new Map();
function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const filename = path.join(root, relative);
  const context = { exports: {}, require: name => {
    if (name === 'next-intl') return { useTranslations: () => translate };
    if (name === 'next/image') return props => React.createElement('img', props);
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    return require(name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, context, { filename });
  cache.set(relative, context.exports);
  return context.exports;
}
const { GAME_ACHIEVEMENT_GROUPS: groups, GAME_ACHIEVEMENT_RULES: rules } = load('config/game-achievements.ts');
const { mapNotification } = load('lib/notifications.ts');
const Achievements = load('components/features/brain-games/GameAchievements.tsx').default;
for (const locale of ['zh', 'en']) {
  const messages = JSON.parse(fs.readFileSync(path.join(root, `language/${locale}.json`), 'utf8'));
  const options = { locale, messages, onError(error) { throw error; } };
  translate = createTranslator({ ...options, namespace: 'gameDetails' });
  const notifications = createTranslator({ ...options, namespace: 'notifications' });
  const values = {};
  for (const group of groups) {
    values[group.key] = rules.chessmater[group.key].targets[4];
    for (let tier = 0; tier < 5; tier++) {
      const row = { id: 1, type: 'game_achievement', title: '', message: '', icon: 'achievement',
        is_read: false, created_at: null, read_at: null,
        metadata: { game_key: 'chessmater', group: group.key, tier } };
      const mapped = mapNotification(row, notifications, translate);
      assert.equal(mapped.iconSrc, `/game-details/${group.icons[tier]}.png`);
      assert.ok(fs.existsSync(path.join(root, 'public', mapped.iconSrc)));
      assert.ok(mapped.message.includes(translate(`achievementNames.${group.key}.${tier}`)));
      assert.ok(mapped.message.includes(notifications('sources.chessMater')));
    }
  }
  const html = renderToStaticMarkup(React.createElement(Achievements, { gameKey: 'chessmater', progress: { gameKey: 'chessmater', values } }));
  assert.equal((html.match(/data-unlocked="true"/g) || []).length, 20);
  assert.ok(html.includes('aria-valuenow="20"'));
  assert.ok(html.includes('aria-valuemax="20"'));
  assert.ok(html.includes('width:100%'));
  for (const [progressValues, expected] of [
    [{ levels: 10, records: 10, noHints: 10, moves: 50 }, 4],
    [{ levels: 0, records: 9, noHints: 9, moves: 0 }, 0],
    [{ levels: 0, records: 20, noHints: 30, moves: 0 }, 5],
    [{ levels: 0, records: 0, noHints: 0, moves: 0 }, 0],
    [{ levels: 105, records: 105, noHints: 105, moves: 10000 }, 20],
  ]) {
    const result = renderToStaticMarkup(React.createElement(Achievements, {
      gameKey: 'chessmater', progress: { gameKey: 'chessmater', values: progressValues },
    }));
    assert.equal((result.match(/data-unlocked="true"/g) || []).length, expected);
    assert.ok(result.includes(`aria-valuenow="${expected}"`));
    assert.ok(result.includes(`width:${expected / 20 * 100}%`));
  }
  const wrongGame = renderToStaticMarkup(React.createElement(Achievements, { gameKey: 'chessmater', progress: { gameKey: 'other', values } }));
  assert.equal((wrongGame.match(/data-unlocked="true"/g) || []).length, 0);
  assert.ok(!wrongGame.includes('aria-valuenow'));
  assert.ok(wrongGame.includes('—/20'));
  const invalid = mapNotification({ id: 1, type: 'game_achievement', title: 'fallback', message: '', icon: 'achievement',
    created_at: null, metadata: { game_key: 'chessmater', group: '../../bad', tier: 99 } }, notifications, translate);
  assert.equal(invalid.iconSrc, '/notification/achievement.svg');
  console.log(`${locale}: 20 localized notification badges and achievement states passed`);
}
