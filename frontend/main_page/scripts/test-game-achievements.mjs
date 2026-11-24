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
let achievementResponse;
let achievementRequest;
const cache = new Map();
function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const filename = path.join(root, relative);
  const context = { exports: {}, require: name => {
    if (name === 'next-intl') return { useTranslations: () => translate };
    if (name === 'next/image') return props => React.createElement('img', props);
    if (name === '@/lib/api-config') return { apiFetch: async (endpoint, options) => {
      achievementRequest = { endpoint, method: options.method ?? 'GET' };
      return { ok: true, json: async () => achievementResponse };
    } };
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    return require(name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, context, { filename });
  cache.set(relative, context.exports);
  return context.exports;
}
const { GAME_ACHIEVEMENT_GROUPS: groups } = load('config/game-achievements.ts');
const { mapNotification } = load('lib/notifications.ts');
const { fetchGameAchievements } = load('services/gameAchievementsApi.ts');
const Achievements = load('components/features/brain-games/GameAchievements.tsx').default;
const clearTargets = [10, 20, 30, 40, 50];
const freefallTargets = { levels: clearTargets, records: clearTargets, noHints: clearTargets, moves: [50, 150, 500, 1500, 3000] };
const tourTargets = {
  levels: [7, 18, 30, 40, 50], records: [6, 20, 30, 40, 50],
  noHints: [4, 8, 20, 35, 50], moves: [5, 10, 20, 35, 50],
};
const tourNames = { levels: 'levels', records: 'mathClears', noHints: 'classicStars', moves: 'mathStars' };
const tourProgress = {
  gameKey: 'chess-tourmaster', targets: tourTargets,
  values: { classicClears: 20, mathClears: 10, classicStars: 10, mathStars: 4 },
};
achievementResponse = { success: true, data: tourProgress };
assert.equal(await fetchGameAchievements(tourProgress.gameKey), tourProgress);
assert.equal(achievementRequest.endpoint, '/api/games/chess-tourmaster/achievements/sync');
assert.equal(achievementRequest.method, 'POST');
for (const badTargets of [undefined, { ...tourTargets, levels: [] }, { ...tourTargets, levels: [7, 7, 30, 40, 50] }]) {
  achievementResponse = { success: true, data: { ...tourProgress, targets: badTargets } };
  await assert.rejects(fetchGameAchievements(tourProgress.gameKey), /game_achievements_unavailable/);
}
const freefallProgress = {
  gameKey: 'chessmater', targets: freefallTargets, values: { levels: 10, records: 0, noHints: 0, moves: 50 },
};
achievementResponse = { success: true, data: freefallProgress };
assert.equal(await fetchGameAchievements(freefallProgress.gameKey), freefallProgress);
assert.equal(achievementRequest.endpoint, '/api/games/chessmater/achievements/sync');
assert.equal(achievementRequest.method, 'POST');
for (const locale of ['zh', 'en']) {
  const messages = JSON.parse(fs.readFileSync(path.join(root, `language/${locale}.json`), 'utf8'));
  const options = { locale, messages, onError(error) { throw error; } };
  translate = createTranslator({ ...options, namespace: 'gameDetails' });
  const notifications = createTranslator({ ...options, namespace: 'notifications' });
  const values = {};
  for (const group of groups) {
    values[group.key] = freefallTargets[group.key].at(-1);
    for (let tier = 0; tier < 5; tier++) {
      for (const [gameKey, source] of [['chessmater', 'chessMater'], ['chess-tourmaster', 'chessTourmaster']]) {
        const row = { id: 1, type: 'game_achievement', title: '', message: '', icon: 'achievement',
          is_read: false, created_at: null, read_at: null, metadata: { game_key: gameKey, group: group.key, tier } };
        const mapped = mapNotification(row, notifications, translate);
        const nameKey = gameKey === 'chessmater' ? group.key : tourNames[group.key];
        const achievement = translate(`achievementNames.${nameKey}.${tier}`);
        assert.equal(mapped.iconSrc, `/game-details/${group.icons[tier]}.png`);
        assert.ok(fs.existsSync(path.join(root, 'public', mapped.iconSrc)));
        assert.equal(mapped.message, notifications('events.gameAchievement.message', { game: notifications(`sources.${source}`), achievement }));
      }
    }
  }
  const html = renderToStaticMarkup(React.createElement(Achievements, {
    gameKey: 'chessmater', progress: { gameKey: 'chessmater', targets: freefallTargets, values },
  }));
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
      gameKey: 'chessmater', progress: { gameKey: 'chessmater', targets: freefallTargets, values: progressValues },
    }));
    assert.equal((result.match(/data-unlocked="true"/g) || []).length, expected);
    assert.ok(result.includes(`aria-valuenow="${expected}"`));
    assert.ok(result.includes(`width:${expected / 20 * 100}%`));
  }
  const tourmaster = renderToStaticMarkup(React.createElement(Achievements, { gameKey: 'chess-tourmaster', progress: tourProgress }));
  assert.equal((tourmaster.match(/data-unlocked="true"/g) || []).length, 5);
  assert.ok(tourmaster.includes('aria-valuenow="5"'));
  assert.ok(tourmaster.includes('aria-valuemax="20"'));
  for (const [key, count] of Object.entries({ classicClears: 7, mathClears: 6, classicStars: 4, mathStars: 5 })) {
    assert.ok(tourmaster.includes(translate('achievementRules.' + key, { count })));
  }

  const wrongGame = renderToStaticMarkup(React.createElement(Achievements, { gameKey: 'chessmater', progress: tourProgress }));
  assert.equal((wrongGame.match(/data-unlocked="true"/g) || []).length, 0);
  assert.ok(!wrongGame.includes('aria-valuenow'));
  assert.ok(wrongGame.includes('—/20'));
  const invalid = mapNotification({ id: 1, type: 'game_achievement', title: 'fallback', message: '', icon: 'achievement',
    created_at: null, metadata: { game_key: 'chessmater', group: '../../bad', tier: 99 } }, notifications, translate);
  assert.equal(invalid.iconSrc, '/notification/achievement.svg');
  console.log(`${locale}: 40 localized notification badges and achievement states passed`);
}
