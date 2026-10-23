/**
 * The fourth bug hunt's fixes (item 089; docs/qa-findings.md, Hunt 4): yellow
 * says again the line variant she heard; F9 on the way out of the recap or a
 * room is ignored; key 0 out of a debug game mid-line saves nothing; THE END
 * has its music back after the grown-ups page.
 */

import { test, expect, type Page } from '@playwright/test';
import { boot, choose, collectErrors, debugTagShown, expectNoErrors, press, readToKeyWord, state, until } from './harness';

const stored = (page: Page) => page.evaluate(() => localStorage.getItem('wordwarriors.progress'));
const music = async (page: Page) => (await state(page)).music;

test('yellow in the sentence room says again the variant she heard, not the next', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&nojourney=1', undefined, { voice: 'real' });
  const s = await until(page, (st) => st.room?.sentence?.pass === 'read' && !st.room.locked && st.voice.history.some((h) => /_room_your_turn(_\d+)?$/.test(h)), 90_000, 'her turn');
  const heard = s.voice.history.filter((h) => /_room_your_turn(_\d+)?$/.test(h)).at(-1)!;
  for (let i = 0; i < 2; i++) {
    await press(page, 'yellow');
    const again = await until(page, (st) => /_room_your_turn(_\d+)?$/.test(st.voice.speaking ?? ''), 15_000, 'the instruction again');
    expect(again.voice.speaking).toBe(heard);
    await until(page, (st) => !st.room!.locked, 30_000, 'listening again');
  }
  expectNoErrors(errors);
});

test('F9 as the recap fades out to THE END is ignored: THE END comes, not the recap again', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=victory&nojourney=1&read=bed,hat');
  await until(page, (s) => s.scene === 'Victory', 60_000, 'the recap');
  await expect.poll(() => page.evaluate(() => {
    const ww = (window as unknown as { __ww: { hush(): void; state(): { recapDone: boolean } } }).__ww;
    ww.hush();
    return ww.state().recapDone;
  }), { timeout: 60_000 }).toBe(true);
  await press(page, 'green');
  await page.keyboard.press('F9');
  await until(page, (s) => s.scene === 'TheEnd', 15_000, 'THE END');
  // And from THE END the grown-ups page and back: THE END with its music.
  expect(await music(page)).toBe('title');
  await page.keyboard.press('F9');
  await until(page, (s) => s.scene === 'Parent', 10_000, 'the grown-ups page');
  expect(await music(page)).toBeNull();
  await page.keyboard.press('F9');
  await until(page, (s) => s.scene === 'TheEnd', 15_000, 'THE END again');
  expect(await music(page)).toBe('title');
  expectNoErrors(errors);
});

test('key 0 out of a debug game as its word is said saves nothing (the next line variant stayed in the sandbox)', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=house&nojourney=1', undefined, { voice: 'real' });
  await until(page, (s) => s.scene === 'Hub' && Boolean(s.room?.player), 30_000, 'hub');
  const blob = await stored(page);
  await page.keyboard.press('Digit0');
  await until(page, (s) => s.scene === 'Debug' && (s.room?.spots.length ?? 0) > 0 && !s.room!.locked, 30_000, 'debug room');
  await choose(page, 'debug:sentence');
  await readToKeyWord(page);
  await choose(page);
  await until(page, (s) => (s.voice.speaking ?? '').startsWith('word_'), 20_000, "the word's line");
  await page.keyboard.press('Digit0');
  const s = await until(page, (st) => st.scene === 'Debug' && Boolean(st.room?.debug) && !st.room!.locked, 30_000, 'back in the debug room');
  await page.waitForTimeout(1000);
  expect(s.room!.debug!.done).toEqual([]);
  expect(await stored(page)).toBe(blob);
  expect((await state(page)).voice.history.filter((h) => /_got_item(_\d+)?$/.test(h))).toEqual([]);
  expectNoErrors(errors);
});

test("F9 as the debug room's door fades out is ignored: on to the next step, debug off", async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=house&nojourney=1');
  await until(page, (s) => s.scene === 'Hub' && Boolean(s.room?.player), 30_000, 'hub');
  await page.keyboard.press('Digit0');
  await until(page, (s) => s.scene === 'Debug' && (s.room?.spots.length ?? 0) > 0 && !s.room!.locked, 30_000, 'debug room');
  await choose(page, 'debug:door');
  await page.keyboard.press('F9');
  const s = await until(page, (st) => st.scene !== 'Debug' && st.scene !== 'Wait', 15_000, 'out the door');
  expect(s.scene).not.toBe('Parent');
  expect(s.step.kind).toBe('battle');
  expect(await debugTagShown(page)).toBe(false);
  expectNoErrors(errors);
});
