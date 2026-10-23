/**
 * Item 027: the victory scene. Several random endings played through from
 * the victory step (random casts by seed), each saying all its lines in
 * bubbles before the recap; a fitting dad's own line; never last episode's
 * scene. Screenshots land in tests/screenshots/ (ignored) for a look.
 */

import { test, expect, type Page } from '@playwright/test';

import { SLOW, boot, collectErrors, expectNoErrors, press, seedProgress, state, stick, toTheEnd, until, type WWState } from './harness';
import type { WWHooks } from '../src/testHooks';

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

// Each plays its four lines out (12-25 s), so all are slow lane; `npm run test:browser`
// keeps the untagged quick check below that a scene is drawn at all.
for (const seed of [2, 9, 4, 6, 13]) {
  test(`a random victory scene plays through (seed ${seed})`, SLOW, async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, `?scene=victory&seed=${seed}&nojourney=1&read=bed,hat,zap`);
    const { ending, end } = await playEnding(page, `seed${seed}`);
    const ep = end.episode;

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

test('a fitting dad says his own line: chef Dada Jason baked the cake', SLOW, async ({ page }) => {
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
  // An old blob's `ending` (item 027) loads as `recent.ending` (items 067, 076).
  await seedProgress(page, { version: 1, ending: 'picnic' });
  await boot(page, '?scene=victory&seed=2&nojourney=1&read=bed');
  const s = await until(page, (st) => st.scene === 'Ending' && Boolean(st.ending), 30_000, 'the victory scene');
  expect(s.ending!.id).not.toBe('picnic');
  // ...and this one is kept for the next episode.
  expect(s.progress.recent.ending?.at(-1)).toBe(s.ending!.id);
  expectNoErrors(errors);
});

test('the recap\'s green goes on to THE END, and only Dad\'s 2 leaves it', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=victory&seed=2&nojourney=1&read=bed,hat');
  await until(page, (s) => s.scene === 'Ending', 30_000, 'the victory scene');
  await page.keyboard.press('F2');
  await until(page, (s) => s.scene === 'Victory', 30_000, 'the recap');
  // Green while the recap is still being said does nothing.
  await press(page, 'green');
  await page.waitForTimeout(300);
  expect((await state(page)).scene).toBe('Victory');
  // The recap no longer waits for Dad (item 085): no cue there.
  await expect(page.locator('#dad-buttons')).toHaveCount(0);

  // Said, then green: THE END, with Dad's 2 waiting.
  const end = await toTheEnd(page, { hush: true });
  expect(end.recap.map((c) => c.word)).toEqual(['bed', 'hat']);
  const te = end.theEnd!;
  expect(te.text).toBe('THE END');
  // One of this episode's places: its hub, home or the quest place.
  expect(te.art).toBe(end.episode.place === 'home' ? 'room_hub' : `room_place_${end.episode.place}`);
  expect(te.heroes[0]).toBe(end.episode.hero);
  expect(te.heroes).not.toContain(end.episode.villain);
  await expect(page.locator('#dad-buttons')).toContainText('PRESS 2');
  await page.waitForTimeout(1200);
  // Drawn: no missing art, and the words on screen, in full.
  const look = await page.evaluate(() => {
    const ww = (window as unknown as { __ww: WWHooks }).__ww;
    return { missing: ww.art().missing, texts: ww.texts().filter((t) => t.scene === 'TheEnd') };
  });
  expect(look.missing).toBe(0);
  expect(look.texts.map((t) => t.text)).toEqual(['THE END']);
  expect(look.texts[0]!.offscreen).toBe(false);
  await shot(page, 'the_end');

  // Everything she has: every pad button, the stick, the keys (and Dad's 1, his no).
  for (const b of ['green', 'red', 'blue', 'yellow', 'start', 'back', 'lb', 'rb']) await press(page, b);
  await stick(page, 1, 0);
  await page.waitForTimeout(300);
  await stick(page, 0, 0);
  for (const k of ['Space', 'Enter', 'Escape', 'Tab', 'Digit3', 'ArrowLeft', 'KeyA', 'Digit1']) await page.keyboard.press(k);
  await page.waitForTimeout(1500);
  const still = await state(page);
  expect(still.scene).toBe('TheEnd');
  expect(still.theEnd?.dad).toBe(true);

  // Dad's 2, under dad lock too: a fresh episode from the title.
  await page.keyboard.press('Backquote');
  await page.keyboard.press('Digit2');
  const t = await until(page, (s) => s.scene === 'Title', 30_000, 'the title');
  expect(t.episode.read).toEqual([]);
  expect(t.theEnd).toBeNull();
  await expect(page.locator('#dad-buttons')).toHaveCount(0);
  expectNoErrors(errors);
});

test('?scene=theend opens THE END, Dad\'s 2 waiting', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=theend&ally=none');
  const s = await until(page, (st) => st.scene === 'TheEnd' && Boolean(st.theEnd?.dad), 30_000, 'THE END');
  // With no ally, the dad who woke her stands with her (as on the podium).
  expect(s.theEnd!.heroes[0]).toBe(s.episode.hero);
  expect(s.step.kind).toBe('victory');
  expectNoErrors(errors);
});
