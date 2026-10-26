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
import type { Rect } from '../src/qa/probe';

/** Sample the layout every 200 ms for `ms` (our clock); every distinct cover issue seen. */
async function sample(page: Page, ms: number, scene: string): Promise<{ issues: Issue[]; targets: number }> {
  const seen = new Map<string, Issue>();
  let targets = 0;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const l = await layout(page);
    targets = Math.max(targets, l.targets.filter((t) => t.scene === scene).length);
    // A ruled cover (`ruledCover`: Matt's calls and W44's foot of a picture) is a look, not a failure.
    for (const i of coverIssues(l, scene)) if (i.kind === 'target-covered' && !seen.has(i.key)) seen.set(i.key, i);
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
  // Each link read until a fix-it link opens (since M29 the first link can be fix it too).
  const opening = (st: WWState) => st.room?.shifter?.beat === 'fix' && st.room.shifter.phase === 'intro' && st.room.spots.length > 0;
  const ready = (i: number) => (st: WWState) => st.room?.shifter?.index === i && st.room.shifter.phase === 'pick' && !st.room.locked;
  let s = await until(page, (st) => opening(st) || ready(0)(st), 90_000, 'a fix-it link, or the first link');
  for (let i = 0; !opening(s); i++) {
    await choose(page);
    s = await until(page, (st) => opening(st) || ready(i + 1)(st), 60_000, 'a fix-it link');
  }
  const { issues, targets } = await sample(page, 3000, 'ShifterRoom');
  expect(targets, 'the stones are targets').toBeGreaterThanOrEqual(3);
  expect(issues).toEqual([]);
  expectNoErrors(errors);
});

// Item 071, M13: the lines that send her walking take a narrow box that keeps off her, the cursor.
for (const [name, query, scene, line] of [
  ['the hub\'s door line', '?scene=house&nojourney=1', 'Hub', /_house_doors$/],
  ['the attic\'s find line (two-row banner)', '?scene=room&slot=counter&villain=jormungandr&nojourney=1', 'SentenceRoom', /_room_find$/],
  // Hunt 10: a fetch sentence that wraps (DADA MATT NEEDS A PLANT) is M13's case too.
  ['a fetch room\'s find line (two-row banner)', '?scene=room&slot=a&ally=none&primary=dada_matt&sentence=helper_needs_a:plant&nojourney=1', 'SentenceRoom', /_room_find$/],
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

// Hunt 10, M59: the attic's narrow find box kept off her by standing over the answer's whole
// pedestal (JAM), the spot she is told to walk to. It keeps off the pedestals as well.
test("the attic's find line: the narrow box keeps off the pedestals as well as her", SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=counter&villain=jormungandr&nojourney=1&qa=1');
  await readToKeyWord(page);
  await until(page, (st) => st.scene === 'SentenceRoom' && /_room_find$/.test(st.voice.speaking ?? ''), 60_000, 'the find line');
  await page.waitForTimeout(150);
  const l = await layout(page);
  const pedestals = l.images.filter((i) => i.scene === 'SentenceRoom' && i.key === 'prop_pedestal');
  expect(pedestals.length, 'three pedestals').toBe(3);
  const boxes = l.covers.filter((c) => c.scene === 'SentenceRoom' && c.kind === 'dialogue');
  for (const p of pedestals) expect(boxes.reduce((n, c) => n + inter(c.b, p.b), 0) / area(p.b), 'share of a pedestal under the box').toBeLessThanOrEqual(0.1);
  expectNoErrors(errors);
});

// Hunt 12, M82: the test above failed about one run in four, a draw: a standing person among the pictures (KID,
// MAN, VET) dropped the row and her entry to y 650, and the box had no clear place. Matt's call (b): under a
// two-row banner such a picture stands the square's height, so the row need not drop. Each forced as the key word.
for (const word of ['vet', 'kid', 'man'] as const) {
  test(`M82: the attic's find line with ${word.toUpperCase()} under a two-row banner: the row stays up and the box keeps off the pictures, the pedestals and her`, SLOW, async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, `?scene=room&slot=counter&villain=jormungandr&sentence=cannot_beat_the:${word}&nojourney=1&qa=1`);
    const awake = await readToKeyWord(page);
    expect(awake.room!.sentence!.key).toBe(word);
    const s = await until(page, (st) => st.scene === 'SentenceRoom' && /_room_find$/.test(st.voice.speaking ?? ''), 60_000, 'the find line');
    // Not dropped: she came in above the floor's foot (the drop put her at y 650).
    expect(s.room!.player.y, 'her entry').toBeLessThan(640);
    await page.waitForTimeout(150);
    const l = await layout(page);
    const mine = (key: string) => l.images.filter((i) => i.scene === 'SentenceRoom' && i.key === key);
    const pedestals = mine('prop_pedestal');
    expect(pedestals.length, 'three pedestals').toBe(3);
    // The standing person is no taller than the square (150, and 1.1 times that grown beside her).
    const person = mine(`pic_${word}`)[0];
    expect(person, `the ${word} picture`).toBeTruthy();
    expect(person!.b[3] - person!.b[1], 'the standing person\'s height').toBeLessThanOrEqual(150 * 1.1 + 2);
    const me = mine(s.room!.player.art).sort((a, b) => b.b[3] - a.b[3])[0];
    expect(me, 'her sprite').toBeTruthy();
    const boxes = l.covers.filter((c) => c.scene === 'SentenceRoom' && c.kind === 'dialogue');
    expect(boxes.length, 'the find line\'s box').toBeGreaterThan(0);
    const share = (b: Rect) => boxes.reduce((n, c) => n + inter(c.b, b), 0) / area(b);
    for (const p of pedestals) expect(share(p.b), 'share of a pedestal under the box').toBeLessThanOrEqual(0.1);
    expect(share(me!.b), 'share of her under the box').toBeLessThanOrEqual(0.1);
    // Strict, not W44's ruled foot: no picture under the box at all.
    const pics = l.targets.filter((t) => t.scene === 'SentenceRoom');
    expect(pics.length, 'three pictures').toBe(3);
    for (const t of pics) expect(share(t.b), `share of ${t.id} under the box`).toBe(0);
    expectNoErrors(errors);
  });
}

// The hub's circle line against the gift's card (item 089): tests/layout.spec.ts.

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

// Hunt 11: the rhyme room's printed word sat on a plate at the top, under the caption box through every
// instruction ("Which thing is it? Walk to it!"), and stepping up out of the pictures' reach put her behind
// the middle card. The plate is on the row's third card; she stands between the pictures.
test('the rhyme room: the caption keeps off the printed word, and the cards never hide her', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=rhyme&qa=1');
  await until(page, (st) => st.scene === 'RhymeRoom' && Boolean(st.room?.rhyme?.word) && /_rhyme_(more|which|read)$/.test(st.voice.speaking ?? ''), 60_000, 'the first instruction');
  const { issues, targets } = await sample(page, 2500, 'RhymeRoom');
  expect(targets, 'the plate and the three pictures').toBe(4);
  expect(issues).toEqual([]);
  const s = await until(page, (st) => st.room?.rhyme?.phase === 'pick', 60_000, 'the pick');
  const p = s.room!.player;
  // Her figure is about 150 px tall; the cards end at y 410.
  expect(p.y - 150, 'her head below the cards').toBeGreaterThanOrEqual(405);
  expectNoErrors(errors);
});
