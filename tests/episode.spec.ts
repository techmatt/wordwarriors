/**
 * One whole episode, title to victory, played through the virtual pad:
 * bedroom, the hub and both side rooms, battle 1, the attic, battle 2.
 * Slow (several minutes of real voice), so it is @slow.
 */

import { test, expect } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, playEpisode, press, state, until } from './harness';

test('a full episode plays end to end @slow', async ({ page }) => {
  test.setTimeout(900_000);
  const errors = collectErrors(page);
  await boot(page);
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(500);
  await press(page, 'green');

  const { end, keys } = await playEpisode(page);
  expect(end.episode.fetched.length).toBe(2);
  expect(end.episode.made.item).toBe(true);
  expect(end.battle?.villains[0]?.hp).toBe(0);
  for (const k of keys) expect(end.episode.read).toContain(k);

  const after = await state(page);
  expect(Object.keys(after.progress.frames ?? {}).length).toBeGreaterThan(1);
  expectNoErrors(errors);
});
