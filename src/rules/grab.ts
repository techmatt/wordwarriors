/**
 * The home warm-up (item 033): "Before we head out, let's grab the ..." Pure:
 * no Phaser, unit-tested.
 *
 * After the quest's setup line she walks into the entry hall, where nine
 * pictured CVC words stand, each with its word printed on it. The narrator
 * asks for one and gives a clue that links letter names to letter sounds to
 * the word, at the word's own level on a ramp (GRAB in src/config.ts):
 *
 *   1. the word, its letter names, its letter sounds;
 *   2. names and sounds, no word;
 *   3. sounds only.
 *
 * Right first time moves the word up a level, a miss on its first try moves
 * it down. After GRAB.helpAfter misses the clue adds the whole word.
 *
 * The word is spoken during the episode, so it is kept out of the episode's
 * reading key words, the counter and the word machine (015's "said early"
 * rule: Episode.ts passes it into `saidBefore`). The other eight labels are
 * drawn after the house plan and keep clear of every word she will read, so
 * the hall never shows one of them first. A grab is exposure, not a read:
 * ProgressStore `grabs`, never `words` or the word bag.
 */

import { lookalikesOf } from '../../content/phonics/sentences';
import { CVC_WORDS } from '../../content/phonics/words';
import { LETTER_BY_CHAR } from '../../content/phonics/letters';
import { letterNameLine, letterSoundLine, wordLine } from '../../content/voice/ids';
import { GRAB } from '../config';
import { pickWeighted, type ProgressStore } from '../state/ProgressStore';

export type Rand = () => number;
export type GrabLevel = 1 | 2 | 3;

/** Words the hall can ask for: the pictured, decodable CVC words (each has a battle item). */
export const GRAB_WORDS: string[] = CVC_WORDS.filter((w) => w.decodable).map((w) => w.word);

/** Every picture the hall can show, the asked-for word included. */
const HALL_WORDS: string[] = CVC_WORDS.map((w) => w.word);

/** A word's level now. */
export function grabLevel(store: ProgressStore, word: string): GrabLevel {
  const l = store.grabLevel(word, GRAB.startLevel);
  return (l <= 1 ? 1 : l >= 3 ? 3 : 2) as GrabLevel;
}

/** The ramp: right first time is one level harder, a first-try miss one easier. */
export function nextLevel(level: GrabLevel, firstTry: boolean): GrabLevel {
  return Math.max(1, Math.min(3, level + (firstTry ? 1 : -1))) as GrabLevel;
}

/**
 * The word to grab this episode: weighted toward the shaky ones (she has
 * missed, or never grabbed), never one in `avoid`, and not last episode's
 * grab (the most recently grabbed word) while another will do.
 */
export function pickGrab(store: ProgressStore, avoid: Iterable<string> = [], rand: Rand = Math.random): string {
  const out = new Set(avoid);
  const pool = GRAB_WORDS.filter((w) => !out.has(w));
  const all = pool.length ? pool : GRAB_WORDS;
  let last: string | null = null;
  let lastAt = 0;
  for (const w of all) {
    const at = store.stat('grabs', w).last;
    if (at > lastAt) [last, lastAt] = [w, at];
  }
  const fresh = all.filter((w) => w !== last);
  return pickWeighted(fresh.length ? fresh : all, (w) => store.shakiness('grabs', w), 1, rand)[0]!;
}

/**
 * The hall's pictures, left to right and back to front: `word` and
 * `n - 1` others, none in `avoid` (every word the episode has her read) and
 * no look-alike of `word` (no MOP beside the MAP she is asked for). If that
 * leaves too few, the look-alike rule gives way, then `avoid`.
 */
export function hallObjects(word: string, avoid: Iterable<string> = [], rand: Rand = Math.random, n = GRAB.objects): string[] {
  const out = new Set(avoid);
  const like = new Set(lookalikesOf(word));
  const others = HALL_WORDS.filter((w) => w !== word);
  const tiers = [others.filter((w) => !out.has(w) && !like.has(w)), others.filter((w) => !out.has(w)), others];
  const pool = tiers.find((t) => t.length >= n - 1) ?? others;
  const all = [word, ...pickWeighted(pool, () => 1, n - 1, rand)];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all;
}

/** One part of a clue: a line, and which letter of the word it lights (null for the word itself). */
export interface ClueStep {
  id: string;
  kind: 'word' | 'name' | 'sound';
  index: number | null;
}

/**
 * The clue at a level: the word first (level 1, or `help` after enough
 * misses), then its letter names (levels 1 and 2), then its letter sounds,
 * one at a time and never blended.
 */
export function clue(word: string, level: GrabLevel, help = false): ClueStep[] {
  const letters = [...word];
  const out: ClueStep[] = [];
  if (level === 1 || help) out.push({ id: wordLine(word), kind: 'word', index: null });
  if (level <= 2) letters.forEach((ch, index) => out.push({ id: letterNameLine(ch), kind: 'name', index }));
  letters.forEach((ch, index) => {
    if (LETTER_BY_CHAR[ch]) out.push({ id: letterSoundLine(ch), kind: 'sound', index });
  });
  return out;
}
