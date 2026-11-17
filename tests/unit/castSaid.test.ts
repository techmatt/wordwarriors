/**
 * Item 178: words a cast's own lines say first (Elsa's ICE castle, Smaug's DRAGON mountain, Blade
 * Matt's SWORD, Jasmine's SAND). Matt (MESSAGE #5631): "hearing a word in a character line before
 * reading it is not a problem for Julia"; the planner's exclusion stays only as a soft preference
 * and never keeps a word out of play. The quest line, hub scene, threat and taunt reach the key draws
 * as `softSaid` (src/episode/plans.ts `planInput`), weighed SOFT_SAID_WEIGHT; what the screen shows
 * first (`saidBefore`: signs, the warm-up's word) stays out.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STORED_WHY } from '../../content/phonics/bank';
import { MINIGAME_BY_ID } from '../../src/rules/minigames';
import { BAG_WORDS, favourWords } from '../../src/rules/bank';
import { episodePlans, type EpisodeInput } from '../../src/rules/rooms';
import { ProgressStore } from '../../src/state/ProgressStore';
import { memory, seeded, spread } from './seeds';

// Not a word stored for its picture (hunt 13: SWORD waits for its art).
const CAST_SAID = ['ice', 'castle', 'dragon', 'sword', 'shield', 'crown', 'sand'].filter((w) => !STORED_WHY[w]);

// Only the fixed signs: a door's, a place's or a hub prop's glyph keeps its word out of that episode alone (`planInput`).
test("no live word's glyph is a fixed journey-map stop or the bed (item 178: SWORD's ⚔️ was the map's battle stop, QUILT's 🛏️ the bed)", async () => {
  const { THINGS } = await import('../../content/phonics/bank');
  const { ART_BY_ID } = await import('../../content/art/assets');
  // src/episode/plans.ts `journeyStops`: the fixed stops (a place's own glyph shows only in its episodes).
  const shown = new Set(['🌅', '🏠', '⚔️', '🏆', ART_BY_ID.prop_bed?.glyph]);
  for (const w of THINGS) if (w.word !== 'bed' && w.word !== 'hut') assert.ok(!w.glyph || !shown.has(w.glyph), `${w.word}'s ${w.glyph} is shown every episode`);
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
