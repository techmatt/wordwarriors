/**
 * Item 086: minigame debug mode. Key 0 in a game room (dad lock on, which
 * does not block it) shows the DEBUG tag and turns the room into the debug
 * room: its own things gone, one pedestal per minigame, the door out open.
 * Key 0 again brings the room back. A game played from its pedestal ends
 * with a check mark on it; out the open door to the next step; and the
 * progress store (in memory and in localStorage) is as it was before debug.
 */

import { test, expect, type Page } from '@playwright/test';
import { boot, choose, collectErrors, dadLock, expectNoErrors, playSentenceRoom, press, state, texts, until, walkTo } from './harness';

const tagShown = (page: Page) => page.evaluate(() => Boolean(document.getElementById('debug-tag')?.isConnected));
const stored = (page: Page) => page.evaluate(() => localStorage.getItem('wordwarriors.progress'));

test('debug mode: key 0 in the hub, a game from its pedestal checked off, out the open door, progress untouched', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=house&nojourney=1');
  await until(page, (s) => s.scene === 'Hub' && Boolean(s.room?.player), 30_000, 'hub');
  const before = (await state(page)).progress;
  const blob = await stored(page);

  // Dad lock on: key 0 still works.
  await dadLock(page, true);
  await page.keyboard.press('0');
  let s = await until(page, (st) => st.scene === 'Debug' && (st.room?.spots.length ?? 0) > 0, 30_000, 'debug room');
  await dadLock(page, false);
  expect(await tagShown(page)).toBe(true);
  const ids = s.room!.spots.map((sp) => sp.id).sort();
  expect(ids).toEqual(['debug:bridge', 'debug:charge', 'debug:door', 'debug:sentence', 'debug:word_machine']);
  expect(s.room!.debug!.done).toEqual([]);

  // Key 0 again: the hub as it was, no debug, no tag.
  await page.keyboard.press('0');
  s = await until(page, (st) => st.scene === 'Hub' && Boolean(st.room?.player), 30_000, 'hub back');
  expect(s.room!.spots.some((sp) => sp.id.startsWith('debug:'))).toBe(false);
  expect(await tagShown(page)).toBe(false);

  // On again; play the sentence game from its pedestal.
  await page.keyboard.press('0');
  await until(page, (st) => st.scene === 'Debug' && (st.room?.spots.length ?? 0) > 0, 30_000, 'debug room again');
  await choose(page, 'debug:sentence');
  await until(page, (st) => st.scene === 'SentenceRoom', 30_000, 'sentence room');
  await playSentenceRoom(page);
  s = await until(page, (st) => st.scene === 'Debug' && Boolean(st.room?.debug), 30_000, 'back in the debug room');
  expect(s.room!.debug!.done).toEqual(['sentence']);
  expect((await texts(page)).some((t) => t.scene === 'Debug' && t.text === '✔')).toBe(true);
  expect(await tagShown(page)).toBe(true);
  // Nothing of the game stayed with the episode.
  expect(s.episode.read).toEqual([]);
  expect(s.episode.fetched).toEqual([]);
  expect(s.episode.house.done).toEqual([]);

  // Out the open door, walking: on to the next step, debug off.
  const door = s.room!.spots.find((sp) => sp.id === 'debug:door')!;
  await walkTo(page, door.x, door.y + 12);
  await press(page, 'green');
  s = await until(page, (st) => st.scene !== 'Debug' && st.step.kind === 'battle', 30_000, 'out the door');
  expect(await tagShown(page)).toBe(false);

  expect(s.progress).toEqual(before);
  expect(await stored(page)).toBe(blob);
  expectNoErrors(errors);
});

test('debug mode: every other game opens from its pedestal in house part 2; key 0 in it comes back unchecked, the store untouched', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=house&part=2&nojourney=1');
  await until(page, (s) => s.scene === 'Hub' && Boolean(s.room?.player), 30_000, 'hub');
  const before = (await state(page)).progress;
  const blob = await stored(page);
  await page.keyboard.press('0');
  for (const [id, scene] of [['word_machine', 'WordMachine'], ['charge', 'ChargeRoom'], ['bridge', 'BridgeRoom'], ['sentence', 'SentenceRoom']] as const) {
    await until(page, (st) => st.scene === 'Debug' && (st.room?.spots.length ?? 0) > 0 && !st.room!.locked, 30_000, `debug room before ${id}`);
    await choose(page, `debug:${id}`);
    const s = await until(page, (st) => st.scene === scene && Boolean(st.room?.player), 30_000, `${id} open`);
    // The attic's sentence game is the counter sentence.
    if (id === 'sentence') expect(s.episode.house.plan!.find((p) => p.game.startsWith('sentence:') && p.slot === 'counter')).toBeTruthy();
    await page.keyboard.press('0');
  }
  const s = await until(page, (st) => st.scene === 'Debug' && Boolean(st.room?.debug), 30_000, 'debug room at the end');
  expect(s.room!.debug!.done).toEqual([]);
  expect(s.progress).toEqual(before);
  expect(await stored(page)).toBe(blob);
  expectNoErrors(errors);
});
