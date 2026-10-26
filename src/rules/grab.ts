/**
 * The home warm-up (item 033): "Before we head out, let's take the ..." Pure:
 * no Phaser, unit-tested.
 *
 * After the quest's setup line she walks into the entry hall, where nine
 * pictured bank words stand, with no words on them (item 059). The narrator
 * asks for one and gives a phonics clue, never the word itself (amendment
 * 1549), at the word's own level on a ramp (GRAB in src/config.ts; `clue`):
 *
 *   1, 2. the sounds, unit by unit, the letters shown;
 *   3. the sounds, blank boxes.
 *
 * Never a letter's name (item 137, Matt: names and sounds together confused her).
 *
 * Right first time moves the word up a level, a miss on its first try moves
 * it down: recorded always, but the hall gives `helpLevel` of it (item 067:
 * level 1 at base, DIFFICULTY in src/config.ts). After GRAB.helpAfter misses the clue is the slow sound-out with
 * the letters shown, still never blended.
 *
 * The word is spoken once she has it (the confirmation), so it is kept out of the episode's
 * reading key words, the counter and the word machine (015's "said early"
 * rule: src/episode/plans.ts `housePlan` passes it into `saidBefore`), with the bank words heard inside
 * it as it plus a sound (`grabSays`, hunt 10, M57: CLOCK says LOCK). The other eight pictures are
 * drawn after the house plan and keep clear of every word she will read, so
 * the hall never shows one of them first. A grab is exposure, not a read:
 * ProgressStore `grabs`, never `words` or the word bag.
 */

import { BANK, BANK_BY_WORD, THINGS } from '../../content/phonics/bank';
import { heardAs } from '../../content/phonics/letters';
import { NO_BAG_COPY, lookalikesOf } from '../../content/phonics/sentences';
import { GRAB, RECENT_GRABS } from '../config';
import type { ProgressStore } from '../state/ProgressStore';
import { coverage, distractorsFor, isFirm, met } from './bank';
import { pickWeighted, shuffle, type Rand } from './random';
import { clampLevel, helpLevel, type HelpLevel } from './difficulty';
import { soundOut } from './soundOut';

export type GrabLevel = HelpLevel;

/**
 * Words the hall can ask for: the bank's short pictured words (each has a battle item), GRAB.maxUnits sound
 * units at most (item 067). Not MOM or DAD (NO_BAG_COPY, hunt 10, M45): the grab goes into her bag and is
 * fired in battle, and neither is ever a battle item.
 */
export const GRAB_WORDS: string[] = THINGS.filter((w) => w.units.length <= GRAB.maxUnits && !NO_BAG_COPY.has(w.word)).map((w) => w.word);

/** Every picture the hall can show, the asked-for word included: any pictured word (she does not read the others). */
const HALL_WORDS: string[] = THINGS.map((w) => w.word);

/**
 * What the hall says when it says `word` (hunt 10, M57 (a)): the word, and every bank word heard whole
 * inside it as the word plus one sound unit, before or after (CLOCK: LOCK; BRUSH: RUSH; TENT: TEN; BELT:
 * BELL; LEG: EGG; BLOCK: LOCK). The warm-up's word is spoken, so these count as said for the episode:
 * CLOCK in the hall, then LOCK on the bridge, gave LOCK away. A rule on sounds, not a list or letters:
 * KITE (K, long I, T, a silent E) holds no KIT, and a doubled letter is its single sound (BELL is B E L).
 */
export function grabSays(word: string): string[] {
  // C, K and CK are one sound (the bank keeps them apart as spellings).
  const heard = (w: string) => (BANK_BY_WORD[w]?.sounds ?? []).filter(Boolean).map(heardAs);
  const sounds = (w: string) => heard(w).join(' ');
  const own = heard(word);
  if (own.length < 3) return [word];
  const less = new Set([own.slice(1).join(' '), own.slice(0, -1).join(' ')]);
  return [word, ...BANK.filter((b) => b.word !== word && less.has(sounds(b.word))).map((b) => b.word)];
}

/** The level her grabs of a word have reached (the ramp, recorded for the grown-ups page). */
export function recordedGrabLevel(store: ProgressStore, word: string): GrabLevel {
  return clampLevel(store.grabLevel(word, GRAB.startLevel));
}

/** The level the hall gives a word now: GRAB.startLevel at base, else her recorded level up to DIFFICULTY (item 067). */
export function grabLevel(store: ProgressStore, word: string): GrabLevel {
  return helpLevel(recordedGrabLevel(store, word), GRAB.startLevel);
}

/**
 * The word to grab this episode: a short word (GRAB_WORDS), weighted toward
 * the shaky ones (she has missed, or never grabbed), times the bank's
 * coverage (src/rules/bank.ts: the vowels and first sounds she has met
 * least), never one in `avoid`, and none of her last RECENT_GRABS grabs while
 * another will do (across episodes: by when each was grabbed). Its shakiness
 * is her grabs', not her reads': a grab is exposure. Every level is in play
 * (item 067). Nor one that says a word in `avoid` (`grabSays`, hunt 10, M57:
 * no CLOCK when LOCK is on a move pad, drawn first).
 */
export function pickGrab(store: ProgressStore, avoid: Iterable<string> = [], rand: Rand = Math.random): string {
  const out = new Set(avoid);
  const pool = GRAB_WORDS.filter((w) => !grabSays(w).some((s) => out.has(s)));
  const all = pool.length ? pool : GRAB_WORDS;
  const recent = new Set(
    GRAB_WORDS.filter((w) => store.stat('grabs', w).last > 0)
      .sort((a, b) => store.stat('grabs', b).last - store.stat('grabs', a).last)
      .slice(0, RECENT_GRABS),
  );
  const fresh = all.filter((w) => !recent.has(w));
  const from = fresh.length ? fresh : all;
  const m = met(store);
  const weight = (w: string) => store.shakiness('grabs', w) * coverage(store, w, m);
  return pickWeighted(from, weight, 1, rand)[0]!;
}

/**
 * The hall's pictures, left to right and back to front: `word` and
 * `n - 1` others, none in `avoid` (every word the episode has her read) and
 * no look-alike of `word` (no MOP beside the MAP she is asked for). Chosen for
 * reading (`distractorsFor`): while the grab word is new none starts with its
 * first letter; once her grabs of it are firm, one shares its first sound or
 * rime (HAT among CAT's neighbours), so she reads past the first letter. If
 * that leaves too few, the look-alike rule gives way, then `avoid`. A picture
 * whose word holds a word of `avoid` plus a sound is avoided too (hunt 11, M57's
 * rule: a miss on the CLOCK says "CLOCK", and LOCK is read later).
 */
export function hallObjects(store: ProgressStore, word: string, avoid: Iterable<string> = [], rand: Rand = Math.random, n = GRAB.objects): string[] {
  const said = new Set(avoid);
  const out = [...said, ...HALL_WORDS.filter((w) => !said.has(w) && grabSays(w).some((s) => said.has(s)))];
  // Never the grab word plus a sound (hunt 11: TENT by TEN, CLOCK by LOCK: a miss there says the word she is
  // finding, and the clue's sounds fit both), at every tier.
  const plus = HALL_WORDS.filter((w) => w !== word && grabSays(w).includes(word));
  const like = lookalikesOf(word);
  const others = HALL_WORDS.filter((w) => w !== word);
  const tiers = [[...out, ...plus, ...like], [...out, ...plus], plus];
  const banned = tiers.find((t) => others.filter((w) => !t.includes(w)).length >= n - 1) ?? [];
  return shuffle([word, ...distractorsFor(store, word, others, n - 1, rand, banned, isFirm(store, word, 'grabs'))], rand);
}

/**
 * One part of a clue: a line, and which letters of the word it lights: from
 * `index`, `span` letters (2 for a digraph's sound). `show`: the step writes
 * its letters into the board's boxes (at levels 1-2 and in the help, never at
 * level 3, where the boxes stay blank).
 */
export interface ClueStep {
  /** The line to say; `` for a silent letter (item 056), which only lights. */
  id: string;
  index: number;
  span: number;
  show: boolean;
}

/**
 * The clue at a level (amendment 1549: a phonics task, never a listening
 * one, so no step ever says the word; its `word_` line is the confirmation
 * after she has it). Sound by sound unit (SH, I, P: the bank's `units` and
 * `spelled` sounds), one at a time and never blended, so a digraph is one
 * sound lighting both its letters. Only sounds, never a letter's name (item
 * 137: the names, and item 096's bridges from them, are gone):
 *
 *   1, 2. each unit's letters appearing on the board with its sound;
 *   3. the sounds over blank boxes.
 *
 * `help` (after GRAB.helpAfter misses, any level) is the sound-out with the
 * letters on the board, which the scene gives a longer beat per sound.
 */
export function clue(word: string, level: GrabLevel, help = false): ClueStep[] {
  const out: ClueStep[] = [];
  const show = help || level <= 2;
  // By sound unit (src/rules/soundOut.ts): a long-vowel word spells its sounds out (KEY is K, then long E on EY).
  // A silent letter (KITE's E, item 056) lights in its turn and says nothing: no line id.
  for (const s of soundOut(word)) if (s.id || s.sound === '') out.push({ id: s.id, index: s.index, span: s.span, show });
  return out;
}
