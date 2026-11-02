/**
 * What Ember Lark's letter arrows spell over her head (item 172). Pure, unit-tested
 * (tests/unit/arrowLetters.test.ts).
 *
 * A volley is one word she has already read this episode (`episode.fetched`), a box per
 * sound unit, so a digraph (SH) stays together as it does in every hint. Nothing she has
 * yet to read: a word on a pad still to come is skipped (`givesAway`, as banners and
 * shouts are held to it), and the counter word is never in `fetched`. With no such word
 * (a `?scene=` jump straight to a battle) she spells a part of her own name.
 *
 * The letters are silent: a fight has no room for a word's sounds one by one, and a
 * letter's name is never said. Upper-cased here, like all text at display time.
 */

import { BANK_BY_WORD } from '../../content/phonics/bank';

/** A longer word's row would stretch wider than she is by far, with too many arrows: left out. */
export const MAX_ARROW_LETTERS = 5;

/** Her name's second word, for a battle with no word read yet. */
const NO_WORD = ['L', 'A', 'R', 'K'];

/** The boxes of `shot`'s volley: the fetched words in turn, over and over. */
export function arrowLetters(fetched: readonly string[], shot: number, givesAway: (word: string) => boolean = () => false): string[] {
  const usable = [...new Set(fetched)].filter((w) => {
    const units = BANK_BY_WORD[w]?.units;
    return units && units.length <= MAX_ARROW_LETTERS && !givesAway(w);
  });
  if (!usable.length) return NO_WORD;
  return BANK_BY_WORD[usable[shot % usable.length]!]!.units.map((u) => u.toUpperCase());
}
