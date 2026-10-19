/**
 * Item 025: drawn casts. A few seeds through the bedroom (every role, the
 * quest line, the quest place), and in the slow lane whole random episodes
 * from title to victory. Screenshots land in tests/screenshots/ (ignored) for
 * a look.
 */

import { test, expect, type Page } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, leaveBedroom, playEpisode, press, state, until } from './harness';

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

for (const seed of [3, 11, 25]) {
  test(`seed ${seed}: the drawn cast wakes her, the helper says the quest, and the door leads to the quest place @slow`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors = collectErrors(page);
    await boot(page, `?scene=bedroom&seed=${seed}&nojourney=1`);
    const ep = await episodeOf(page);
    expect(ep.villain).toBeTruthy();
    expect(ep.ally).toBeTruthy();
    await until(page, (s) => s.room?.round === 'bedroom:door', 120_000, 'the news, the quest, the door');
    await shot(page, `seed${seed}_bedroom`);
    const s = await state(page);
    // The quest's setup line was said: the helper's own, or the narrator's home one.
    expect(s.voice.history.some((id) => id.startsWith('quest_') || id.endsWith('_quest_home'))).toBe(true);
    // The helper's wake-up introduction is in the waker's voice; the bad news names this villain.
    expect(s.voice.history.some((id) => id.startsWith('wake_') && id.endsWith(`_bad_${ep.villain}`))).toBe(true);
    await leaveBedroom(page);
    await until(page, (st) => st.scene === 'Hub' && st.room?.round === 'hub:1:circle', 90_000, 'circle offered');
    await shot(page, `seed${seed}_hub_${ep.place}`);
    expectNoErrors(errors);
  });
}

test('the same seed casts the same episode (from the same progress) @slow', async ({ browser }) => {
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

for (const seed of [1, 7, 19]) {
  test(`a whole random episode plays through (seed ${seed}) @slow`, async ({ page }) => {
    test.setTimeout(900_000);
    const errors = collectErrors(page);
    await boot(page, `?seed=${seed}&nojourney=1`);
    await until(page, (s) => s.scene === 'Title', 30_000, 'title');
    await page.waitForTimeout(300);
    await press(page, 'green');
    const ep = await episodeOf(page);
    const { end } = await playEpisode(page);
    await shot(page, `seed${seed}_victory_${ep.villain}`);
    expect(end.battle?.villains[0]?.hp).toBe(0);
    expectNoErrors(errors);
  });
}
