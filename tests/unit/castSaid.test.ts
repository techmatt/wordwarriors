/**
 * Item 178: words a cast's own lines say first (Elsa's ICE castle, Smaug's DRAGON mountain, Blade
 * Matt's SWORD, Jasmine's SAND). Matt (MESSAGE #5631): "hearing a word in a character line before
 * reading it is not a problem for Julia"; the planner's exclusion stays only as a soft preference
 * and never keeps a word out of play. The quest line, hub scene, threat and taunt reach the key draws
 * as `softSaid` (src/episode/plans.ts `planInput`), weighed SOFT_SAID_WEIGHT; the warm-up's word
 * (`saidBefore`) stays out. A sign's glyph keeps nothing out (item 191).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BANK_BY_WORD } from '../../content/phonics/bank';
import { MINIGAME_BY_ID } from '../../src/rules/minigames';
import { BAG_WORDS, favourWords } from '../../src/rules/bank';
import { episodePlans, type EpisodeInput } from '../../src/rules/rooms';
import { ProgressStore } from '../../src/state/ProgressStore';
import { memory, seeded, spread } from './seeds';

// Not a stored word (hunt 13: SWORD waited for its art; item 191: such a word is stored by derivation).
const CAST_SAID = ['ice', 'castle', 'dragon', 'sword', 'shield', 'crown', 'sand'].filter((w) => !BANK_BY_WORD[w]?.stored);

// A sign's glyph keeps nothing out (item 191, Matt 2026-11-17); the bed she wakes in still keeps its glyph's
// word out of the key words (`planInput`'s `notKeys`), so no other live word may share it.
test("no live word but BED has the bed's glyph (item 178: QUILT's 🛏️ was the bed)", async () => {
  const { THINGS } = await import('../../content/phonics/bank');
  const { ART_BY_ID } = await import('../../content/art/assets');
  const bed = ART_BY_ID.prop_bed?.glyph;
  for (const w of THINGS) if (w.word !== 'bed') assert.ok(!w.glyph || w.glyph !== bed, `${w.word}'s ${w.glyph} is the bed's`);
});

test('cast-said words (item 178, Matt): live, weighed down where the cast said them first, never kept out', () => {
  for (const w of CAST_SAID) assert.ok(BAG_WORDS.includes(w), `${w} is live, in her word bag`);
  const games = [MINIGAME_BY_ID['sentence:we_can_use_the']!, MINIGAME_BY_ID['sentence:go_get_the']!, MINIGAME_BY_ID['sentence:scared_of_the']!] as EpisodeInput['games'];
  const base: EpisodeInput = { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', games };
  const reads = (input: EpisodeInput, seed: number) => episodePlans(new ProgressStore(memory()), input, seeded(spread(seed))).flatMap((p) => [p.key, ...p.fetches]);
  favourWords(CAST_SAID);
  try {
    let said = 0;
    let free = 0;
    for (let seed = 1; seed <= 30; seed++) {
      said += reads({ ...base, softSaid: CAST_SAID }, seed).filter((w) => CAST_SAID.includes(w)).length;
      free += reads(base, seed).filter((w) => CAST_SAID.includes(w)).length;
    }
    assert.ok(said > 0, `said first, the words still come up (${said} in 30 episodes): never kept out`);
    assert.ok(said < free, `but less often than where nothing said them (${said} against ${free})`);
  } finally {
    favourWords([]);
  }
});
