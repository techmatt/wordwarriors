/**
 * Item 025: drawn casts. A seed draws the same cast every time (since item 133 the
 * same house plan too: rooms, games, words); URL overrides
 * fix one. Drawn casts are played elsewhere (item 036 folded them into walks
 * that were already there): through the bedroom and the warm-up to the quest
 * place in tests/entry.spec.ts, whole episodes in tests/soak.spec.ts (two)
 * and tests/drawn.spec.ts (one). Screenshots land in tests/screenshots/
 * (ignored) for a look.
 */

import { test, expect, type Page } from '@playwright/test';

import { SLOW, boot, collectErrors, expectNoErrors, shotIn, until, type WWState } from './harness';

/** The episode's cast, once Boot has drawn it (the hooks are up before Boot is done). */
async function episodeOf(page: Page): Promise<WWState['episode']> {
  return (await until(page, (s) => s.scene !== '' && s.scene !== 'Boot', 30_000, 'booted')).episode;
}

const shot = shotIn('025');

test('the same seed casts and plans the same episode (from the same progress)', SLOW, async ({ browser }) => {
  // Item 133: the seed reaches the house's draws too (`planRand`): rooms, games and words, the gift and the moves.
  const draw = async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await boot(page, '?scene=house&seed=5&games=all&nojourney=1');
    const s = await until(page, (x) => Boolean(x.episode.house.plan), 30_000, 'the house plan');
    const { hero, ally, villain, primary, secondary, place, gift, moves, fight } = s.episode;
    await context.close();
    return { hero, ally, villain, primary, secondary, place, gift, moves, fight, plan: s.episode.house.plan };
  };
  const first = await draw();
  expect(first.plan!.length, 'a plan drawn').toBeGreaterThan(0);
  expect(await draw()).toEqual(first);
});

test('URL overrides fix the cast: a dad form as ally, his quest place, the other dad in a chosen form', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=house&ally=dada_matt_lifter&villain=scar&form=warlock&primary=dada_jason&secondary=0&nojourney=1');
  const ep = await episodeOf(page);
  expect(ep.ally).toBe('dada_matt_lifter');
  expect(ep.primary).toBe('dada_jason_warlock');
  expect(ep.secondary).toBeNull();
  expect(ep.place).toBe('forest_gym');
  await until(page, (s) => s.scene === 'Hub', 30_000, 'hub');
  await shot(page, 'override_forest_gym');
  expectNoErrors(errors);
});
