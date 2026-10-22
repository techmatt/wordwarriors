/**
 * The sixth bug hunt (item 102; docs/qa-findings.md, Hunt 6): the Shape-Shifter
 * under odd input. Yellow and green mashed through its morphs and misses, the
 * grown-ups page at each point of a link, key 0 in and out, dad lock.
 */

import { test, expect, type Page } from '@playwright/test';
import { REACH } from '../src/config';
import { qaLayout } from './qa/probe';
import { SLOW, boot, choose, collectErrors, dadLock, expectNoErrors, place, press, state, texts, until, type WWState } from './harness';

const sh = (s: WWState) => s.room?.shifter;
const ready = (i: number) => (s: WWState) => s.scene === 'ShifterRoom' && sh(s)?.index === i && sh(s)!.phase === 'pick' && !s.room!.locked;

/** What the room shows matches its link: read it, the label is the new word; fix it, the old one. */
function consistent(s: WWState, what: string): void {
  const l = sh(s)!;
  expect(l.label, `${what}: the label`).toBe(l.beat === 'read' ? l.word : l.from);
  expect(s.room!.spots.length, `${what}: options standing`).toBe(l.options.length);
}

/** The right pick on link `i`, again if an idle re-prompt locked the room as green landed (the room ignores green while it talks). */
async function pickRight(page: Page, i: number): Promise<void> {
  for (let tries = 0; tries < 4; tries++) {
    await choose(page);
    try {
      await until(page, (st) => (sh(st)?.index ?? 0) > i || sh(st)?.phase !== 'pick', 8_000, `link ${i} taken`);
      return;
    } catch {
      // Not taken: pick again.
    }
  }
  throw new Error(`link ${i}: green on the right pick never taken`);
}

async function mash(page: Page, button: string, ms: number, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await press(page, button);
    await page.waitForTimeout(ms);
  }
}

test('Shape-Shifter: the lit letter on a read-it label pulses at full size, never blinking out', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=shifter&seed=601');
  const s = await until(page, (st) => sh(st)?.beat === 'read' && sh(st)!.phase === 'pick', 60_000, 'a read-it link');
  const l = sh(s)!;
  const heights: number[] = [];
  for (let i = 0; i < 16; i++) {
    const t = (await texts(page)).find((x) => x.scene === 'ShifterRoom' && x.text === l.word[l.pos]!.toUpperCase() && Math.abs((x.bounds[1]! + x.bounds[3]!) / 2 - 400) < 60);
    heights.push(t ? t.bounds[3]! - t.bounds[1]! : 0);
    await page.waitForTimeout(70);
  }
  expect(Math.min(...heights), `the lit letter's height over a pulse: ${heights.join(', ')}`).toBeGreaterThan(Math.max(...heights) * 0.8);
  // Right where she stands: the next link's options stand where these did, and none may be under her.
  await choose(page);
  const next = await until(page, (st) => (sh(st)?.index ?? 0) > l.index && st.room?.spots.length === 3, 60_000, 'the next link\'s options');
  const p = next.room!.player;
  for (const sp of next.room!.spots) expect(Math.hypot(sp.x - p.x, sp.y - p.y), `out of reach of ${sp.id}`).toBeGreaterThan(REACH);
  expectNoErrors(errors);
});

test('Shape-Shifter: yellow and green mashed through every link, its misses and its morphs: it never stalls and every word is read', SLOW, async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=shifter&seed=601');
  const s0 = await until(page, ready(0), 60_000, 'first link');
  const words = sh(s0)!.words;
  for (let i = 0; i < words.length; i++) {
    const s = await until(page, ready(i), 60_000, `link ${i}`);
    consistent(s, `link ${i}`);
    // A wrong pick, then yellow and green mashed while it plays out.
    const wrong = s.room!.spots.find((sp) => sp.correct === false)!;
    await place(page, wrong.x, wrong.y + 12);
    await mash(page, 'green', 60, 4);
    await mash(page, 'yellow', 90, 12);
    const back = await until(page, ready(i), 60_000, `link ${i} after the mashed miss`);
    expect(sh(back)!.misses, `link ${i}: one miss per green on a wrong pick, none while it played out`).toBeGreaterThanOrEqual(1);
    expect(sh(back)!.misses).toBeLessThanOrEqual(2);
    consistent(back, `link ${i} after the miss`);
    // Yellow at the right one (a hint), mashed; then green mashed through the morph.
    const right = back.room!.spots.find((sp) => sp.correct === true)!;
    await place(page, right.x, right.y + 12);
    await mash(page, 'yellow', 70, 6);
    await until(page, ready(i), 60_000, `link ${i} after the hint`);
    await mash(page, 'green', 70, 10);
    await mash(page, 'yellow', 70, 10);
    await until(page, (st) => st.scene !== 'ShifterRoom' || (sh(st)?.index ?? 0) > i || sh(st)?.phase === 'done', 60_000, `${words[i]} read`);
  }
  const hub = await until(page, (st) => st.scene === 'Hub', 60_000, 'back in the hub');
  for (const w of words) expect(hub.episode.fetched).toContain(w);
  expectNoErrors(errors);
});

test('Shape-Shifter: the grown-ups page at each point of a link brings her back to the same link, the room consistent', SLOW, async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=shifter&seed=602');
  const s0 = await until(page, ready(0), 60_000, 'first link');
  const words = sh(s0)!.words;
  const away = async (what: string): Promise<WWState> => {
    await page.keyboard.press('F9');
    await until(page, (s) => s.scene === 'Parent', 10_000, `parent (${what})`);
    await page.waitForTimeout(300);
    await press(page, 'red');
    return until(page, (s) => s.scene !== 'Parent' && s.scene !== 'Wait' && (s.scene !== 'ShifterRoom' || sh(s)?.phase === 'pick' || sh(s)?.phase === 'done'), 60_000, `back (${what})`);
  };
  // Link 0 at pick; then a miss under way; then the right pick's morph.
  let s = await away('at pick');
  expect(sh(s)!.index).toBe(0);
  s = await until(page, ready(0), 60_000, 'link 0 again');
  consistent(s, 'link 0 back from pick');
  await choose(page, s.room!.spots.find((sp) => sp.correct === false)!.id);
  await page.waitForTimeout(250);
  s = await away('during a miss');
  s = await until(page, ready(0), 60_000, 'link 0 after the miss');
  consistent(s, 'link 0 back from a miss');
  await choose(page);
  await page.waitForTimeout(300);
  s = await away('during the morph');
  s = await until(page, ready(1), 60_000, 'link 1 after the morph');
  consistent(s, 'link 1 back from the morph');
  expect(s.episode.fetched).toContain(words[0]);
  // The last link, away during its morph: the room ends and goes back to the hub.
  for (let i = 1; i < words.length - 1; i++) {
    await until(page, ready(i), 60_000, `link ${i}`);
    await choose(page);
  }
  await until(page, ready(words.length - 1), 60_000, 'last link');
  await choose(page);
  await page.waitForTimeout(300);
  s = await away('during the last morph');
  const hub = await until(page, (st) => st.scene === 'Hub', 60_000, 'hub');
  for (const w of words) expect(hub.episode.fetched).toContain(w);
  expect(hub.episode.house.done).toContain('a');
  expectNoErrors(errors);
});

test('Shape-Shifter: under dad lock green and yellow do nothing; key 0 in and out restarts the room as it was', SLOW, async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=shifter&seed=603');
  let s = await until(page, ready(0), 60_000, 'first link');
  const right = s.room!.spots.find((sp) => sp.correct === true)!;
  await place(page, right.x, right.y + 12);
  await dadLock(page, true);
  await mash(page, 'green', 80, 5);
  await mash(page, 'yellow', 80, 5);
  await page.waitForTimeout(800);
  s = await state(page);
  expect(sh(s)!.index).toBe(0);
  expect(sh(s)!.phase).toBe('pick');
  expect(sh(s)!.aided).toBe(false);
  await dadLock(page, false);
  const before = JSON.stringify((await state(page)).progress);
  await page.keyboard.press('Digit0');
  await until(page, (st) => st.scene === 'Debug', 30_000, 'debug room');
  await page.waitForTimeout(500);
  await page.keyboard.press('Digit0');
  s = await until(page, ready(0), 60_000, 'shifter again');
  consistent(s, 'back from debug');
  expect(JSON.stringify(s.progress.shifterLevels ?? {})).toBe(JSON.stringify(JSON.parse(before).shifterLevels ?? {}));
  expectNoErrors(errors);
});

test('Shape-Shifter level 1: a stone she reaches while the instruction plays sounds once the room is quiet', SLOW, async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=shifter&seed=604');
  const first = await until(page, ready(0), 60_000, 'first link');
  if (sh(first)!.beat === 'read') await pickRight(page, 0);
  const s = await until(page, (st) => sh(st)?.beat === 'fix' && sh(st)!.phase === 'intro' && st.room!.spots.length === 3, 60_000, 'a fix-it link opening');
  expect(sh(s)!.level).toBe(1);
  const stone = s.room!.spots.find((sp) => sp.correct === false)!;
  await place(page, stone.x, stone.y + 12);
  const since = s.voice.history.length;
  const letter = stone.id.slice('stone_'.length);
  await until(page, ready(sh(s)!.index), 60_000, 'the link open');
  await until(page, (st) => st.voice.history.slice(since).includes(`letter_${letter}_sound`), 10_000, `the ${letter} stone sounding`);
  expectNoErrors(errors);
});

test("minigame debug mode: Dad's 2 in the same frame as key 0 out of a debug Charge read records nothing in the real store", SLOW, async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=house&part=2&nojourney=1');
  await until(page, (s) => s.scene === 'Hub' && Boolean(s.room?.player), 30_000, 'hub');
  const blob = await page.evaluate(() => localStorage.getItem('wordwarriors.progress'));
  await page.keyboard.press('0');
  await until(page, (st) => st.scene === 'Debug' && (st.room?.spots.length ?? 0) > 0 && !st.room!.locked, 30_000, 'debug room');
  await choose(page, 'debug:charge');
  const read = await until(page, (st) => st.room?.charge?.phase === 'read', 60_000, 'the read');
  // Key 0 back to the debug room and Dad's 2 at once, before Phaser stops the room.
  await page.evaluate(() => {
    for (const code of ['Digit0', 'Digit2']) window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code.slice(-1), bubbles: true }));
  });
  const back = await until(page, (st) => st.scene === 'Debug' && Boolean(st.room?.debug), 30_000, 'the debug room again');
  expect(back.episode.read).not.toContain(read.room!.charge!.word);
  expect(await page.evaluate(() => localStorage.getItem('wordwarriors.progress'))).toBe(blob);
  expectNoErrors(errors);
});

test('THE END with chef Dada Jason (the tallest grown-up): no figure bobs up into the title', SLOW, async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=theend&ally=dada_jason&qa=1');
  const s = await until(page, (st) => st.scene === 'TheEnd' && Boolean(st.theEnd), 30_000, 'THE END');
  expect(s.theEnd!.heroes).toContain('dada_jason');
  await page.waitForTimeout(1500);
  let top = Infinity;
  let titleBottom = 0;
  for (let i = 0; i < 20; i++) {
    const l = await qaLayout(page);
    for (const im of l.images) if (im.scene === 'TheEnd' && im.key.startsWith('char_')) top = Math.min(top, im.b[1]);
    for (const t of l.texts) if (t.scene === 'TheEnd' && t.text === s.theEnd!.text) titleBottom = Math.max(titleBottom, t.b[3]);
    await page.waitForTimeout(60);
  }
  expect(titleBottom, 'the title drawn').toBeGreaterThan(0);
  // The title's box runs about 25 px below its letters' stroke (the font's descent).
  expect(top, `the highest figure top against the title's box bottom ${titleBottom}`).toBeGreaterThan(titleBottom - 25);
  expectNoErrors(errors);
});
