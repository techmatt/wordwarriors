/**
 * Item 048: KEY and YOYO sound out in full. A miss in the sentence room sounds
 * every unit, the long vowels on their own lines: KEY is K, long E; YOYO is
 * Y, long O, Y, long O. The counter draw and the warm-up clue are unit tests
 * (tests/unit/sentences.test.ts, tests/unit/kywords.test.ts).
 */

import { test, expect } from '@playwright/test';
import { BAG_WORDS } from '../src/rules/sentences';
import { FETCH_FRAMES, SLOW, boot, collectErrors, expectNoErrors, press, readToKeyWord, seedProgress, until, walkTo } from './harness';

const SOUNDS: Record<string, string[]> = {
  key: ['k', 'long_e'],
  yoyo: ['y', 'long_o', 'y', 'long_o'],
};

for (const [word, sounds] of Object.entries(SOUNDS)) {
  test(`sentence hint: a miss on ${word.toUpperCase()} sounds every unit (${sounds.join(' ')})`, SLOW, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = collectErrors(page);
    // Solid frames skip the listening pass; a bag of just this word makes it room a's key word.
    const stat = { seen: 6, right: 6, wrong: 0, recent: [true, true, true, true, true, true], last: Date.now() };
    await seedProgress(page, {
      version: 1,
      sounds: {},
      words: {},
      spelling: {},
      frames: Object.fromEntries(FETCH_FRAMES.map((f) => [f, stat])),
      // `bagKnown` as now, or the store tops the bag up with every word added since item 035.
      bag: { left: [word], round: 1 },
      bagKnown: BAG_WORDS,
      episodes: 0,
    });
    await boot(page, '?scene=room&slot=a&nojourney=1&difficulty=2');
    const first = await until(page, (s) => s.scene === 'SentenceRoom' && Boolean(s.room?.sentence), 60_000, 'sentence room').catch((e: Error) => {
      throw new Error(`${e.message}; page errors: ${errors.join(' | ')}`);
    });
    expect(first.room!.sentence!.key).toBe(word);
    await readToKeyWord(page);
    const awake = await until(page, (s) => (s.room?.spots.length ?? 0) === 3 && !s.room!.locked, 30_000, 'three objects');
    const wrong = awake.room!.spots.find((sp) => sp.correct === false)!;
    await walkTo(page, wrong.x, wrong.y + 12);
    await until(page, (s) => Boolean(s.room && !s.room.locked), 30_000, 'room listening');
    await press(page, 'green');
    const want = sounds.map((u) => `letter_${u}_sound`);
    const heard = await until(page, (s) => s.voice.history.filter((id) => /^letter_.*_sound$/.test(id)).length >= want.length && !s.room!.locked, 30_000, 'hint sounded');
    expect(heard.voice.history.filter((id) => /^letter_.*_sound$/.test(id))).toEqual(want);
    expect(heard.voice.history).not.toContain(`word_${word}`);
    expectNoErrors(errors);
  });
}
