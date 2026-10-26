/**
 * The villains' named counter items (content/battle/types.ts `CounterItem.word`): which can
 * never come up in an episode, and why (item 153, Matt). The attic draws its counter word from
 * her word bag (src/rules/rooms.ts), so a named item shows only when its word can be drawn
 * there: a bank word in the bag (so not stored), and not a picture every episode
 * shows before any room (plans.ts `planInput`: a bank word whose glyph is a shown sign is
 * said before, item 039). Changing this list is changing which words are live: on purpose.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ROSTER } from '../../content/battle/roster';
import { BANK_BY_WORD } from '../../content/phonics/bank';
import { SPECIAL_WORDS } from '../../content/phonics/words';
import { journeyStops } from '../../src/episode/plans';
import { BAG_WORDS } from '../../src/rules/bank';

/** The journey map's stops every episode has (its house stop is the place's glyph away from home). */
const ALWAYS_SHOWN = new Set(journeyStops().filter((s) => s.kind !== 'house').map((s) => s.icon));

function neverDrawn(word: string): string | null {
  if (SPECIAL_WORDS.some((w) => w.word === word && !w.decodable)) return 'not decodable';
  const b = BANK_BY_WORD[word];
  if (!b) return 'not a bank word';
  if (b.stored) return `stored: ${b.stored}`;
  if (!BAG_WORDS.includes(word)) return 'not in her word bag';
  if (b.glyph && ALWAYS_SHOWN.has(b.glyph)) return `its ${b.glyph} is a journey-map stop, shown before any room`;
  return null;
}

test('named counter items (item 153; item 157: the map\'s bedroom stop is 🌅, not BED\'s 🛏️): only Rilla\'s MICE (not decodable) never comes up', () => {
  const never = ROSTER.flatMap((c) => {
    const why = neverDrawn(c.counter.word);
    return why ? [`${c.id}: ${c.counter.word.toUpperCase()} (${why})`] : [];
  });
  assert.deepEqual(never, ['rilla: MICE (not decodable)']);
});
