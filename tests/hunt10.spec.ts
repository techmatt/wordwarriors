/**
 * Hunt 10 (item 135): what the tenth bug hunt fixed that no older spec covers (fixes 138 to 159 in
 * docs/qa-findings.md): item 134's `?ambience=` in another villain's battle; the clash's rings and
 * F9 in the battle's closing fade; the backdrop past every edge a shake uncovers; the grown-ups
 * page's grid rows, F8 warning and DEBUG tag; the entry hall's decals; the gift word's card; the
 * story fight's fetched beat; Charge's modelled runes after F9.
 */

import { test, expect } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, pickPad, press, until } from './harness';
import { layoutIssues } from './qa/checks';
import { qaLayout } from './qa/probe';

test("?ambience= plays its candidate in its own arena whoever the villain is: the arena is loaded first (item 134)", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  // Evil Tiamat fights in the volcano; nursery_1 is the Giant Playroom's.
  await boot(page, '?scene=battle&part=1&cast=default&ambience=nursery_1');
  await until(page, (s) => s.scene === 'Battle' && Boolean(s.battle?.phase), 30_000, 'the battle');
  await page.waitForTimeout(500);
  // `art: not ready arena_nursery` is one of the errors collected.
  expectNoErrors(errors);
});

test('a spell clash adds no rings at the clash point while a move choice is open (they pulsed over the pads)', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&cast=default&fight=spell_clash&qa=1');
  await until(page, (s) => s.scene === 'Battle' && Boolean(s.battle?.choice), 60_000, 'the first move choice');
  // The rings from before it fade in under 2 s at the test clock; after it, one came every 7.5 s of real time.
  await page.waitForTimeout(2000);
  const counts: number[] = [];
  for (let i = 0; i < 12; i++) {
    counts.push((await qaLayout(page)).images.filter((im) => im.scene === 'Battle' && im.key === 'fx_ring').length);
    await page.waitForTimeout(400);
  }
  expect((await until(page, () => true, 5_000, 'state')).battle?.choice, 'still choosing').toBeTruthy();
  expect(counts.filter((n) => n > 0), counts.join(' ')).toEqual([]);
  expectNoErrors(errors);
});

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
  // Pictures at x 250-880, y 420-680 (ENTRY_HALL.spots), each 140 x 150 from its feet.
  const grid = [180, 280, 950, 690];
  for (const seed of [104, 105, 106]) {
    await boot(page, `?scene=grab&seed=${seed}&qa=1`);
    await until(page, (s) => s.scene === 'Entry' && Boolean(s.room?.player), 30_000, 'the entry hall');
    const inside = (await qaLayout(page)).images.filter((im) => im.key.startsWith('decal_') && im.b[2] > grid[0]! && im.b[0] < grid[2]! && im.b[3] > grid[1]! + 140 && im.b[1] < grid[3]!);
    expect(inside.map((im) => `${im.key} ${im.b.join(',')}`), `seed ${seed}`).toEqual([]);
  }
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
