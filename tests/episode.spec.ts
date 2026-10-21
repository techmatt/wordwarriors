/**
 * The default episode, title to victory, played through the virtual pad, and real
 * pacing covered one scene of each kind at a time.
 *
 * Item 083: the real-time episode (item 081: real for the bedroom, the warm-up, the
 * hub's helper scene, a sentence room and battle 1, about 210 s in one test) is now
 * three tests at clock speed 1, each from its own `?scene=` (or the title), so they
 * run on separate workers: the bedroom and the warm-up, a sentence room, battle 1.
 * They keep real voice and steer her walking, so speech, karaoke, timers and walking
 * are covered at real time. The whole episode's end-to-end checks play at the suite's
 * speeds with instant voice.
 */

import { test, expect } from '@playwright/test';

import { SLOW, boot, collectErrors, driver, expectFightLength, expectNoErrors, leaveBedroom, playBattle, playEpisode, playSentenceRoom, press, state, until } from './harness';

/** Real time: real voice and her own walking (the harness's teleport off), for the test's length. */
async function realTime(page: Parameters<typeof boot>[0], query: string): Promise<string[]> {
  const errors = collectErrors(page);
  driver.walk = true;
  await boot(page, query, 1, { voice: 'real' });
  return errors;
}

test.afterEach(() => {
  driver.walk = false;
});

test('real time: the title, the bedroom and the warm-up', SLOW, async ({ page }) => {
  test.setTimeout(300_000);
  const errors = await realTime(page, '');
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(500);
  await press(page, 'green');
  await until(page, (s) => s.scene === 'Bedroom', 30_000, 'bedroom');
  await leaveBedroom(page);
  const hub = await until(page, (s) => s.scene === 'Hub', 30_000, 'the hub');
  expect(hub.episode.grab?.word).toBeTruthy();
  expect(hub.episode.fetched).toEqual([hub.episode.grab!.word]);
  expectNoErrors(errors);
});

test('real time: a sentence room', SLOW, async ({ page }) => {
  test.setTimeout(300_000);
  const errors = await realTime(page, '?scene=room&slot=a&nojourney=1');
  const key = await playSentenceRoom(page);
  const after = await state(page);
  expect(after.episode.read).toContain(key);
  expect(Object.keys(after.progress.frames ?? {}).length).toBeGreaterThan(0);
  expectNoErrors(errors);
});

test('real time: battle 1', SLOW, async ({ page }) => {
  test.setTimeout(300_000);
  const errors = await realTime(page, '?scene=battle&part=1&nojourney=1');
  await until(page, (s) => s.scene === 'Battle', 30_000, 'battle 1');
  const after = await playBattle(page, 1);
  expect(after.battle?.ultimates).toBe(1);
  expect(after.battle?.movePicks).toBe(2);
  // The ultimate floors them, then the retreat stands them back up: never a floored team at the end.
  expect(after.battle?.heroes.every((h) => h.status !== 'floored')).toBe(true);
  expectFightLength(after);
  expectNoErrors(errors);
});

test('a full episode plays end to end', SLOW, async ({ page }) => {
  test.setTimeout(600_000);
  const errors = collectErrors(page);
  await boot(page);
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(100);
  await press(page, 'green');

  const { end, keys, times } = await playEpisode(page);
  console.log(`episode parts (real s): ${JSON.stringify(times)}`);
  expect(end.episode.fetched.length).toBe(3);
  expect(end.episode.made.item).toBe(true);
  expect(end.battle?.villains[0]?.hp).toBe(0);
  for (const k of keys) expect(end.episode.read).toContain(k);

  // The ending: the villain, good again, says its own lines (its sorry at the
  // battle's end, its own in the victory scene); every recap word has its picture.
  expect(end.ending?.said).toEqual(end.ending?.lines);
  expect(end.voice.history.filter((id) => id.startsWith(`reformed_${end.episode.villain}_`)).length).toBe(2);
  const recapWords = end.episode.read.slice(0, 9);
  const done = await until(page, (s) => s.recap.length === recapWords.length && !s.voice.busy, 120_000, 'the recap');
  expect(done.recap.map((c) => c.word)).toEqual(recapWords);
  for (const c of done.recap) expect(c.picture, `${c.word} has a picture`).toMatch(/^(pic|face|item)_/);
  // Move words she picked are in the recap too.
  expect(recapWords.length).toBeGreaterThan(keys.length);

  const after = await state(page);
  expect(Object.keys(after.progress.frames ?? {}).length).toBeGreaterThan(1);
  expectNoErrors(errors);
});
