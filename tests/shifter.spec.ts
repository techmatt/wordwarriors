/**
 * Item 096: the Shape-Shifter. Untagged (a whole visit, ~8 s): one room
 * played through both beats at base level, a wrong pick on each (sounded
 * out, no penalty), the new word said only once she has it, every word
 * fetched and the last creature with them.
 */

import { test, expect, type Page } from '@playwright/test';

import { boot, choose, collectErrors, expectNoErrors, until, type WWState } from './harness';

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
      // The new word is written on the creature; the pictures differ from it only at the changed letter.
      expect(l.label).toBe(l.word);
      expect(s.room!.spots.map((sp) => sp.id).sort()).toEqual([...l.options].sort());
      for (const o of l.options) expect([...o].filter((c, k) => c !== l.word[k]).length).toBeLessThanOrEqual(1);
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
