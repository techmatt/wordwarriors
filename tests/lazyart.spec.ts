/**
 * Art on demand (item 065): with every picture slow to arrive, a scene still
 * never shows a gap. It waits behind the Wait scene until its art is in, then
 * opens with every image drawn; nothing asks for art that has not loaded
 * (`art: not ready`, which `collectErrors` counts as an error).
 */

import { test, expect, type Page } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, state, until, type WW } from './harness';

test('slow art: the hub waits behind the transition, then opens with no gaps', async ({ page }) => {
  const errors = collectErrors(page);
  await page.route('**/art/*.png', async (route) => {
    await new Promise((r) => setTimeout(r, 150));
    await route.continue();
  });
  const seen = new Set<string>();
  await boot(page, '?scene=house');
  await until(page, (s) => {
    seen.add(s.scene);
    return s.scene === 'Hub';
  }, 60_000, 'hub');
  expect(seen.has('Wait')).toBe(true);
  // Tab is yellow everywhere, never the browser's focus move (item 069: in Wait and Boot, with no Controls, focus left the page).
  const tabKept = await page.evaluate(() => {
    const e = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.body.dispatchEvent(e);
    return e.defaultPrevented;
  });
  expect(tabKept).toBe(true);
  // Every image on screen has its own texture: none is Phaser's missing square, and nothing asked early.
  const art = await artHook(page);
  expect(art.missing).toBe(0);
  expect(art.late).toEqual([]);
  expect((await state(page)).scene).toBe('Hub');
  expectNoErrors(errors);
});

const artHook = (page: Page) => page.evaluate(() => (window as unknown as WW).__ww.art());

test('art lost to a passing network error (M25): tries again after a wait, then a later scene asks again and the magenta square goes', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  const id = 'char_julia_good';
  let down = true;
  const tries: number[] = [];
  await page.route(`**/art/${id}.png`, async (route) => {
    if (!down) return route.continue();
    tries.push(Date.now());
    await route.abort('connectionreset');
  });
  await boot(page, '?scene=house');
  await until(page, (s) => s.scene === 'Hub', 30_000, 'hub');
  await expect.poll(async () => (await artHook(page)).failed).toContain(id);
  // Three tries, a wait between (0.5 s, then 2 s), not three within milliseconds.
  expect(tries).toHaveLength(3);
  expect(tries[1]! - tries[0]!).toBeGreaterThan(400);
  expect(tries[2]! - tries[1]!).toBeGreaterThan(1800);
  expect((await artHook(page)).magenta).toBeGreaterThan(0);
  // Not asked again by the scene it failed for (the hub's prefetch), only by one starting 3 s on.
  await page.waitForTimeout(3500);
  expect(tries).toHaveLength(3);
  // The server is back: the next scene asks again (once, unblocked), and she is drawn as herself
  // from the first scene to start with nothing showing the square (it may be that one, or the next).
  down = false;
  let asked = 0;
  page.on('request', (r) => r.url().endsWith(`/art/${id}.png`) && asked++);
  await page.keyboard.press('F2');
  await expect.poll(() => asked, { timeout: 30_000 }).toBe(1);
  if ((await artHook(page)).failed.length) {
    await page.waitForTimeout(500);
    await page.keyboard.press('F2');
  }
  await expect.poll(async () => (await artHook(page)).failed, { timeout: 30_000 }).toEqual([]);
  const art = await artHook(page);
  expect(art.magenta).toBe(0);
  expect(art.missing).toBe(0);
  expect(art.late).toEqual([]);
  expect(asked).toBe(1);
  expectNoErrors(errors);
});
