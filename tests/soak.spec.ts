/**
 * Two whole episodes back to back, the way she will play on a good morning:
 * Victory, green, and straight into the next one. Catches anything that
 * only breaks on the second run of a scene (listeners, stale state, leaks):
 * the hub is restarted many times an episode, so it is the one to watch.
 * @slow. Runs at clock speed `WW_SPEED` (5): what it guards is the second
 * run, not real-time pacing, which the full-episode test covers. Both are
 * drawn casts (seed 1, then the next draw), so they are also two of the
 * whole random episodes item 025 asks for (the third is the word machine's
 * episode, tests/machine.spec.ts).
 */

import { test, expect } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, playEpisode, press, state, until } from './harness';

test('two episodes back to back @slow', async ({ page }) => {
  test.setTimeout(1_500_000);
  const errors = collectErrors(page);
  await boot(page, '?seed=1');
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(500);
  await press(page, 'green');
  const first = await playEpisode(page);
  expect(first.end.episode.fetched.length).toBe(3);
  expect(first.end.battle?.villains[0]?.hp).toBe(0);
  await page.screenshot({ path: `tests/screenshots/025_seed1_victory_${first.end.episode.villain}.png` });
  const heap1 = await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0);

  // Victory: green when the dot appears, then the title, then green again.
  await until(page, (s) => s.scene === 'Victory' && !s.voice.busy, 90_000, 'victory quiet');
  await page.waitForTimeout(600);
  await press(page, 'green');
  await until(page, (s) => s.scene === 'Title', 30_000, 'title again');
  // A fresh episode: nothing carried over from the first.
  const fresh = await state(page);
  expect(fresh.episode.fetched).toEqual([]);
  expect(fresh.episode.house.done).toEqual([]);
  expect(fresh.episode.spell).toBeNull();
  await page.waitForTimeout(800);
  await press(page, 'green');
  const second = await playEpisode(page);
  expect(second.end.episode.fetched.length).toBe(3);
  expect(second.end.battle?.villains[0]?.hp).toBe(0);
  await page.screenshot({ path: `tests/screenshots/025_seed1_second_victory_${second.end.episode.villain}.png` });

  const end = await state(page);
  expect(end.progress.episodes).toBe(1);
  const heap2 = await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0);
  console.log(`heap after episode 1: ${(heap1 / 1e6).toFixed(0)} MB, after episode 2: ${(heap2 / 1e6).toFixed(0)} MB`);
  expectNoErrors(errors);
});
