/**
 * The fifth bug hunt's odd input on the newer screens (item 092; docs/qa-findings.md,
 * Hunt 5), a test each:
 *
 * - key 0 mashed in the hub at four rhythms: debug mode, the DEBUG tag and the scene
 *   always agree, and one press more flips it (slow lane);
 * - key 0 under dad lock and across the grown-ups page: debug comes back as it was
 *   left, and key 0 on the page does nothing (slow lane);
 * - THE END through window resizes and a hidden tab: still THE END, Dad's cue inside
 *   the canvas's corner, Dad's 2 starts the title (slow lane);
 * - a returning player with everything maxed: the grown-ups page's three pages fit
 *   (with item 103's Shape-Shifter levels and item 127's stored words), and an
 *   episode starts;
 * - green mashed after each choice (the bedroom door, the warm-up grab and its door,
 *   the bubble circle, a hub door): each counts once (slow lane);
 * - the move choice's caption clears as its line ends (fix 94) and the stick hint's
 *   nub sways (fix 93), both off the frozen fight's clock;
 * - the word machine: green mashed through the next round's line slots no tile laid
 *   under her (fix 98; slow lane).
 */

import { test, expect, type Page } from '@playwright/test';
import { BANK, STORED } from '../content/phonics/bank';
import { FAMILIES } from '../content/phonics/families';
import { FRAMES } from '../content/phonics/sentences';
import { RUNE_SOUNDS } from '../src/rules/charge';
import { SHIFT_WORDS } from '../src/rules/shifter';
import { SLOW, boot, choose, collectErrors, debugTagShown, expectNoErrors, mash, press, seedProgress, state, texts, toTheEnd, until } from './harness';
import { layoutIssues } from './qa/checks';
import { qaLayout } from './qa/probe';


/** Debug mode, as the player sees it: the scene, the DEBUG tag and the room's debug hooks agree. */
async function settled(page: Page, what: string): Promise<{ debug: boolean; scene: string }> {
  // A press's scene change lands a frame or two later: wait for the same listening room twice, 700 ms apart.
  let now = await state(page);
  for (let i = 0; i < 40; i++) {
    const s = await until(page, (st) => st.scene !== 'Wait' && Boolean(st.room?.player) && !st.room!.locked, 30_000, what);
    await page.waitForTimeout(700);
    now = await state(page);
    if (now.scene === s.scene && now.room && !now.room.locked) break;
  }
  const debug = now.scene === 'Debug';
  expect(Boolean(now.room?.debug), `${what}: the debug room's hooks`).toBe(debug);
  expect(await debugTagShown(page), `${what}: the DEBUG tag`).toBe(debug);
  return { debug, scene: now.scene };
}

test('key 0 mashed in the hub: debug mode, the tag and the scene always agree, and it ends where an even count of presses leaves it', SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=house&nojourney=1');
  await until(page, (s) => s.scene === 'Hub' && Boolean(s.room?.player) && !s.room!.locked, 30_000, 'hub');
  for (const gaps of [[0, 0], [40, 40, 40, 40], [150, 150, 150], [400, 30, 400, 30, 400]]) {
    for (const ms of gaps) {
      await page.keyboard.press('Digit0');
      await page.waitForTimeout(ms);
    }
    await settled(page, `after ${gaps.length} presses ${gaps.join('/')} ms apart`);
  }
  // Whatever the mashing left, one press more flips it, and one more flips it back.
  const was = (await settled(page, 'before one press')).debug;
  await page.keyboard.press('Digit0');
  expect((await settled(page, 'one press')).debug).toBe(!was);
  await page.keyboard.press('Digit0');
  expect((await settled(page, 'another press')).debug).toBe(was);
  expectNoErrors(errors);
});

test('key 0 under dad lock and across the grown-ups page: debug comes back as it was left', SLOW, async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=house&nojourney=1');
  await until(page, (s) => s.scene === 'Hub' && Boolean(s.room?.player) && !s.room!.locked, 30_000, 'hub');
  await page.keyboard.press('Backquote');
  await page.keyboard.press('Digit0');
  expect((await settled(page, 'key 0 under dad lock')).debug).toBe(true);
  await page.keyboard.press('Backquote');
  await page.keyboard.press('F9');
  await until(page, (s) => s.scene === 'Parent', 20_000, 'the grown-ups page');
  await page.waitForTimeout(500);
  // Key 0 on the grown-ups page is not a game room: nothing.
  await page.keyboard.press('Digit0');
  await page.waitForTimeout(300);
  expect((await state(page)).scene).toBe('Parent');
  await page.keyboard.press('F9');
  expect((await settled(page, 'back from the grown-ups page')).debug).toBe(true);
  await page.keyboard.press('Digit0');
  expect(await settled(page, 'debug off')).toEqual({ debug: false, scene: 'Hub' });
  expectNoErrors(errors);
});

test('THE END through window resizes and a hidden tab: still THE END, its cue placed, and Dad\'s 2 starts the title', SLOW, async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=victory&nojourney=1&read=bed,hat');
  await toTheEnd(page, { hush: true });
  await until(page, (s) => s.scene === 'TheEnd' && Boolean(s.theEnd?.dad), 30_000, "THE END's Dad cue");
  for (const [w, h] of [[900, 600], [1600, 900], [700, 900], [1280, 720]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    const placed = await page.evaluate(() => {
      const cue = document.getElementById('dad-buttons')?.getBoundingClientRect();
      const canvas = document.querySelector('canvas')!.getBoundingClientRect();
      return cue ? { inside: cue.right <= canvas.right + 1 && cue.bottom <= canvas.bottom + 1 && cue.left >= canvas.left - 1 && cue.top >= canvas.top - 1, near: canvas.right - cue.right < 60 && canvas.bottom - cue.bottom < 60 } : null;
    });
    expect(placed, `the Dad cue at ${w}x${h}`).toEqual({ inside: true, near: true });
  }
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(500);
  expect((await state(page)).scene).toBe('TheEnd');
  await page.keyboard.press('Digit2');
  await until(page, (s) => s.scene === 'Title', 20_000, 'the title');
  expectNoErrors(errors);
});

test('a returning player with everything maxed: the grown-ups page fits all three pages, and an episode starts', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const stat = { seen: 9999, right: 7777, wrong: 2222, recent: [true, false, true, false, true, false, true, false], last: Date.now() };
  const each = (ids: readonly string[]) => Object.fromEntries(ids.map((id) => [id, stat]));
  const words = BANK.map((w) => w.word);
  await seedProgress(page, {
    version: 1,
    sounds: each(RUNE_SOUNDS),
    words: each(words),
    spelling: each(words),
    frames: each(FRAMES.map((f) => f.id)),
    rimes: each(FAMILIES.map((f) => f.rime)),
    onsets: {},
    grabs: each(words),
    grabLevels: Object.fromEntries(words.map((w) => [w, 3])),
    bridgeLevels: Object.fromEntries(words.map((w) => [w, 3])),
    // Item 103: the Shape-Shifter's levels, every level filled.
    shifterLevels: Object.fromEntries(SHIFT_WORDS.map((w, i) => [w, (i % 3) + 1])),
    bag: { left: [], round: 999 },
    moveBag: { left: [], round: 999 },
    padBag: { left: [], round: 999 },
    episodes: 9999,
    recent: { words: words.slice(0, 24) },
  });
  await boot(page, '?scene=parent&qa=1');
  for (const p of [1, 2, 3]) {
    await until(page, (s) => s.scene === 'Parent', 30_000, `the grown-ups page ${p}`);
    await page.waitForTimeout(600);
    // Item 103: page 1 lists the Shape-Shifter's words by help level.
    if (p === 1) expect((await texts(page)).some((t) => t.text.includes('Shape-Shifter levels') && t.text.includes(`2: ${SHIFT_WORDS.filter((_, i) => i % 3 === 1).sort()[0]}`))).toBe(true);
    // Item 127: the stored words are listed apart, on page 3 with their reasons, never in page 2's grid.
    if (p === 2) expect((await texts(page)).filter((t) => STORED.some((w) => new RegExp(`^${w.word}( NEW)?  `).test(t.text))).map((t) => t.text)).toEqual([]);
    if (p === 3) for (const w of STORED) expect((await texts(page)).some((t) => t.text.startsWith(`${w.word.toUpperCase()} (`) && t.text.endsWith(w.stored!)), w.word).toBe(true);
    const bad = layoutIssues(await qaLayout(page), 'Parent', new Set()).filter((i) => i.kind === 'text-offscreen' || i.kind === 'text-overlap');
    expect(bad.map((i) => i.detail), `page ${p}`).toEqual([]);
    await press(page, 'green');
  }
  await page.goto('/?qa=1&hooks=1&cast=default');
  await until(page, (s) => s.scene === 'Title', 60_000, 'the title');
  await press(page, 'green');
  await until(page, (s) => s.scene === 'Bedroom', 30_000, 'the bedroom');
  expectNoErrors(errors);
});

/** A busy child's green, ten presses 60 ms apart, right after a choice. */
const mashGreen = (page: Page) => mash(page, 'green', 60, 10);

test('green mashed after each choice: the bedroom door, the warm-up grab and its door, a hub door each count once', SLOW, async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=bedroom&nojourney=1');
  await until(page, (s) => s.scene === 'Bedroom' && s.room?.round === 'bedroom:door' && !s.room.locked, 90_000, 'bedroom door open');
  const start = (await state(page)).episode.stepIndex;
  await choose(page, 'door');
  await mashGreen(page);
  const ask = await until(page, (s) => s.scene === 'Entry' && s.room?.round === 'entry:find' && !s.room.locked, 90_000, 'warm-up clue');
  expect(ask.episode.stepIndex, 'one step on from the bedroom').toBe(start + 1);
  const word = ask.room!.grab!.word;
  await choose(page, `grab_${word}`);
  await mashGreen(page);
  const door = await until(page, (s) => s.scene === 'Entry' && s.room?.round === 'entry:door' && !s.room.locked, 60_000, 'front door open');
  expect(door.episode.fetched.filter((w) => w === word), 'the warm-up word fetched once').toEqual([word]);
  expect(door.room!.grab!.misses, 'no miss from the mashing').toBe(0);
  await choose(page, 'door');
  await mashGreen(page);
  const hub = await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:circle', 90_000, 'the circle');
  expect(hub.episode.stepIndex, 'one step on from the warm-up').toBe(start + 2);
  await choose(page, 'circle');
  await mashGreen(page);
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:doors' && !s.room.locked, 90_000, 'the doors');
  await choose(page, 'door_a');
  await mashGreen(page);
  const room = await until(page, (s) => s.scene !== 'Hub' && s.scene !== 'Wait' && Boolean(s.room?.player), 30_000, 'side room a');
  expect(room.episode.house.done, 'no room done yet').toEqual([]);
  expect(room.episode.stepIndex, 'still house part 1').toBe(start + 2);
  expectNoErrors(errors);
});

test("the move choice's caption clears as its line ends, and the stick hint's nub sways (item 092: both ran on the frozen fight's clock)", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&battle=short&nojourney=1');
  const caption = async () => (await texts(page)).some((t) => t.scene === 'Battle' && /^USE\b/.test(t.text));
  await until(page, (s) => Boolean(s.battle?.choice) && /_use_move_[a-z]+$/.test(s.voice.speaking ?? ''), 60_000, 'the USE prompt');
  expect(await caption(), 'the prompt captioned').toBe(true);
  await until(page, (s) => Boolean(s.battle?.choice?.open) && !s.voice.busy, 30_000, 'the prompt said');
  // The box lingers 250 ms and fades in 160 ms; on the frozen clock it stayed up about 10 s.
  await expect.poll(caption, { timeout: 1_000, intervals: [100] }).toBe(false);
  // Standing still brings the stick hint; its nub sways 28 px each way-and-back in 900 ms.
  await until(page, (s) => s.battle?.choice?.stickNub != null, 30_000, 'the stick hint');
  const at: number[] = [];
  for (let i = 0; i < 6; i++) {
    at.push((await state(page)).battle!.choice!.stickNub!);
    await page.waitForTimeout(40);
  }
  expect(Math.max(...at) - Math.min(...at), `the nub at ${at.map((x) => x.toFixed(1)).join(', ')}`).toBeGreaterThan(10);
  expectNoErrors(errors);
});

test('the word machine: green mashed through the next round\'s line does not slot the tile laid under her (item 092)', SLOW, async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&game=word_machine&nojourney=1');
  const first = await until(page, (s) => s.room?.machine?.phase === 'pick' && !s.room.locked, 60_000, 'the first word');
  const { rounds, family } = first.room!.machine!;
  // The second word in the first word's family: the same tile row, one tile where she stands.
  expect(family).toContain(rounds[1]);
  await choose(page);
  for (let i = 0; i < 40; i++) {
    const s = await state(page);
    if (s.room?.machine?.index === 1 && s.room.machine.phase === 'pick' && !s.room.locked) break;
    await press(page, 'green');
    await page.waitForTimeout(60);
  }
  await mashGreen(page);
  const s = await state(page);
  expect(s.room!.machine!.index, 'still the second word').toBe(1);
  expect(s.room!.machine!.phase, 'still picking: no tile slotted without walking').toBe('pick');
  expect(s.room!.machine!.slotted).toBeNull();
  expect(s.room!.machine!.misses).toBe(0);
  expectNoErrors(errors);
});
