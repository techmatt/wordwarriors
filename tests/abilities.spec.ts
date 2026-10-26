/**
 * The battle's abilities as they are drawn: an ability fired on demand through `__ww.cast` (its id), then its
 * objects found by name through `__ww.named`.
 */

import { test, expect } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, until, type WW } from './harness';

// Hunt 12, M81 (Matt's call (a)): Evil Jormungandr's Crushing Coil was 26 flat discs at effect depth, over the
// heroes' faces and speech bubbles. It is a serpent now: one drawn, tapered body and a head, under the fighters.
test('M81: the Crushing Coil is one drawn serpent, body and head, under the fighters', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&battle=short&nojourney=1&villain=jormungandr&fight=brawl', 1);
  await until(page, (st) => st.battle?.phase === 'fight', 30_000, 'the fight');
  const depths = await page.evaluate(() => (window as unknown as WW).__ww.cast('crushing_coil'));
  expect(depths, 'Evil Jormungandr holds the Crushing Coil').not.toBeNull();
  await page.waitForTimeout(1500);
  const [body, head] = await page.evaluate(() => [(window as unknown as WW).__ww.named('coil_body'), (window as unknown as WW).__ww.named('coil_head')]);
  await page.screenshot({ path: 'tests/screenshots/m81_crushing_coil.png' });
  // One Graphics body and one head a cast (the AI may have cast it too meanwhile: a pair each), never discs.
  expect(body!.length).toBeGreaterThanOrEqual(1);
  expect(head!.length).toBe(body!.length);
  for (const o of [...body!, ...head!]) expect(o.type).toBe('Graphics');
  const under = Math.min(...depths!);
  for (const o of [...body!, ...head!]) expect(o.depth, 'the coil is under every fighter').toBeLessThan(under);
  // Round the heroes' feet, wherever they have moved to since it was cast.
  const heroes = (await until(page, () => true, 5_000, 'state')).battle!.heroes.filter((h) => h.onStage);
  const left = Math.min(...heroes.map((h) => h.box[0]!));
  const right = Math.max(...heroes.map((h) => h.box[2]!));
  const now = await page.evaluate(() => (window as unknown as WW).__ww.named('coil_body'));
  expect(now[0]!.x, `the coil's middle between the heroes (${left} to ${right})`).toBeGreaterThan(left - 40);
  expect(now[0]!.x).toBeLessThan(right + 40);
  // Gone when it ends (3 s of the fight's clock), or out of sight at once if a move choice freezes the fight first.
  await expect.poll(() => page.evaluate(() => (window as unknown as WW).__ww.named('coil_body').filter((o) => o.visible).length), { timeout: 10_000 }).toBe(0);
  expectNoErrors(errors);
});
