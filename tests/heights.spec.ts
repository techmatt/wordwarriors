/**
 * Item 093: Dada Matt stands 5-10% shorter than Dada Jason beside him in a
 * battle, the two side by side as heroes (his builder and the chef) and
 * across the arena (Evil Dada Matt against the chef as her ally): each drawn
 * picture's height times its `ADULT_FILL` (head to soles: the chef's hat is
 * not his height; the fills are held to the art in tests/unit/heights.test.ts).
 * Shots land in tests/screenshots/ (ignored) for a look.
 */

import { test, expect, type Page } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, until } from './harness';
import { qaLayout } from './qa/probe';
import { ADULT_FILL } from '../src/config';

/** Each key's median drawn height in the battle over a few samples (they squash out of step, and a move can grow one). */
async function heights(page: Page, keys: string[]): Promise<Record<string, number>> {
  const seen: Record<string, number[]> = {};
  for (let i = 0; i < 7; i++) {
    const l = await qaLayout(page);
    for (const im of l.images) if (im.scene === 'Battle' && keys.includes(im.key)) (seen[im.key] ??= []).push(im.b[3] - im.b[1]);
    await page.waitForTimeout(150);
  }
  return Object.fromEntries(Object.entries(seen).map(([k, hs]) => [k, hs.sort((a, b) => a - b)[Math.floor(hs.length / 2)]!]));
}

for (const c of [
  { name: 'side by side', query: 'hero=dada_matt&ally=dada_jason&villain=tiamat', matt: 'char_dada_matt_good', jason: 'char_dada_jason_good' },
  { name: 'across the arena', query: 'ally=dada_jason&villain=dada_matt', matt: 'char_dada_matt_evil', jason: 'char_dada_jason_good' },
]) {
  test(`Dada Matt is 5-10% shorter than Dada Jason in a battle, ${c.name} (item 093)`, async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, `?scene=battle&part=1&battle=short&nojourney=1&qa=1&${c.query}`);
    await until(page, (st) => st.battle?.phase === 'fight', 60_000, 'the fight');
    const h = await heights(page, [c.matt, c.jason]);
    expect(h[c.matt], c.matt).toBeGreaterThan(0);
    expect(h[c.jason], c.jason).toBeGreaterThan(0);
    const matt = h[c.matt]! * ADULT_FILL[c.matt]!;
    const jason = h[c.jason]! * ADULT_FILL[c.jason]!;
    const shorter = 1 - matt / jason;
    console.log(`${c.name}: Matt ${matt.toFixed(0)} px, Jason ${jason.toFixed(0)} px head to soles, ${(shorter * 100).toFixed(1)}% shorter`);
    expect(shorter).toBeGreaterThanOrEqual(0.05);
    expect(shorter).toBeLessThanOrEqual(0.1);
    await page.screenshot({ path: `tests/screenshots/093_heights_${c.name.replace(/ /g, '_')}.png` });
    expectNoErrors(errors);
  });
}
