/**
 * The listen-through page's words (item 161, Matt: "a set of words that cover
 * the possible sounds, to verify everything sounds good and matches the
 * phonics; a small bit of repetition is fine, especially for difficult ones").
 *
 * A short set of live bank words that together sound out every sound a live
 * word sounds out: `FIRST` (the words of Matt's newest takes), then picked
 * greedily (most new sounds first, then fewest units), then topped up so each
 * of the `HARD` sounds is heard in `HARD_TIMES` words. Each is played as the
 * game sounds it out (`soundOut`, a sound a unit) and then said whole. Sounds
 * with a line but in no live word (Q, voiced TH, long U, X's name) are listed
 * alone. Pure, so `tests/unit/listen.test.ts` checks the cover.
 */

import { LIVE, type BankWord } from '../../content/phonics/bank';
import { SOUND_BY_UNIT } from '../../content/phonics/letters';
import { soundOut, type SoundStep } from '../rules/soundOut';

/**
 * The sounds worth hearing more than once: Matt's item 161 takes (A, F, long
 * OO, the schwa, OW; A was edge-tts's carrier cut until then) and the ones a
 * placeholder voice gets wrong most easily (the digraphs, X).
 */
export const HARD = ['a', 'f', 'long_oo', 'schwa', 'ow', 'th', 'ng', 'x'];
export const HARD_TIMES = 2;
/** Item 161's recorder cards' words, heard first: the newest takes, each word and its sound. */
export const FIRST = ['cat', 'fan', 'zoo', 'zebra', 'cow'];

export interface ListenWord {
  word: string;
  glyph?: string;
  steps: SoundStep[];
}

/** Every sound a live word sounds out, in SOUND_BY_UNIT's order. */
export function liveSoundKeys(words: BankWord[] = LIVE): string[] {
  const used = new Set(words.flatMap((w) => w.sounds).filter(Boolean));
  return Object.keys(SOUND_BY_UNIT).filter((s) => used.has(s));
}

/** Sounds with a line that no live word sounds out: heard alone. */
export function loneSoundKeys(words: BankWord[] = LIVE): string[] {
  const live = new Set(liveSoundKeys(words));
  return Object.keys(SOUND_BY_UNIT).filter((s) => !live.has(s));
}

const soundsOf = (w: BankWord) => new Set(w.sounds.filter(Boolean));

/** The set, in the order picked: the cover first, then the hard sounds' extra words. */
export function listenWords(words: BankWord[] = LIVE): ListenWord[] {
  const pool = [...words].sort((a, b) => a.units.length - b.units.length || a.word.localeCompare(b.word));
  const left = new Set(liveSoundKeys(words));
  const picked: BankWord[] = FIRST.flatMap((f) => pool.filter((w) => w.word === f));
  for (const w of picked) for (const s of soundsOf(w)) left.delete(s);
  while (left.size) {
    let best: BankWord | undefined;
    let gain = 0;
    for (const w of pool) {
      if (picked.includes(w)) continue;
      const g = [...soundsOf(w)].filter((s) => left.has(s)).length;
      if (g > gain) [best, gain] = [w, g];
    }
    if (!best) break;
    picked.push(best);
    for (const s of soundsOf(best)) left.delete(s);
  }
  for (const s of HARD) {
    const times = () => picked.filter((w) => soundsOf(w).has(s)).length;
    for (const w of pool) {
      if (times() >= HARD_TIMES) break;
      if (!picked.includes(w) && soundsOf(w).has(s)) picked.push(w);
    }
  }
  return picked.map((w) => ({ word: w.word, ...(w.glyph ? { glyph: w.glyph } : {}), steps: soundOut(w.word) }));
}
