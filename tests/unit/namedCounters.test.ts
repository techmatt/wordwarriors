/**
 * The villains' named counter items (content/battle/types.ts `CounterItem.word`): which can
 * never come up in an episode, and why (item 153, Matt). The attic draws its counter word from
 * her word bag (src/rules/rooms.ts), so a named item shows only when its word can be drawn
 * there: a bank word in the bag (so not stored), and not her bed (plans.ts `planInput`'s
 * `notKeys`; a sign's glyph no longer counts, item 191). Changing this list is changing
 * which words are live: on purpose.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ART_BY_ID } from '../../content/art/assets';
import { ROSTER } from '../../content/battle/roster';
import { BANK_BY_WORD } from '../../content/phonics/bank';
import { SPECIAL_WORDS } from '../../content/phonics/words';
import { BAG_WORDS } from '../../src/rules/bank';

/**
 * The bed she wakes in and presses green on (hunt 12). Not the journey map's stops or a door's sign:
 * a glyph shown on screen never keeps its word out of play (item 191, Matt 2026-11-17).
 */
const ALWAYS_SHOWN = new Set([ART_BY_ID.prop_bed!.glyph!]);

function neverDrawn(word: string): string | null {
  if (SPECIAL_WORDS.some((w) => w.word === word && !w.decodable)) return 'not decodable';
  const b = BANK_BY_WORD[word];
  if (!b) return 'not a bank word';
  if (b.stored) return `stored: ${b.stored}`;
  if (!BAG_WORDS.includes(word)) return 'not in her word bag';
  if (b.glyph && ALWAYS_SHOWN.has(b.glyph)) return `its ${b.glyph} is her bed`;
  return null;
}

test('named counter items (item 153; item 157: the map\'s bedroom stop is 🌅; hunt 12: her bed in the bedroom shows BED): Rilla\'s MICE (not decodable) and Evil Julia\'s Cozy Bed never come up', () => {
  const never = ROSTER.flatMap((c) => {
    const why = neverDrawn(c.counter.word);
    return why ? [`${c.id}: ${c.counter.word.toUpperCase()} (${why})`] : [];
  });
  assert.deepEqual(never, ['julia: BED (its 🛏️ is her bed)', 'rilla: MICE (not decodable)']);
});
