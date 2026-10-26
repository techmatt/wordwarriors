/**
 * Hunt 10 (item 135): what the tenth bug hunt fixed that no older spec covers (fixes 138 to 159 in
 * docs/qa-findings.md): F9 in the battle's closing fade (the clash's rings moved to fights.spec.ts, item 161); the backdrop past
 * every edge a shake uncovers; the grown-ups page's grid rows, F8 warning and DEBUG tag; the entry
 * hall's decals; the gift word's card and Ellie's bubble (M55); the story fight's fetched beat; Charge's modelled runes after F9.
 */

import { test, expect } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, pickPad, press, until } from './harness';
import { layoutIssues } from './qa/checks';
import { qaLayout } from './qa/probe';

test("F9 in the battle's closing fade does not play the finished fight again (the rooms and scenes already guard it)", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&cast=default&battle=short&qa=1');
  // Its moves picked for her until the fight ends and fades.
  for (;;) {
    const s = await until(page, (st) => Boolean(st.battle?.choice?.open) || st.battle?.phase === 'end', 90_000, 'a choice or the end');
    if (s.battle?.phase === 'end') break;
    await pickPad(page, s.battle!.choice!.right);
    await until(page, (st) => !st.battle?.choice, 30_000, 'choice closed');
  }
  await until(page, (st) => st.battle?.fading === true, 60_000, 'the closing fade');
  await page.keyboard.press('F9');
  const next = await until(page, (st) => st.scene !== 'Battle', 30_000, 'the next scene');
  expect(next.scene, 'on to the next step, not the grown-ups page').not.toBe('Parent');
  expectNoErrors(errors);
});

test('a shake uncovers no black edge: the battle and the rooms have their backdrop past every side of the screen', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  // juice.ts `shake`: at most 3% of the screen, 38 x 22 px.
  const past = (b: number[]) => b[0]! <= -40 && b[1]! <= -24 && b[2]! >= 1280 + 40 && b[3]! >= 720 + 24;
  await boot(page, '?scene=battle&part=1&cast=default&qa=1');
  await until(page, (s) => s.scene === 'Battle' && Boolean(s.battle?.phase), 30_000, 'the battle');
  expect((await qaLayout(page)).images.some((im) => im.key.startsWith('arena_') && past(im.b)), 'the arena past the edges').toBe(true);
  await boot(page, '?scene=house&qa=1');
  await until(page, (s) => s.scene === 'Hub' && Boolean(s.room?.player), 30_000, 'the hub');
  expect((await qaLayout(page)).images.some((im) => im.key.startsWith('room_') && past(im.b)), 'the hub past the edges').toBe(true);
  expectNoErrors(errors);
});

test('the grown-ups page: every grid row on page 1 is one line, CANNOT_GET_PAST_THE too', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=parent&qa=1');
  await until(page, (s) => s.scene === 'Parent', 30_000, 'the grown-ups page');
  await page.waitForTimeout(400);
  // A grid row: a name, two spaces, then its counts with middle dots; one line is under 1.6 times its size.
  const rows = (await qaLayout(page)).texts.filter((t) => t.scene === 'Parent' && /^\S+ {2}\d/.test(t.text));
  expect(rows.some((t) => t.text.startsWith('cannot_get_past_the'))).toBe(true);
  expect(rows.filter((t) => t.b[3] - t.b[1] > t.size * 1.6).map((t) => t.text)).toEqual([]);
  expectNoErrors(errors);
});

test("the grown-ups page: F8's erase warning on page 3 sits clear of the stored words' last line", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=parent&qa=1');
  for (const p of [1, 2]) {
    await until(page, (s) => s.scene === 'Parent', 30_000, `the grown-ups page ${p}`);
    await page.waitForTimeout(400);
    await press(page, 'green');
  }
  await until(page, (s) => s.scene === 'Parent', 30_000, 'page 3');
  await page.waitForTimeout(400);
  // Hunt 11: page 1's too (over the rhyme room's levels row there): F8 once, then green on to page 3.
  await press(page, 'green');
  await until(page, (s) => s.scene === 'Parent', 30_000, 'page 1');
  await page.waitForTimeout(400);
  await page.keyboard.press('F8');
  await page.waitForTimeout(300);
  expect(layoutIssues(await qaLayout(page), 'Parent', new Set()).filter((i) => i.kind === 'text-overlap' || i.kind === 'text-offscreen').map((i) => i.detail), 'page 1').toEqual([]);
  for (const p of [2, 3]) {
    await press(page, 'green');
    await until(page, (s) => s.scene === 'Parent', 30_000, `page ${p}`);
    await page.waitForTimeout(400);
  }
  await page.keyboard.press('F8');
  await page.waitForTimeout(300);
  const bad = layoutIssues(await qaLayout(page), 'Parent', new Set()).filter((i) => i.kind === 'text-overlap' || i.kind === 'text-offscreen');
  expect(bad.map((i) => i.detail)).toEqual([]);
  await page.screenshot({ path: 'tests/screenshots/hunt10_parent_f8.png' });
  expectNoErrors(errors);
});

test('the grown-ups page in minigame debug mode: its title starts clear of the DEBUG corner tag', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge&qa=1');
  await until(page, (s) => s.scene === 'ChargeRoom', 30_000, 'a game room');
  await page.keyboard.press('Digit0');
  await until(page, (s) => s.scene === 'Debug', 30_000, 'debug mode');
  await page.keyboard.press('F9');
  await until(page, (s) => s.scene === 'Parent', 30_000, 'the grown-ups page');
  await page.waitForTimeout(400);
  const title = (await qaLayout(page)).texts.find((t) => t.scene === 'Parent' && t.text.startsWith('Grown-ups:'))!;
  // The tag: 8 px in, about 80 px wide (src/input/debugKey.ts).
  expect(title.b[0]).toBeGreaterThanOrEqual(100);
  expectNoErrors(errors);
});

test("the entry hall: the villain's floor decals keep out of the warm-up pictures' rows, gaps included (a bone pile read as a fourth thing)", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  // Pictures at x 250-880, y 420-680 (ENTRY_HALL.spots), each 140 x 150 from its feet; hunt 11, 250 px past the
  // rows' right end too (a penguin trooper stood past KING).
  const grid = [180, 280, 1130, 690];
  let onFloor = 0;
  for (const seed of [104, 105, 106]) {
    await boot(page, `?scene=grab&seed=${seed}&qa=1`);
    await until(page, (s) => s.scene === 'Entry' && Boolean(s.room?.player), 30_000, 'the entry hall');
    const decals = (await qaLayout(page)).images.filter((im) => im.key.startsWith('decal_'));
    const inside = decals.filter((im) => im.b[2] > grid[0]! && im.b[0] < grid[2]! && im.b[3] > grid[1]! + 140 && im.b[1] < grid[3]!);
    expect(inside.map((im) => `${im.key} ${im.b.join(',')}`), `seed ${seed}`).toEqual([]);
    onFloor += decals.filter((im) => im.b[1] > 380).length;
  }
  // Not by drawing none: keeping too much clear left no floor spot at all (a review of hunt 11's first cut).
  expect(onFloor, 'some floor mess drawn').toBeGreaterThan(0);
  expectNoErrors(errors);
});

test("the hub's gift word fits its card through its pulse, SPLASH too (it ran past the card's edge)", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  // `words=` leans the gift's draw to SPLASH, the widest action word; a seed makes the draw replay, so try a few.
  let gift = '';
  for (let seed = 1; seed <= 12 && gift !== 'splash'; seed++) {
    await boot(page, `?scene=house&words=splash&seed=${seed}&qa=1`);
    gift = (await until(page, (st) => st.scene === 'Hub' && Boolean(st.episode.gift), 30_000, 'the hub')).episode.gift!;
  }
  expect(gift).toBe('splash');
  let widest = 0;
  for (let i = 0; i < 40 && widest === 0; i++) {
    for (let k = 0; k < 8; k++) {
      const t = (await qaLayout(page)).texts.find((x) => x.scene === 'Hub' && x.text === 'SPLASH');
      if (t) widest = Math.max(widest, t.b[2] - t.b[0]);
      await page.waitForTimeout(120);
    }
  }
  // The card is 220 px across, its white inside about 214.
  expect(widest, 'SPLASH seen on its card').toBeGreaterThan(0);
  expect(widest).toBeLessThanOrEqual(214);
  expectNoErrors(errors);
});

test("Ellie's gift scene shows her drawn bubble, the gift word inside it through its pulse (it was 🔵, DOT's glyph: M55)", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  // The default cast's helper is Ellie, her first scene the bubble; `words=` leans the gift to SPLASH, the widest.
  await boot(page, '?scene=house&cast=default&words=splash&qa=1');
  const gift = (await until(page, (st) => st.scene === 'Hub' && Boolean(st.episode.gift), 30_000, 'the hub')).episode.gift!.toUpperCase();
  let seen = 0;
  for (let i = 0; i < 300 && seen < 8; i++) {
    const l = await qaLayout(page);
    // The big one over Ellie, not the little one on her blanket (the gift's spot, item 138).
    const bubble = l.images.find((im) => im.scene === 'Hub' && im.key === 'prop_bubble' && im.b[2] - im.b[0] >= 140);
    const word = l.texts.find((x) => x.scene === 'Hub' && x.text === gift);
    if (bubble && word) {
      seen++;
      expect(word.b[0], `${gift} left of the bubble`).toBeGreaterThanOrEqual(bubble.b[0]);
      expect(word.b[2], `${gift} right of the bubble`).toBeLessThanOrEqual(bubble.b[2]);
      expect(word.b[1], `${gift} above the bubble`).toBeGreaterThanOrEqual(bubble.b[1]);
      expect(word.b[3], `${gift} below the bubble`).toBeLessThanOrEqual(bubble.b[3]);
    }
    await page.waitForTimeout(120);
  }
  expect(seen, 'the bubble and its word seen').toBeGreaterThan(0);
  expectNoErrors(errors);
});

test("the story fight: Dad's \"show him what we found\" is not echoed by the narrator's \"Look what we found!\"", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&fight=smaug_story&fetched=nest,grass&qa=1');
  await until(page, (st) => st.voice.history.some((id) => /^story_smaug_fetched/.test(id)), 60_000, "Dad's fetched line");
  await page.waitForTimeout(4000);
  const s = await until(page, () => true, 5_000, 'state');
  expect(s.voice.history.filter((id) => /_use_bag(_\d+)?$/.test(id))).toEqual([]);
  expectNoErrors(errors);
});

test('Charge the Spell, solo: the grown-ups page and back mid-visit models each rune once (it counted the runes before F9 twice)', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge&solo=1&qa=1');
  const s0 = await until(page, (st) => st.scene === 'ChargeRoom' && (st.room?.charge?.charged.length ?? 0) >= 1, 60_000, 'a rune charged');
  const first = s0.room!.charge!.runes[0]!;
  await page.keyboard.press('F9');
  await until(page, (st) => st.scene === 'Parent', 30_000, 'the grown-ups page');
  await page.waitForTimeout(300);
  await page.keyboard.press('F9');
  await until(page, (st) => st.scene === 'ChargeRoom', 30_000, 'back in Charge');
  const hub = await until(page, (st) => st.scene === 'Hub', 90_000, 'the read together, back in the hub');
  expect(hub.progress.sounds[first]!.modelled, first).toBe(1);
  expectNoErrors(errors);
});
