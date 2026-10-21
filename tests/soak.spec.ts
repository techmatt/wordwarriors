/**
 * Two whole episodes back to back, the way she will play on a good morning:
 * Victory, green, and straight into the next one. Catches anything that
 * only breaks on the second run of a scene (listeners, stale state, leaks):
 * the hub is restarted many times an episode, so it is the one to watch.
 * @slow. Runs at clock speed `WW_SPEED` (5): what it guards is the second
 * run, not real-time pacing, which the full-episode test covers. Both are
 * drawn casts (seed 1, then the next draw), so they are also two of the
 * whole random episodes item 025 asks for (the third is tests/drawn.spec.ts's).
 * Item 081: they are also Charge the Spell's whole episodes (`room=charge` pins
 * the beta's phonics room behind door a; `games=all` draws door b from the whole
 * pool), checked in each: the runes spell its word, fetched, fired in part 1.
 */

import { test, expect } from '@playwright/test';

import { SLOW, boot, collectErrors, expectNoErrors, playEpisode, press, state, until, type WWState } from './harness';

/** Charge the Spell behind door a, its word a battle item, its runes fired in battle 1. */
function expectCharged(end: WWState): void {
  const plan = end.episode.house.plan ?? [];
  const a = plan.find((p) => p.slot === 'a')!;
  expect(a.kind).toBe('charge');
  // Every unit of a charge word is its own rune, so the runes spell it.
  expect(end.episode.charged?.sounds.join('')).toBe(a.key);
  expect(end.episode.fetched).toContain(a.key);
  expect(end.episode.charged?.part).toBe(1);
}

test('two episodes back to back', SLOW, async ({ page }) => {
  test.setTimeout(1_500_000);
  const errors = collectErrors(page);
  await boot(page, '?seed=1&games=all&room=charge');
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(500);
  await press(page, 'green');
  const first = await playEpisode(page);
  expect(first.end.episode.fetched.length).toBe(3);
  expect(first.end.battle?.villains[0]?.hp).toBe(0);
  expectCharged(first.end);
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
  expect(fresh.episode.gift).toBeNull();
  await page.waitForTimeout(800);
  await press(page, 'green');
  const second = await playEpisode(page);
  expect(second.end.episode.fetched.length).toBe(3);
  expect(second.end.battle?.villains[0]?.hp).toBe(0);
  expectCharged(second.end);
  await page.screenshot({ path: `tests/screenshots/025_seed1_second_victory_${second.end.episode.villain}.png` });

  const end = await state(page);
  // Counted as each victory scene opens (item 039): both, the second before its green.
  expect(end.progress.episodes).toBe(2);
  const heap2 = await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0);
  console.log(`heap after episode 1: ${(heap1 / 1e6).toFixed(0)} MB, after episode 2: ${(heap2 / 1e6).toFixed(0)} MB`);
  expectNoErrors(errors);
});
