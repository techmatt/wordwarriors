/**
 * Allies by subject. Item 194: good Smaug joined the active allies (he was a villain only), drawn as the
 * reformed Smaug she sees after his sorry. Choice mode offers his card; picked, he is her ally through
 * both battles against another villain, who is beaten, and no line, art or scene is missing on the way.
 * Good Jormungandr joined with him (amendment): a seeded episode with `?ally=jormungandr`.
 * Every ally × villain pair is `pairs.spec.ts` (`WW_PAIRS=smaug`). @slow.
 */

import { test, expect } from '@playwright/test';

import { ACTIVE_CAST } from '../src/config';
import { SLOW, boot, choose, collectErrors, expectNoErrors, playEpisode, press, until } from './harness';

test('good Smaug: his card in choice mode, then her ally through both battles against another villain', SLOW, async ({ page }) => {
  test.setTimeout(600_000);
  const errors = collectErrors(page, { voice: true });
  await boot(page, '?seed=194&nojourney=1');
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(300);
  await press(page, 'blue');
  const allies = await until(page, (s) => s.scene === 'Pick' && s.episode.choice && s.step.kind === 'pick' && s.step.what === 'ally' && !s.room?.locked, 30_000, 'the ally pick');
  const spots = allies.room!.spots;
  expect(spots.map((x) => x.id)).toContain('smaug');
  expect(spots.map((x) => x.id)).toContain('jormungandr');
  // Fourteen cards, seven on a row: every one on the screen.
  expect(spots.length).toBe(ACTIVE_CAST.allies.length);
  for (const x of spots) expect(x.x > 60 && x.x < 1220, `${x.id} at ${x.x}`).toBe(true);
  await choose(page, 'smaug');
  const villains = await until(page, (s) => s.scene === 'Pick' && s.step.kind === 'pick' && s.step.what === 'villain' && !s.room?.locked, 30_000, 'the villain pick');
  // Never her ally and her villain at once.
  expect(villains.room!.spots.map((x) => x.id)).not.toContain('smaug');
  await choose(page, 'jormungandr');

  const { end } = await playEpisode(page);
  expect(end.episode.ally).toBe('smaug');
  expect(end.episode.villain).toBe('jormungandr');
  const smaug = end.battle?.heroes.find((h) => h.id === 'smaug');
  expect(smaug?.art).toBe('char_smaug_good');
  expect(end.battle?.villains[0]?.hp).toBe(0);
  expectNoErrors(errors);
});

test('good Jormungandr (item 194, amendment): a seeded episode beside him, the villain drawn round him, both battles', SLOW, async ({ page }) => {
  test.setTimeout(600_000);
  const errors = collectErrors(page, { voice: true });
  await boot(page, '?ally=jormungandr&seed=1940&nojourney=1');
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(300);
  await press(page, 'green');
  const { end } = await playEpisode(page);
  expect(end.episode.ally).toBe('jormungandr');
  expect(end.episode.villain).not.toBe('jormungandr');
  expect(end.battle?.heroes.find((h) => h.id === 'jormungandr')?.art).toBe('char_jormungandr_good');
  expect(end.battle?.villains[0]?.hp).toBe(0);
  expectNoErrors(errors);
});
