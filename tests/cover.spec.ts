/**
 * Nothing covers what she has to look at or choose (item 059). Matt watched
 * Julia play: the sentence banner (two rows, SMAUG CAN NOT BEAT THE GIFT)
 * hung over the tops of the pictures she was choosing between. "A banner or
 * dialogue box must never cover a picture or target she has to look at or
 * choose."
 *
 * Each scene with targets is sampled for a few seconds with the bug-hunt
 * checker's probe (`?qa=1`, `src/qa/probe.ts`) and its `coverIssues` check
 * (`tests/qa/checks.ts`): every banner, dialogue box, face card and bubble
 * against every tagged target (a room's spots and pictures, the battle's
 * pads and signs, the victory's recap cards).
 */

import { test, expect, type Page } from '@playwright/test';

import { REACH } from '../src/config';
import { SLOW, boot, choose, collectErrors, expectNoErrors, hubGo, readToKeyWord, until, type WWState } from './harness';
import { area, coverIssues, inter, type Issue } from './qa/checks';
import { qaLayout as layout } from './qa/probe';

/** Sample the layout every 200 ms for `ms` (our clock); every distinct cover issue seen. */
async function sample(page: Page, ms: number, scene: string): Promise<{ issues: Issue[]; targets: number }> {
  const seen = new Map<string, Issue>();
  let targets = 0;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const l = await layout(page);
    targets = Math.max(targets, l.targets.filter((t) => t.scene === scene).length);
    for (const i of coverIssues(l, scene)) if (!seen.has(i.key)) seen.set(i.key, i);
    await page.waitForTimeout(200);
  }
  return { issues: [...seen.values()], targets };
}

const inRoom = (st: WWState) => st.scene === 'SentenceRoom' && Boolean(st.room?.sentence);

// The longest names make the tallest banners: two rows (JORMUNGANDR) and the longest counter sentence (OZYMANDIAS).
// Smaug's (the banner Matt saw over the pictures) is untagged (`npm run test:browser`); the rest are slow (item 061: 13-21 s each).
for (const [name, query, fast] of [
  ['a side room, one row', '?scene=room&slot=a&nojourney=1', false],
  ['the counter, Smaug', '?scene=room&slot=counter&villain=smaug&nojourney=1', true],
  ['the counter, Jormungandr (two rows)', '?scene=room&slot=counter&villain=jormungandr&nojourney=1', false],
  ['the counter, Ozymandias (the longest)', '?scene=room&slot=counter&villain=ozymandias&nojourney=1', false],
] as const) {
  test(`sentence room, ${name}: the banner and the dialogue keep off the pictures`, fast ? {} : SLOW, async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, `${query}&qa=1`);
    await until(page, inRoom, 90_000, 'sentence room');
    // Arriving and the listening pass (the banner pops in, "listen" is captioned).
    const first = await sample(page, 2500, 'SentenceRoom');
    expect(first.targets, 'the three pictures are targets').toBe(3);
    // Her turn to find it: "find the..." is captioned while the pictures wake.
    const awake = await readToKeyWord(page);
    // She came in out of reach of every picture (item 069: under two rows, 70 px under the middle one, and green chose it).
    const p = awake.room!.player;
    for (const sp of awake.room!.spots) expect(Math.hypot(sp.x - p.x, sp.y - p.y), `out of reach of ${sp.id}`).toBeGreaterThan(REACH);
    const find = await sample(page, 2000, 'SentenceRoom');
    expect([...first.issues, ...find.issues]).toEqual([]);
    expectNoErrors(errors);
  });
}

for (const [name, query, scene] of [
  ['the hub', '?scene=house&nojourney=1', 'Hub'],
  ['the hub, part 2', '?scene=house&part=2&nojourney=1', 'Hub'],
  ['the word machine', '?scene=room&slot=a&game=word_machine&nojourney=1', 'WordMachine'],
  ['the stretchy bridge', '?scene=room&slot=a&room=bridge&nojourney=1', 'BridgeRoom'],
  ['the shape-shifter', '?scene=room&slot=a&room=shifter&nojourney=1', 'ShifterRoom'],
] as const) {
  test(`${name}: nothing covers a target`, SLOW, async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, `${query}&qa=1`);
    await until(page, (st) => st.scene === scene, 90_000, scene);
    const { issues, targets } = await sample(page, 6000, scene);
    expect(targets, 'targets drawn').toBeGreaterThan(0);
    expect(issues).toEqual([]);
    expectNoErrors(errors);
  });
}

// Hunt 6 (item 102): "Find the letter that fixes it!" (three rows) sat over all three letter stones.
test('the shape-shifter: the fix-it instruction keeps off the letter stones', SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=shifter&nojourney=1&qa=1');
  const fix = await until(page, (st) => st.room?.shifter?.phase === 'pick' && !st.room.locked, 90_000, 'first link');
  if (fix.room!.shifter!.beat === 'read') await choose(page);
  await until(page, (st) => st.room?.shifter?.beat === 'fix' && st.room.shifter.phase === 'intro' && st.room.spots.length > 0, 60_000, 'a fix-it link');
  const { issues, targets } = await sample(page, 3000, 'ShifterRoom');
  expect(targets, 'the stones are targets').toBeGreaterThanOrEqual(3);
  expect(issues).toEqual([]);
  expectNoErrors(errors);
});

// Item 071, M13: the lines that send her walking take a narrow box that keeps off her, the cursor.
for (const [name, query, scene, line] of [
  ['the hub\'s door line', '?scene=house&nojourney=1', 'Hub', /_house_doors$/],
  ['the attic\'s find line (two-row banner)', '?scene=room&slot=counter&villain=jormungandr&nojourney=1', 'SentenceRoom', /_room_find$/],
] as const) {
  test(`${name}: the dialogue box keeps off her`, SLOW, async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, `${query}&qa=1`);
    // The door line follows the gift scene's circle; the find line, her read-along to the key word.
    if (scene === 'Hub') {
      await until(page, (st) => st.room?.round === 'hub:1:circle' && !st.room.locked, 90_000, 'circle offered');
      await hubGo(page, 'circle');
    } else await readToKeyWord(page);
    const s = await until(page, (st) => st.scene === scene && line.test(st.voice.speaking ?? ''), 60_000, 'the line');
    await page.waitForTimeout(150);
    const l = await layout(page);
    const me = l.images.filter((i) => i.scene === scene && i.key === s.room!.player.art).sort((a, b) => b.b[3] - a.b[3])[0];
    expect(me, 'her sprite').toBeTruthy();
    const under = l.covers
      .filter((c) => c.scene === scene && c.kind === 'dialogue')
      .reduce((n, c) => n + inter(c.b, me!.b), 0);
    expect(under / area(me!.b), 'share of her under the box').toBeLessThanOrEqual(0.1);
    expectNoErrors(errors);
  });
}

// Item 089: the line sending her to the circle went to the top, kept off the circle, and hid the gift's card.
test("the hub's circle line: the dialogue box keeps off the gift's card and the circle", SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=house&nojourney=1&qa=1');
  const s = await until(page, (st) => st.scene === 'Hub' && /^hub_\w+_circle$/.test(st.voice.speaking ?? ''), 90_000, 'the circle line');
  await page.waitForTimeout(300);
  const l = await layout(page);
  const gift = s.episode.gift!.toUpperCase();
  const card = l.texts.find((t) => t.scene === 'Hub' && t.text === gift);
  expect(card, `the gift's card (${gift})`).toBeTruthy();
  const boxes = l.covers.filter((c) => c.scene === 'Hub' && c.kind === 'dialogue');
  expect(boxes.length, 'the dialogue box').toBeGreaterThan(0);
  expect(boxes.reduce((n, c) => n + inter(c.b, card!.b), 0), 'card under the box').toBe(0);
  expect(coverIssues(l, 'Hub')).toEqual([]);
  expectNoErrors(errors);
});

test('the battle move choice: the dialogue and bubbles keep off the pads and their signs', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&battle=short&nojourney=1&qa=1');
  await until(page, (st) => Boolean(st.battle?.choice?.open), 90_000, 'choice open');
  const { issues, targets } = await sample(page, 3000, 'Battle');
  expect(targets, 'pads and signs').toBeGreaterThan(0);
  expect(issues).toEqual([]);
  expectNoErrors(errors);
});

test('the victory recap: nothing covers the word cards', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=victory&nojourney=1&read=bed,hat,zap&qa=1');
  await until(page, (st) => st.scene === 'Victory', 90_000, 'victory');
  const { issues, targets } = await sample(page, 6000, 'Victory');
  expect(targets, 'recap cards').toBeGreaterThan(0);
  expect(issues).toEqual([]);
  expectNoErrors(errors);
});
