/**
 * The fifth bug hunt's odd input on the newer screens (item 092; docs/qa-findings.md,
 * Hunt 5): key 0 mashed in and out of minigame debug mode, with dad lock and the
 * grown-ups page in between; THE END through a resize and a hidden tab.
 */

import { test, expect, type Page } from '@playwright/test';
import { SLOW, boot, collectErrors, expectNoErrors, state, toTheEnd, until } from './harness';

const tagShown = (page: Page) => page.evaluate(() => Boolean(document.getElementById('debug-tag')?.isConnected));

/** Debug mode, as the player sees it: the scene, the DEBUG tag and the room's debug hooks agree. */
async function settled(page: Page, what: string): Promise<{ debug: boolean; scene: string }> {
  // A press's scene change lands a frame or two later: wait for the same listening room twice, 700 ms apart.
  let now = await state(page);
  for (let i = 0; i < 40; i++) {
    const s = await until(page, (st) => st.scene !== 'Wait' && Boolean(st.room?.player) && !st.room!.locked, 30_000, what);
    await page.waitForTimeout(700);
    now = await state(page);
    if (now.scene === s.scene && now.room && !now.room.locked) break;
  }
  const debug = now.scene === 'Debug';
  expect(Boolean(now.room?.debug), `${what}: the debug room's hooks`).toBe(debug);
  expect(await tagShown(page), `${what}: the DEBUG tag`).toBe(debug);
  return { debug, scene: now.scene };
}

test('key 0 mashed in the hub: debug mode, the tag and the scene always agree, and it ends where an even count of presses leaves it', SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=house&nojourney=1');
  await until(page, (s) => s.scene === 'Hub' && Boolean(s.room?.player) && !s.room!.locked, 30_000, 'hub');
  for (const gaps of [[0, 0], [40, 40, 40, 40], [150, 150, 150], [400, 30, 400, 30, 400]]) {
    for (const ms of gaps) {
      await page.keyboard.press('Digit0');
      await page.waitForTimeout(ms);
    }
    await settled(page, `after ${gaps.length} presses ${gaps.join('/')} ms apart`);
  }
  // Whatever the mashing left, one press more flips it, and one more flips it back.
  const was = (await settled(page, 'before one press')).debug;
  await page.keyboard.press('Digit0');
  expect((await settled(page, 'one press')).debug).toBe(!was);
  await page.keyboard.press('Digit0');
  expect((await settled(page, 'another press')).debug).toBe(was);
  expectNoErrors(errors);
});

test('key 0 under dad lock and across the grown-ups page: debug comes back as it was left', SLOW, async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=house&nojourney=1');
  await until(page, (s) => s.scene === 'Hub' && Boolean(s.room?.player) && !s.room!.locked, 30_000, 'hub');
  await page.keyboard.press('Backquote');
  await page.keyboard.press('Digit0');
  expect((await settled(page, 'key 0 under dad lock')).debug).toBe(true);
  await page.keyboard.press('Backquote');
  await page.keyboard.press('F9');
  await until(page, (s) => s.scene === 'Parent', 20_000, 'the grown-ups page');
  await page.waitForTimeout(500);
  // Key 0 on the grown-ups page is not a game room: nothing.
  await page.keyboard.press('Digit0');
  await page.waitForTimeout(300);
  expect((await state(page)).scene).toBe('Parent');
  await page.keyboard.press('F9');
  expect((await settled(page, 'back from the grown-ups page')).debug).toBe(true);
  await page.keyboard.press('Digit0');
  expect(await settled(page, 'debug off')).toEqual({ debug: false, scene: 'Hub' });
  expectNoErrors(errors);
});

test('THE END through window resizes and a hidden tab: still THE END, its cue placed, and Dad\'s 2 starts the title', SLOW, async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=victory&nojourney=1&read=bed,hat');
  await toTheEnd(page, { hush: true });
  await until(page, (s) => s.scene === 'TheEnd' && Boolean(s.theEnd?.dad), 30_000, "THE END's Dad cue");
  for (const [w, h] of [[900, 600], [1600, 900], [700, 900], [1280, 720]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    const placed = await page.evaluate(() => {
      const cue = document.getElementById('dad-buttons')?.getBoundingClientRect();
      const canvas = document.querySelector('canvas')!.getBoundingClientRect();
      return cue ? { inside: cue.right <= canvas.right + 1 && cue.bottom <= canvas.bottom + 1 && cue.left >= canvas.left - 1 && cue.top >= canvas.top - 1, near: canvas.right - cue.right < 60 && canvas.bottom - cue.bottom < 60 } : null;
    });
    expect(placed, `the Dad cue at ${w}x${h}`).toEqual({ inside: true, near: true });
  }
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(500);
  expect((await state(page)).scene).toBe('TheEnd');
  await page.keyboard.press('Digit2');
  await until(page, (s) => s.scene === 'Title', 20_000, 'the title');
  expectNoErrors(errors);
});
