/**
 * The giants in a battle (Evil Tiamat, size 2 or more): item 155 keeps all of her on the screen,
 * busy or not, and hunt 12 lets go of that while she is off the stage, so she runs in from past the
 * screen's edge as everyone else does (the clamp had her standing at the edge from the first frame,
 * through the versus cards). Boots at real speed so the run-in is long enough to read.
 */

import { test, expect } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, until } from './harness';
import { GAME_WIDTH } from '../src/config';

test('Evil Tiamat runs in from off the screen, then stands wholly on it (hunt 12)', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&battle=short&nojourney=1&villain=tiamat&fight=brawl', 1);
  const intro = await until(page, (st) => st.battle?.phase === 'intro' && Boolean(st.battle.villains[0]?.box?.length), 30_000, 'the intro');
  const [left, , right] = intro.battle!.villains[0]!.box;
  console.log(`Evil Tiamat in the intro: x ${left} to ${right}`);
  // Most of her past the right edge as the versus cards show: the clamp put her middle about 230 px inside it.
  expect(left!).toBeGreaterThan(GAME_WIDTH - (right! - left!) / 2);
  const fight = await until(page, (st) => st.battle?.phase === 'fight', 30_000, 'the fight');
  const [l2, , r2] = fight.battle!.villains[0]!.box;
  expect(l2!).toBeGreaterThanOrEqual(0);
  expect(r2!).toBeLessThanOrEqual(GAME_WIDTH + 10);
  expectNoErrors(errors);
});
