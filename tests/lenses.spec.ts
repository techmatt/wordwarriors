/**
 * The third bug hunt's fixes (item 080; docs/qa-findings.md, Hunt 3): held
 * F-keys, the grown-ups page and the move choice's stick hint under dad lock,
 * and the lock badge after a resize. A hidden tab holding the voice moved to
 * `tests/hiddenTab.spec.ts` (item 159).
 */

import { test, expect } from '@playwright/test';
import { SLOW, boot, collectErrors, expectNoErrors, press, seedProgress, state, until } from './harness';

test('a held F8 on the grown-ups page is one press: the record is not erased', async ({ page }) => {
  const errors = collectErrors(page);
  await seedProgress(page, { words: { cat: { seen: 3, right: 3, wrong: 0, recent: [true, true, true], last: 1 } }, episodes: 2 });
  await boot(page, '?scene=parent');
  await until(page, (s) => s.scene === 'Parent', 30_000, 'parent page');
  // Held: the second keydown is the key's auto-repeat (Playwright marks it `repeat`).
  await page.keyboard.down('F8');
  await page.waitForTimeout(150);
  await page.keyboard.down('F8');
  await page.waitForTimeout(150);
  await page.keyboard.down('F8');
  await page.keyboard.up('F8');
  await page.waitForTimeout(400);
  const s = await state(page);
  expect(s.progress.episodes).toBe(2);
  expect(s.progress.words.cat?.seen).toBe(3);
  expectNoErrors(errors);
});

test('under dad lock the grown-ups page still takes red (Esc)', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=parent');
  await until(page, (s) => s.scene === 'Parent', 30_000, 'parent page');
  await page.keyboard.press('Backquote');
  // Red (Esc, the pad's B) through the virtual pad: a keyboard press can fall between two frames.
  await press(page, 'red');
  await until(page, (s) => s.scene === 'Title', 10_000, 'back to the title under dad lock');
  await page.keyboard.press('Backquote');
  expectNoErrors(errors);
});

test('the dad lock badge stays in the canvas corner after a resize', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.keyboard.press('Backquote');
  for (const [width, height] of [[800, 600], [1600, 700], [700, 900]] as const) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(400);
    const { badge, canvas } = await page.evaluate(() => {
      const r = (e: Element | null) => {
        const b = e!.getBoundingClientRect();
        return [b.left, b.top, b.right, b.bottom];
      };
      return { badge: r(document.getElementById('dad-lock')), canvas: r(document.querySelector('#game canvas')) };
    });
    expect(badge[0]!, `${width}x${height}: badge left inside the canvas`).toBeGreaterThanOrEqual(canvas[0]! - 1);
    expect(badge[3]!, `${width}x${height}: badge bottom inside the canvas`).toBeLessThanOrEqual(canvas[3]! + 1);
    expect(canvas[3]! - badge[3]!, `${width}x${height}: badge at the canvas's bottom`).toBeLessThan(20);
  }
  await page.keyboard.press('Backquote');
  expectNoErrors(errors);
});

test('under dad lock the move choice shows no stick hint', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&battle=short&nojourney=1');
  await until(page, (st) => Boolean(st.battle?.choice?.open), 90_000, 'choice open');
  await page.keyboard.press('Backquote');
  // STICK_HINT_MS (4 s) of game time is under a second here: wait well past it.
  await page.waitForTimeout(2500);
  expect((await state(page)).battle!.choice!.stickHint).toBe(false);
  await page.keyboard.press('Backquote');
  await until(page, (st) => Boolean(st.battle?.choice?.stickHint), 15_000, 'stick hint once unlocked');
  expectNoErrors(errors);
});
