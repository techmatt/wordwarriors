/**
 * Item 067: variety across episodes in the real game. A drawn cast is
 * remembered as she walks from the title into the bedroom (ally, the dads'
 * forms she meets, the story and line variants), the house plan's rooms and
 * games once it is made after that; a fixed cast or a dev jump records no cast.
 */

import { test, expect } from '@playwright/test';

import { personOf } from '../content/battle/roster';
import { boot, collectErrors, expectNoErrors, press, until } from './harness';

test('a drawn episode remembers its cast and variants as she walks into the bedroom, its rooms and games with the plan', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?seed=12&games=all');
  await until(page, (st) => st.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(500);
  await press(page, 'green');
  const bed = await until(page, (st) => st.scene === 'Bedroom', 30_000, 'bedroom');
  const p = bed.progress;
  const keys = Object.keys(p.recent ?? {});
  if (bed.episode.ally) expect(p.recent?.ally).toEqual([personOf(bed.episode.ally)]);
  expect(keys.some((k) => k.startsWith('quest_'))).toBe(true);
  expect(keys).toContain('line_up');
  expect(p.recent?.villain?.length).toBe(1);
  // The bedroom draws the plan early (its art): its side rooms and games are remembered too.
  const later = await until(page, (st) => Boolean(st.episode.house.plan) && Boolean(st.progress.recent?.games), 30_000, 'the plan remembered');
  const games = later.progress.recent.games!;
  for (const g of later.episode.house.plan!.map((pl) => pl.game)) expect(games).toContain(g);
  expectNoErrors(errors);
});

test('a dev jump with the fixed cast remembers no cast and no plan', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=house&nojourney=1');
  const hub = await until(page, (st) => st.scene === 'Hub' && Boolean(st.episode.house.plan), 30_000, 'hub with its plan');
  const p = hub.progress;
  expect(p.recent ?? {}).toEqual({});
  expectNoErrors(errors);
});
