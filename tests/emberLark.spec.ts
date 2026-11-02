/**
 * Item 172: Ember Lark, riding her fox in battle, firing magic arrows, letters over her head.
 */

import { expect, test } from '@playwright/test';

import { boot, state, texts } from './harness';

test('Ember Lark rides in the fight and her arrows spell letters over her head', async ({ page }) => {
  await boot(page, '?scene=battle&part=1&nojourney=1&ally=ember_lark&villain=tiamat&fight=brawl');
  await expect.poll(async () => (await state(page)).episode.ally, { timeout: 15_000 }).toBe('ember_lark');
  // A row of big tiles under the HUD: real text, a word of up to five units, every box a letter or two.
  const tiles = async () => (await texts(page)).filter((t) => t.text.length <= 2 && t.bounds[3] - t.bounds[1] >= 30 && t.bounds[1] > 60).map((t) => t.text);
  await expect.poll(async () => (await tiles()).length, { timeout: 40_000, intervals: [50] }).toBeGreaterThanOrEqual(2);
  for (const t of await tiles()) expect(t).toBe(t.toUpperCase());
});
