/**
 * The home warm-up (item 033): "Before we head out, let's grab the ..." Pure:
 * no Phaser, unit-tested.
 *
 * After the quest's setup line she walks into the entry hall, where nine
 * pictured bank words stand, with no words on them (item 059). The narrator
 * asks for one and gives a phonics clue, never the word itself (amendment
 * 1549), at the word's own level on a ramp (GRAB in src/config.ts; `clue`):
 *
 *   1. letter names and sounds, unit by unit;
 *   2. sounds only, the letters shown;
 *   3. sounds only, blank boxes.
 *
 * Right first time moves the word up a level, a miss on its first try moves
 * it down: recorded always, but the hall gives `helpLevel` of it (item 067:
 * level 1 at base, DIFFICULTY in src/config.ts). After GRAB.helpAfter misses the clue is the slow sound-out with
 * the letters shown, still never blended.
 *
 * The word is spoken once she has it (the confirmation), so it is kept out of the episode's
 * reading key words, the counter and the word machine (015's "said early"
 * rule: Episode.ts passes it into `saidBefore`). The other eight labels are
 * drawn after the house plan and keep clear of every word she will read, so
 * the hall never shows one of them first. A grab is exposure, not a read:
 * ProgressStore `grabs`, never `words` or the word bag.
 */

import { BANK_BY_WORD, THINGS, unitsOf } from '../../content/phonics/bank';
import { lookalikesOf } from '../../content/phonics/sentences';
import { SOUND_BY_UNIT } from '../../content/phonics/letters';
import { letterNameLine, letterSoundLine } from '../../content/voice/ids';
import { GRAB } from '../config';
import { pickWeighted, type ProgressStore } from '../state/ProgressStore';
import { coverage, distractorsFor, isFirm, met, shuffle, type Rand } from './bank';
import { clampLevel, helpLevel, stepLevel, type HelpLevel } from './difficulty';

export type GrabLevel = HelpLevel;

/** Words the hall can ask for: the bank's short pictured words (each has a battle item), GRAB.maxUnits sound units at most (item 067). */
export const GRAB_WORDS: string[] = THINGS.filter((w) => w.units.length <= GRAB.maxUnits).map((w) => w.word);

/** Every picture the hall can show, the asked-for word included: any pictured word (she does not read the others). */
const HALL_WORDS: string[] = THINGS.map((w) => w.word);

/** The level her grabs of a word have reached (the ramp, recorded for the grown-ups page). */
export function recordedGrabLevel(store: ProgressStore, word: string): GrabLevel {
  return clampLevel(store.grabLevel(word, GRAB.startLevel));
}

/** The level the hall gives a word now: GRAB.startLevel at base, else her recorded level up to DIFFICULTY (item 067). */
export function grabLevel(store: ProgressStore, word: string): GrabLevel {
  return helpLevel(recordedGrabLevel(store, word), GRAB.startLevel);
}

/** How many of her latest grabs the next pick keeps clear of, while another word will do (item 067; was 1). */
export const RECENT_GRABS = 3;

/** The ramp: right first time is one level harder, a first-try miss one easier. */
export function nextLevel(level: GrabLevel, firstTry: boolean): GrabLevel {
  return stepLevel(level, firstTry);
}

/**
 * The word to grab this episode: a short word (GRAB_WORDS), weighted toward
 * the shaky ones (she has missed, or never grabbed), times the bank's
 * coverage (src/rules/bank.ts: the vowels and first sounds she has met
 * least), never one in `avoid`, and none of her last RECENT_GRABS grabs while
 * another will do (across episodes: by when each was grabbed). Its shakiness
 * is her grabs', not her reads': a grab is exposure. Every level is in play
 * (item 067).
 */
export function pickGrab(store: ProgressStore, avoid: Iterable<string> = [], rand: Rand = Math.random): string {
  const out = new Set(avoid);
  const pool = GRAB_WORDS.filter((w) => !out.has(w));
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
 * `index`, `span` letters (2 for a digraph's sound). `show`: the step writes
 * its letters into the board's boxes (a name always; a sound at levels 1-2
 * and in the help, never at level 3, where the boxes stay blank).
 */
export interface ClueStep {
  /** The line to say; `` for a silent letter (item 056), which only lights. */
  id: string;
  kind: 'name' | 'sound';
  index: number;
  span: number;
  show: boolean;
}

/**
 * The clue at a level (amendment 1549: a phonics task, never a listening
 * one, so no step ever says the word; its `word_` line is the confirmation
 * after she has it). Sound by sound unit (SH, I, P: the bank's `units` and
 * `spelled` sounds), one at a time and never blended, so a digraph is one
 * sound lighting both its letters:
 *
 *   1. each unit's letter names, then its sound (S, H, "sh"; I, "i"; P, "p");
 *   2. the sounds alone, each unit's letters appearing on the board with it;
 *   3. the sounds alone over blank boxes.
 *
 * `help` (after GRAB.helpAfter misses, any level) is the sound-out alone,
 * the letters on the board, which the scene gives a longer beat per sound.
 */
export function clue(word: string, level: GrabLevel, help = false): ClueStep[] {
  const out: ClueStep[] = [];
  let index = 0;
  // A long-vowel word spells its sounds out (KEY is K, then long E on EY: content/phonics/bank.ts).
  const b = BANK_BY_WORD[word];
  const units = b?.units ?? unitsOf(word);
  units.forEach((unit, i) => {
    if (level === 1 && !help) [...unit].forEach((ch, j) => out.push({ id: letterNameLine(ch), kind: 'name', index: index + j, span: 1, show: true }));
    const sound = b?.sounds[i] ?? unit;
    const show = help || level <= 2;
    if (SOUND_BY_UNIT[sound]) out.push({ id: letterSoundLine(sound), kind: 'sound', index, span: unit.length, show });
    // A silent letter (KITE's E, item 056) lights in its turn and says nothing: no line id.
    else if (sound === '') out.push({ id: '', kind: 'sound', index, span: unit.length, show });
    index += unit.length;
  });
  return out;
}
