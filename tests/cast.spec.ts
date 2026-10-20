/**
 * Item 025: drawn casts. A seed draws the same cast every time; URL overrides
 * fix one. Drawn casts are played elsewhere (item 036 folded them into walks
 * that were already there): through the bedroom and the warm-up to the quest
 * place in tests/entry.spec.ts, whole episodes in tests/soak.spec.ts (two)
 * and tests/machine.spec.ts (one). Screenshots land in tests/screenshots/
 * (ignored) for a look.
 */

import { test, expect, type Page } from '@playwright/test';

import { SLOW, boot, collectErrors, expectNoErrors, until } from './harness';

interface Ep {
  hero: string;
  ally: string | null;
  villain: string;
  primary: string | null;
  secondary: string | null;
  place: string;
}

/** The episode's cast, once Boot has drawn it (the hooks are up before Boot is done). */
async function episodeOf(page: Page): Promise<Ep> {
  return (await until(page, (s) => s.scene !== '' && s.scene !== 'Boot', 30_000, 'booted')).episode as unknown as Ep;
}

const shot = (page: Page, name: string) => page.screenshot({ path: `tests/screenshots/025_${name}.png` });

test('the same seed casts the same episode (from the same progress)', SLOW, async ({ browser }) => {
  const cast = async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await boot(page, '?scene=bedroom&seed=5&nojourney=1');
    const { hero, ally, villain, primary, secondary, place } = await episodeOf(page);
    await context.close();
    return { hero, ally, villain, primary, secondary, place };
  };
  expect(await cast()).toEqual(await cast());
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
