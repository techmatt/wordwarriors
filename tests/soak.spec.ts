/**
 * Two whole episodes back to back, the way she will play on a good morning:
 * Victory, green, and straight into the next one. Catches anything that
 * only breaks on the second run of a scene (listeners, stale state, leaks):
 * the hub is restarted many times an episode, so it is the one to watch.
 * @slow, about ten minutes.
 */

import { test, expect } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, playEpisode, press, state, until } from './harness';

test('two episodes back to back @slow', async ({ page }) => {
  test.setTimeout(1_500_000);
  const errors = collectErrors(page);
  await boot(page);
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(500);
  await press(page, 'green');
  const first = await playEpisode(page);
  expect(first.end.episode.fetched.length).toBe(2);
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
  expect(second.end.episode.fetched.length).toBe(2);
  expect(second.end.battle?.villains[0]?.hp).toBe(0);

  const end = await state(page);
  expect(end.progress.episodes).toBe(1);
  const heap2 = await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0);
  console.log(`heap after episode 1: ${(heap1 / 1e6).toFixed(0)} MB, after episode 2: ${(heap2 / 1e6).toFixed(0)} MB`);
  expectNoErrors(errors);
});
