/**
 * Item 195: Evil Kronos fights his titan showdown in the clock tower, drawn as the
 * biggest in the fight but whole on screen. His whole episode is `villains.spec.ts`.
 */

import { expect, test } from '@playwright/test';

import { boot, shotIn, state } from './harness';

test('Evil Kronos: his showdown in the clock tower, the giant whole on screen', async ({ page }) => {
  await boot(page, '?scene=battle&part=1&nojourney=1&villain=kronos&ally=ellie');
  await expect.poll(async () => (await state(page)).battle?.fight, { timeout: 15_000 }).toBe('titan_showdown');
  await page.waitForTimeout(2500);
  await shotIn('195')(page, 'kronos_battle');
  const s = await state(page);
  expect(s.episode.villain).toBe('kronos');
  const kronos = s.battle!.villains[0]!;
  expect(kronos.art).toBe('char_kronos_evil');
  // The biggest in the fight, his head under the top of the screen.
  for (const h of s.battle!.heroes) expect(kronos.drawn).toBeGreaterThanOrEqual(h.drawn);
  expect(kronos.box[1]).toBeGreaterThanOrEqual(0);
});
