/**
 * Item 027: the victory scene. Several random endings played through from
 * the victory step (random casts by seed), each saying all its lines in
 * bubbles before the recap; a fitting dad's own line; never last episode's
 * scene. Screenshots land in tests/screenshots/ (ignored) for a look.
 */

import { test, expect, type Page } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, seedProgress, until, type WWState } from './harness';

const shot = (page: Page, name: string) => page.screenshot({ path: `tests/screenshots/027_${name}.png` });

/** Play the scene through to the recap; returns the scene's state at its end and the first Victory state. */
async function playEnding(page: Page, name: string): Promise<{ ending: NonNullable<WWState['ending']>; end: WWState }> {
  const start = await until(page, (s) => s.scene === 'Ending' && Boolean(s.ending), 30_000, 'the victory scene');
  // Mid-scene, once a line or two is out.
  await until(page, (s) => (s.ending?.said.length ?? 0) >= 2 || s.scene !== 'Ending', 30_000, 'two lines said');
  await shot(page, `${name}_${start.ending!.id}`);
  const done = await until(page, (s) => s.scene !== 'Ending' || Boolean(s.ending?.done), 60_000, 'the scene done');
  const end = await until(page, (s) => s.scene === 'Victory', 30_000, 'on to the recap');
  return { ending: done.ending!, end };
}

// Two in the fast lane, the rest in the slow one.
for (const seed of [2, 9, 4, 6, 13]) {
  test(`a random victory scene plays through (seed ${seed})${seed === 2 || seed === 9 ? '' : ' @slow'}`, async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, `?scene=victory&seed=${seed}&nojourney=1&read=bed,hat,zap`);
    const { ending, end } = await playEnding(page, `seed${seed}`);
    const ep = end.episode as unknown as { hero: string; villain: string; ally: string | null };

    // Everyone is there, one each, the hero first and the villain (good again) last.
    expect(ending.people[0]).toBe(ep.hero);
    expect(ending.people.at(-1)).toBe(ep.villain);
    if (ep.ally) expect(ending.people).toContain(ep.ally);
    expect(new Set(ending.people).size).toBe(ending.people.length);
    // Good art for the villain, never the evil one.
    expect(ending.art.at(-1)).not.toMatch(/_evil$/);

    // Four lines, every one said: the villain's own reformed line second.
    expect(ending.lines.length).toBe(4);
    expect(ending.said).toEqual(ending.lines);
    expect(ending.lines[1]).toMatch(new RegExp(`^reformed_${ep.villain}_`));
    for (const l of ending.lines.filter((_, i) => i !== 1)) expect(l).toMatch(/^end_/);
    // Each was voiced as a bark (a bubble), not dropped.
    for (const l of ending.lines) expect(end.voice.history).toContain(l);
    // ...and nothing says the villain's line twice.
    expect(end.voice.history.filter((id) => id.startsWith(`reformed_${ep.villain}_`)).length).toBe(1);
    expect(end.progress).toBeTruthy();
    expectNoErrors(errors);
  });
}

test('a fitting dad says his own line: chef Dada Jason baked the cake', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=victory&ally=dada_jason&villain=smaug&ending=dessert&nojourney=1&read=bed');
  const { ending } = await playEnding(page, 'chef');
  expect(ending.id).toBe('dessert');
  expect(ending.lines).toContain('end_dada_jason_dessert_fit');
  expect(ending.said).toEqual(ending.lines);
  expectNoErrors(errors);
});

test('never last episode\'s scene', async ({ page }) => {
  const errors = collectErrors(page);
  await seedProgress(page, { version: 1, ending: 'picnic' });
  await boot(page, '?scene=victory&seed=2&nojourney=1&read=bed');
  const s = await until(page, (st) => st.scene === 'Ending' && Boolean(st.ending), 30_000, 'the victory scene');
  expect(s.ending!.id).not.toBe('picnic');
  expectNoErrors(errors);
});
