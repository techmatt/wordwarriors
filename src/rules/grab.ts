/**
 * The home warm-up (item 033): "Before we head out, let's grab the ..." Pure:
 * no Phaser, unit-tested.
 *
 * After the quest's setup line she walks into the entry hall, where nine
 * pictured bank words stand, each with its word printed on it. The narrator
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

import { BANK_BY_WORD, THINGS, unitsOf } from '../../content/phonics/bank';
import { lookalikesOf } from '../../content/phonics/sentences';
import { SOUND_BY_UNIT } from '../../content/phonics/letters';
import { letterNameLine, letterSoundLine, wordLine } from '../../content/voice/ids';
import { GRAB } from '../config';
import { pickWeighted, type ProgressStore } from '../state/ProgressStore';
import { coverage, distractorsFor, gates, isFirm, met, openIn, shuffle, type Rand } from './bank';

export type GrabLevel = 1 | 2 | 3;

/** Words the hall can ask for: the bank's pictured words (each has a battle item). */
export const GRAB_WORDS: string[] = THINGS.map((w) => w.word);

/** Every picture the hall can show, the asked-for word included. */
const HALL_WORDS: string[] = GRAB_WORDS;

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
 * missed, or never grabbed), times the bank's coverage and level gate
 * (src/rules/bank.ts: the vowels and first sounds she has met least, blends
 * once CVC is firm), never one in `avoid`, and not last episode's grab (the
 * most recently grabbed word) while another will do. Its shakiness is her
 * grabs', not her reads': a grab is exposure.
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
  const from = fresh.length ? fresh : all;
  const m = met(store);
  const g = gates(store);
  // A word whose level is still shut comes up only when nothing else can (as `drawWords`).
  const open = from.filter(openIn(g));
  const weight = (w: string) => store.shakiness('grabs', w) * coverage(store, w, m) * (g[BANK_BY_WORD[w]?.level ?? 1] ?? 1);
  return pickWeighted(open.length ? open : from, weight, 1, rand)[0]!;
}

/**
 * The hall's pictures, left to right and back to front: `word` and
 * `n - 1` others, none in `avoid` (every word the episode has her read) and
 * no look-alike of `word` (no MOP beside the MAP she is asked for). Chosen for
 * reading (`distractorsFor`): while the grab word is new none starts with its
 * first letter; once her grabs of it are firm, one shares its first sound or
 * rime (HAT among CAT's neighbours), so she reads past the first letter. If
 * that leaves too few, the look-alike rule gives way, then `avoid`.
 */
export function hallObjects(store: ProgressStore, word: string, avoid: Iterable<string> = [], rand: Rand = Math.random, n = GRAB.objects): string[] {
  const out = [...avoid];
  const like = lookalikesOf(word);
  const others = HALL_WORDS.filter((w) => w !== word);
  const tiers = [[...out, ...like], out, []];
  const banned = tiers.find((t) => others.filter((w) => !t.includes(w)).length >= n - 1) ?? [];
  return shuffle([word, ...distractorsFor(store, word, others, n - 1, rand, banned, isFirm(store, word, 'grabs'))], rand);
}

/**
 * One part of a clue: a line, and which letters of the word it lights: from
 * `index` (null for the word itself), `span` letters (2 for a digraph's sound).
 */
export interface ClueStep {
  id: string;
  kind: 'word' | 'name' | 'sound';
  index: number | null;
  span: number;
}

/**
 * The clue at a level: the word first (level 1, or `help` after enough
 * misses), then its letter names (levels 1 and 2), then its sounds, one at a
 * time and never blended. Names go letter by letter (S, H, I, P: names are
 * what she knows); sounds go by sound unit (SH, I, P: `unitsOf`), so a
 * digraph is one sound lighting both its letters.
 */
export function clue(word: string, level: GrabLevel, help = false): ClueStep[] {
  const letters = [...word];
  const out: ClueStep[] = [];
  if (level === 1 || help) out.push({ id: wordLine(word), kind: 'word', index: null, span: 0 });
  if (level <= 2) letters.forEach((ch, index) => out.push({ id: letterNameLine(ch), kind: 'name', index, span: 1 }));
  let index = 0;
  // A long-vowel word spells its sounds out (KEY is K, then long E on EY: content/phonics/bank.ts).
  const b = BANK_BY_WORD[word];
  const units = b?.units ?? unitsOf(word);
  units.forEach((unit, i) => {
    const sound = b?.sounds[i] ?? unit;
    if (SOUND_BY_UNIT[sound]) out.push({ id: letterSoundLine(sound), kind: 'sound', index, span: unit.length });
    index += unit.length;
  });
  return out;
}
