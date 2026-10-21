/**
 * One drawn episode with the newer rooms in it, shared by the tests that each check
 * their own room (item 081: before, the word machine and the Stretchy Bridge each
 * played a whole episode of their own, 88 s and 101 s). `?game=word_machine` puts the
 * machine behind door a and `?room=bridge` the bridge behind door b (Episode.ts
 * `roomGames`). A drawn cast (seed 19): also one of item 025's whole random episodes.
 * Charge the Spell's whole episode is the soak's (tests/soak.spec.ts). @slow.
 */

import { test, expect, type Page } from '@playwright/test';

import { SLOW, boot, collectErrors, expectNoErrors, playEpisode, press, until, type WWState } from './harness';

test.describe.configure({ mode: 'serial' });

let page: Page;
let errors: string[];
let played: { end: WWState; keys: string[] };

test.beforeAll(async ({ browser }) => {
  test.setTimeout(600_000);
  page = await browser.newPage();
  errors = collectErrors(page);
  await boot(page, '?game=word_machine&room=bridge&seed=19&nojourney=1');
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(300);
  await press(page, 'green');
  played = await playEpisode(page);
  await page.screenshot({ path: 'tests/screenshots/081_drawn_victory.png' });
});

test.afterAll(async () => {
  await page?.close();
});

test('a drawn episode with the newer rooms plays through: every key read, the villain beaten, no errors', SLOW, () => {
  const { end, keys } = played;
  for (const k of keys) expect(end.episode.read).toContain(k);
  expect(end.battle?.villains[0]?.hp).toBe(0);
  expectNoErrors(errors);
});

test('the pool draws the word machine: behind door a, every word built a battle item, the counter none of them', SLOW, () => {
  const plan = played.end.episode.house.plan ?? [];
  const machine = plan.find((p) => p.slot === 'a')!;
  expect(machine.game).toBe('word_machine');
  // Battle 1 used every word she built, and the counter is none of them.
  for (const w of machine.fetches) expect(played.end.episode.fetched).toContain(w);
  expect(machine.fetches).not.toContain(plan.find((p) => p.slot === 'counter')!.key);
});

test('Stretchy Bridge in a drawn episode: behind door b, every word a battle item', SLOW, () => {
  const plan = played.end.episode.house.plan!.find((p) => p.slot === 'b')!;
  expect(plan.kind).toBe('bridge');
  for (const w of plan.fetches) expect(played.end.episode.read).toContain(w);
});
