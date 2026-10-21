/**
 * Art on demand (item 065): with every picture slow to arrive, a scene still
 * never shows a gap. It waits behind the Wait scene until its art is in, then
 * opens with every image drawn; nothing asks for art that has not loaded
 * (`art: not ready`, which `collectErrors` counts as an error).
 */

import { test, expect } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, state, until } from './harness';

test('slow art: the hub waits behind the transition, then opens with no gaps', async ({ page }) => {
  const errors = collectErrors(page);
  await page.route('**/art/*.png', async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.continue();
  });
  const seen = new Set<string>();
  await boot(page, '?scene=house');
  await until(page, (s) => {
    seen.add(s.scene);
    return s.scene === 'Hub';
  }, 60_000, 'hub');
  expect(seen.has('Wait')).toBe(true);
  // Every image on screen has its own texture: none is Phaser's missing square, and nothing asked early.
  const art = await page.evaluate(() => (window as unknown as { __ww: { art(): { missing: number; late: string[] } } }).__ww.art());
  expect(art.missing).toBe(0);
  expect(art.late).toEqual([]);
  expect((await state(page)).scene).toBe('Hub');
  expectNoErrors(errors);
});
