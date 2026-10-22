/**
 * Item 093: Dada Matt stands 5-10% shorter than Dada Jason beside him in a
 * battle, the two side by side as heroes (his builder and the chef) and
 * across the arena (Evil Dada Matt against the chef as her ally): each
 * picture's height on screen standing still (`drawn`) times its `ADULT_FILL`
 * (head to soles: the chef's hat is not his height; the fills are held to the
 * art in tests/unit/heights.test.ts). Shots land in tests/screenshots/ (ignored).
 */

import { test, expect } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, until } from './harness';
import { ADULT_FILL, ADULT_HEIGHT, OUTFIT_FILL } from '../src/config';

for (const c of [
  { name: 'side by side', query: 'hero=dada_matt&ally=dada_jason&villain=tiamat&fight=brawl', matt: 'char_dada_matt_good', jason: 'char_dada_jason_good' },
  { name: 'across the arena', query: 'ally=dada_jason&villain=dada_matt&fight=brawl', matt: 'char_dada_matt_evil', jason: 'char_dada_jason_good' },
]) {
  test(`Dada Matt is 5-10% shorter than Dada Jason in a battle, ${c.name} (item 093)`, async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, `?scene=battle&part=1&battle=short&nojourney=1&${c.query}`);
    const s = await until(page, (st) => st.battle?.phase === 'fight', 60_000, 'the fight');
    const fighters = [...s.battle!.heroes, ...s.battle!.villains];
    const drawn = (art: string) => fighters.find((f) => f.art === art)?.drawn ?? 0;
    const matt = drawn(c.matt) * ADULT_FILL[c.matt]!;
    const jason = drawn(c.jason) * ADULT_FILL[c.jason]!;
    expect(matt, c.matt).toBeGreaterThan(0);
    expect(jason, c.jason).toBeGreaterThan(0);
    const shorter = 1 - matt / jason;
    console.log(`${c.name}: Matt ${matt.toFixed(0)} px, Jason ${jason.toFixed(0)} px head to soles, ${(shorter * 100).toFixed(1)}% shorter`);
    expect(shorter).toBeGreaterThanOrEqual(0.05);
    expect(shorter).toBeLessThanOrEqual(0.1);
    // The shot with the fight frozen for the move choice.
    await until(page, (st) => Boolean(st.battle?.choice?.open), 60_000, 'the move choice');
    await page.screenshot({ path: `tests/screenshots/093_heights_${c.name.replace(/ /g, '_')}.png` });
    expectNoErrors(errors);
  });
}

test('her outfits (hunt 6, M32): chef Julia beside chef Dada Jason stands as tall as Julia in her dress, and he is his height beside her', async ({ browser, page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  // Head to soles, on screen: each picture's drawn height times her fill.
  const her = async (p: typeof page, query: string, art: string) => {
    await boot(p, `?scene=battle&part=1&battle=short&nojourney=1&villain=tiamat&fight=brawl&${query}`);
    const s = await until(p, (st) => Boolean(st.battle?.choice?.open), 60_000, 'the move choice');
    const fighters = s.battle!.heroes;
    const drawn = (a: string) => fighters.find((f) => f.art === a)?.drawn ?? 0;
    expect(drawn(art), art).toBeGreaterThan(0);
    return { s, julia: drawn(art) * OUTFIT_FILL[art]!, drawn };
  };
  const chef = await her(page, 'ally=dada_jason', 'char_julia_chef');
  await page.screenshot({ path: 'tests/screenshots/104_chef_julia_beside_chef_jason.png' });
  const jason = chef.drawn('char_dada_jason_good') * ADULT_FILL.char_dada_jason_good!;
  const dress = await her(await (await browser.newContext()).newPage(), 'ally=ellie', 'char_julia_good');
  console.log(`Julia head to soles: chef ${chef.julia.toFixed(1)} px, dress ${dress.julia.toFixed(1)} px; chef Dada Jason ${jason.toFixed(1)} px (${(jason / chef.julia).toFixed(2)} of her)`);
  expect(Math.abs(chef.julia / dress.julia - 1)).toBeLessThan(0.02);
  // Dada Jason stays his height beside her (ADULT_HEIGHT of her dress picture, which is her head to soles over its fill).
  expect(Math.abs(jason / chef.julia - ADULT_HEIGHT / OUTFIT_FILL.char_julia_good!)).toBeLessThan(0.03);
  expectNoErrors(errors);
});
