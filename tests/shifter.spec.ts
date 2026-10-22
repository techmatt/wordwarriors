/**
 * Item 096: the Shape-Shifter. Untagged (a whole visit, ~8 s): one room
 * played through both beats at base level, a wrong pick on each (sounded
 * out, no penalty), the new word said only once she has it, every word
 * fetched and the last creature with them.
 */

import { test, expect, type Page } from '@playwright/test';

import { SLOW, SPEED, boot, choose, collectErrors, expectNoErrors, until, type WWState } from './harness';

const shifter = (s: WWState) => s.room?.shifter;
/** Screenshots land in tests/screenshots/ (ignored). */
const shot = (page: Page, name: string) => page.screenshot({ path: `tests/screenshots/096_${name}.png` });

test('Shape-Shifter at base level: read it and fix it, a wrong pick on each sounded out, each word said only once she has it', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=shifter');
  const s0 = await until(page, (st) => st.scene === 'ShifterRoom' && shifter(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'first link');
  expect(s0.episode.house.plan!.find((p) => p.slot === 'a')!.kind).toBe('shifter');
  // The first creature is said: it is shown, not read.
  expect(s0.voice.history).toContain(`word_${shifter(s0)!.start}`);
  const words = shifter(s0)!.words;
  const beats = new Set<string>();
  const missed = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    const s = await until(page, (st) => shifter(st)?.index === i && shifter(st)!.phase === 'pick' && !st.room!.locked, 60_000, `link ${i}`);
    const l = shifter(s)!;
    expect(l.level).toBe(1);
    expect(l.lit).toBe(true);
    // Never said before she has it.
    expect(s.voice.history).not.toContain(`word_${l.word}`);
    if (!beats.has(l.beat)) await shot(page, l.beat);
    beats.add(l.beat);
    if (l.beat === 'read') {
      // The new word is written on the creature; a picture beside it differs from it only at the changed
      // letter (at the vowel or the last letter one may be another picture: hunt 6, M29).
      expect(l.label).toBe(l.word);
      expect(s.room!.spots.map((sp) => sp.id).sort()).toEqual([...l.options].sort());
      expect(l.options.filter((o) => o !== l.word && [...o].filter((c, k) => c !== l.word[k]).length === 1).length).toBeGreaterThanOrEqual(1);
    } else {
      // The creature changed; its label is still the old word; the stones are letters.
      expect(l.label).toBe(l.from);
      expect(s.room!.spots.find((sp) => sp.correct)!.id).toBe(`stone_${l.word[l.pos]}`);
    }
    if (!missed.has(l.beat)) {
      missed.add(l.beat);
      const wrong = s.room!.spots.find((sp) => sp.correct === false)!.id;
      await choose(page, wrong);
      const again = await until(page, (st) => shifter(st)!.phase === 'pick' && !st.room!.locked && shifter(st)!.misses === 1, 60_000, `${l.beat} miss sounded out`);
      const since = again.voice.history.slice(s.voice.history.length);
      if (l.beat === 'read') {
        expect(since.some((id) => id.endsWith('_shifter_picked'))).toBe(true);
        expect(since.some((id) => id.endsWith('_shifter_says'))).toBe(true);
        expect(since).not.toContain(`word_${wrong}`);
      } else {
        // Her letter's sound (a name's bridge first where it holds it), never a word made of it.
        expect(since.some((id) => id.endsWith('_shifter_stone'))).toBe(true);
        expect(since).toContain(`letter_${wrong.slice('stone_'.length)}_sound`);
        expect(since.filter((id) => id.startsWith('word_'))).toEqual([]);
        expect(shifter(again)!.label).toBe(l.from);
      }
      expect(again.voice.history).not.toContain(`word_${l.word}`);
    }
    await choose(page);
    const after = await until(page, (st) => st.scene !== 'ShifterRoom' || (shifter(st)?.index ?? 0) > i || shifter(st)?.phase === 'done', 60_000, `${l.word} read`);
    expect(after.voice.history).toContain(`word_${l.word}`);
    expect(after.episode.fetched).toContain(l.word);
  }
  expect([...beats].sort()).toEqual(['fix', 'read']);
  const hub = await until(page, (st) => st.scene === 'Hub', 60_000, 'back in the hub');
  expect(hub.episode.house.done).toContain('a');
  for (const w of words) expect(hub.episode.fetched).toContain(w);
  // A miss keeps the word at level 1; right first time, unaided, steps up.
  expect(Object.values(hub.progress.shifterLevels ?? {}).sort()).toEqual([1, 1, ...Array(words.length - 2).fill(2)].sort());
  expectNoErrors(errors);
});

test('Shape-Shifter pacing (hunt 6, M26, M30): the full instruction once a beat, then its short cue; fix-it its own praise; a cued link 5 to 7 s with instant answers', SLOW, async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=shifter', SPEED, { voice: 'real' });
  const words = shifter(await until(page, (st) => st.scene === 'ShifterRoom' && shifter(st)?.phase === 'pick', 60_000, 'first link'))!.words;
  // Game time (the page's clocks run at SPEED; `performance.now` is warped to game time).
  const now = () => page.evaluate(() => performance.now());
  const ready: number[] = [];
  /** Each link's arrival: its beat already told, so its short cue. */
  const cued: boolean[] = [];
  const told = new Set<string>();
  let heard = 0;
  let prev = '';
  for (let i = 0; i < words.length; i++) {
    const s = await until(page, (st) => shifter(st)?.index === i && shifter(st)!.phase === 'pick' && !st.room!.locked, 60_000, `link ${i}`);
    ready.push(await now());
    const l = shifter(s)!;
    const since = s.voice.history.slice(heard);
    const full = since.some((id) => id.endsWith(`_shifter_${l.beat}`) || id.endsWith(`_shifter_${l.beat}_2`));
    const cue = since.some((id) => id.endsWith(`_shifter_cue_${l.beat}`));
    expect(full, `link ${i} (${l.beat}): the full instruction only the first time`).toBe(!told.has(l.beat));
    expect(cue, `link ${i} (${l.beat}): the short cue after`).toBe(told.has(l.beat));
    cued.push(told.has(l.beat));
    // The link before's praise (said under this one's strike): a fix-it link's is its own, never "by yourself" (M30).
    if (prev === 'fix') {
      expect(since.some((id) => /_shifter_fixed(_\d+)?$/.test(id))).toBe(true);
      expect(since.some((id) => /_right_\d+$/.test(id))).toBe(false);
    }
    expect(since.some((id) => /_shifter_next(_\d+)?$/.test(id))).toBe(false);
    prev = l.beat;
    told.add(l.beat);
    heard = s.voice.history.length;
    await choose(page);
  }
  // A link into one with the short cue (was 12 to 15 s): into read it or fix it after fix it 4.8 to 5.7 s, fix it
  // after read it 6.6 to 7 s (two morphs back to back: the read word's, then the next spell's).
  const links = ready.slice(1).map((t, i) => ({ ms: t - ready[i]!, cued: cued[i + 1]! }));
  console.log(`shifter links (game ms, pick-ready to pick-ready; * the short cue): ${links.map((x) => `${Math.round(x.ms)}${x.cued ? '*' : ''}`).join(', ')}`);
  const short = links.filter((x) => x.cued).map((x) => x.ms);
  expect(short.length).toBeGreaterThan(0);
  for (const ms of short) expect(ms).toBeLessThan(7500);
  expectNoErrors(errors);
});
