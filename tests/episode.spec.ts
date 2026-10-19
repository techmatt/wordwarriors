/**
 * One whole episode, title to victory, played through the virtual pad:
 * bedroom, the hub and both side rooms, battle 1, the attic, battle 2.
 * Slow (several minutes of real voice), so it is @slow. It is the one test
 * that runs at real time (clock speed 1, not `WW_SPEED`): it keeps the real
 * pacing of speech, karaoke and timers covered.
 */

import { test, expect } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, playEpisode, press, state, until } from './harness';

test('a full episode plays end to end @slow', async ({ page }) => {
  test.setTimeout(900_000);
  const errors = collectErrors(page);
  await boot(page, '', 1);
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(500);
  await press(page, 'green');

  const { end, keys } = await playEpisode(page);
  expect(end.episode.fetched.length).toBe(2);
  expect(end.episode.made.item).toBe(true);
  expect(end.battle?.villains[0]?.hp).toBe(0);
  for (const k of keys) expect(end.episode.read).toContain(k);

  // The ending: the villain, good again, says its own lines (its sorry at the
  // battle's end, its own in the victory scene); every recap word has its picture.
  expect(end.ending?.said).toEqual(end.ending?.lines);
  expect(end.voice.history.filter((id) => id.startsWith(`reformed_${end.episode.villain}_`)).length).toBe(2);
  const recapWords = end.episode.read.slice(0, 7);
  const done = await until(page, (s) => s.recap.length === recapWords.length && !s.voice.busy, 120_000, 'the recap');
  expect(done.recap.map((c) => c.word)).toEqual(recapWords);
  for (const c of done.recap) expect(c.picture, `${c.word} has a picture`).toMatch(/^(pic|face|item)_/);
  // Move words she picked are in the recap too.
  expect(recapWords.length).toBeGreaterThan(keys.length);

  const after = await state(page);
  expect(Object.keys(after.progress.frames ?? {}).length).toBeGreaterThan(1);
  expectNoErrors(errors);
});
