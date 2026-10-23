/**
 * Item 116, the seventh bug hunt (docs/qa-findings.md, Hunt 7): her outfits for the new
 * allies (items 111, 114) at her dress height; the story fight's gold grab under mashed
 * yellow (fix 120); Charge back from the grown-ups page asking no rune art the word lacks
 * (fix 124). The new villains are tests/villains.spec.ts's. Shots land in
 * tests/screenshots/ (ignored).
 */

import { test, expect } from '@playwright/test';

import { BATTLE_SPEED, SLOW, boot, collectErrors, expectNoErrors, place, press, state, toParentAndBack, until } from './harness';
import { outfitFill } from '../src/rules/heights';

/** Her dress, then each wave 1-2 ally's outfit for her: by hand, so a new outfit in content/battle/outfits.ts needs its line here. */
const OUTFITS = [
  ['ellie', 'char_julia_good'],
  ['seraphina', 'char_julia_keeper'],
  ['elsa', 'char_julia_snow'],
  ['anna', 'char_julia_snow'],
  ['jasmine', 'char_julia_explorer'],
  ['ozymandias', 'char_julia_astronaut'],
  ['moriarty', 'char_julia_puzzler'],
  ['rilla', 'char_julia_gorilla'],
] as const;

test('her new outfits stand her own height, head to soles, within 4% of her dress (items 111, 114)', SLOW, async ({ browser }) => {
  test.setTimeout(240_000);
  const tall: Record<string, number> = {};
  for (const [ally, art] of OUTFITS) {
    const page = await (await browser.newContext()).newPage();
    const errors = collectErrors(page);
    await boot(page, `?scene=battle&part=1&battle=short&nojourney=1&villain=tiamat&fight=brawl&ally=${ally}`);
    const s = await until(page, (st) => Boolean(st.battle?.choice?.open), 60_000, 'the move choice');
    const drawn = s.battle!.heroes.find((f) => f.art === art)?.drawn ?? 0;
    expect(drawn, `${ally}: ${art}`).toBeGreaterThan(0);
    tall[ally] = drawn * outfitFill(art)!;
    await page.screenshot({ path: `tests/screenshots/116_outfit_${ally}.png` });
    expectNoErrors(errors);
    await page.context().close();
  }
  console.log(Object.entries(tall).map(([a, t]) => `${a} ${t.toFixed(1)}`).join(', '));
  for (const [ally] of OUTFITS) expect(Math.abs(tall[ally]! / tall.ellie! - 1), ally).toBeLessThan(0.04);
});

test('story fight: yellow mashed at the gold grab says Dad\'s line again, not once a press, and green on the hoard is taken (hunt 7)', SLOW, async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&fight=smaug_story&nojourney=1&battle=short', BATTLE_SPEED, { voice: 'real' });
  for (;;) {
    const s = await until(page, (st) => Boolean(st.battle?.choice?.open) || Boolean(st.battle?.story?.walk), 180_000, 'a pick or a walk');
    const walk = s.battle!.story?.walk;
    if (walk?.kind === 'grab') {
      // Wait out Dad's first saying, then mash yellow.
      // (It starts a frame after the walk does.)
      await until(page, (st) => st.voice.busy, 10_000, 'the grab line begun');
      await until(page, (st) => !st.voice.busy, 30_000, 'the grab line said');
      const said = (await state(page)).voice.history.length;
      for (let i = 0; i < 6; i++) {
        await press(page, 'yellow');
        await page.waitForTimeout(120);
      }
      await place(page, walk.spot.x, walk.spot.y);
      const t0 = Date.now();
      for (let tries = 0; tries < 60; tries++) {
        if (!(await state(page)).battle?.story?.walk) break;
        await press(page, 'green');
        await page.waitForTimeout(200);
      }
      const after = await state(page);
      expect(after.battle?.story?.walk ?? null, 'green on the hoard took it').toBeNull();
      // The first yellow's saying, and at most the idle re-prompt's after it: not one per press (six before the fix).
      expect(after.voice.history.slice(said).filter((id) => id === after.voice.history[said]).length).toBeLessThanOrEqual(2);
      expect(Date.now() - t0, 'green taken without waiting out a queue of lines').toBeLessThan(12_000);
      break;
    }
    if (walk) {
      await place(page, walk.spot.x, walk.spot.y);
      await until(page, (st) => !st.battle?.story?.walk, 60_000, 'walk over');
      continue;
    }
    const c = s.battle!.choice!;
    const pad = c.spots.find((sp) => sp.word === c.right)!;
    for (let tries = 0; tries < 20 && (await state(page)).battle?.choice; tries++) {
      await place(page, pad.x, pad.y);
      await press(page, 'green');
      await page.waitForTimeout(300);
    }
  }
  expectNoErrors(errors);
});

test('Charge the Spell: back from the grown-ups page with every rune charged, no rune art is asked for that the word lacks (hunt 7)', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge&seed=7');
  const s = await until(page, (st) => st.room?.charge?.phase === 'read', 90_000, 'the word to read');
  // The bug showed for a word with no M ('m' stood in for the missing rune).
  expect(s.room!.charge!.runes).not.toContain('m');
  await toParentAndBack(page);
  await until(page, (st) => st.scene === 'ChargeRoom' && Boolean(st.room?.charge), 30_000, 'the room again');
  await page.waitForTimeout(500);
  expectNoErrors(errors);
});
