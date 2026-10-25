/**
 * The rhyme room (item 139, designed with Matt): two rhyming words of one
 * family are shown and said, each with its picture and its printed word (BUG,
 * HUG); the third word of the family is printed at the top, not said (RUG).
 * Three unlabeled pictures stand in the room; she walks to the one the
 * printed word names. She gets there by reading it, or by hearing the rhyme.
 * Pure: no Phaser, unit-tested (tests/unit/rhyme.test.ts).
 *
 * The wrong pictures cannot be guessed from the start of the word: one shares
 * the target's first sound (ROCK for RUG), one its vowel (SUN), and neither
 * rhymes with it, so only the end of the word (or the rhyme) gets it.
 *
 * Words: a family is a rime of the bank's short-vowel words with a one-letter
 * onset and three sound units (CAT, SOCK, KING: a digraph is one unit). The
 * printed word and the wrong pictures are pictured things only (`THINGS`: an
 * action word is never a picture she picks, item 137). The two shown words are
 * things where the family has them, else pictured action words (HUG, RUN, HOP:
 * shown and said, never picked; Matt's default, item 139). The bank in item
 * 139 makes these families: -AT -AN -OCK -ING (things only), and -UG -UN -OP
 * -IG -OT -AP with an action word shown; -OG and -ED have too few words.
 *
 * About three rounds a visit (RHYME.rounds), each from a different family; the
 * printed words come out of her word bag (a word in the bag left is likelier,
 * as the bridge draws), by the bank's weight, and keep clear of the words the
 * episode before had her read (`LAST_READ`) where the pool allows.
 *
 * Each word has a help level on a ramp, like the bridge's: 1 the helper
 * sounds the printed word out unasked; 2 and 3 only on yellow. Right first
 * time with no help moves it up a level; a hint or a miss, down one. The room
 * gives `rhymeLevel`: level 1 at base (item 067, DIFFICULTY in src/config.ts).
 */

import { BANK, BANK_BY_WORD, LIVE, THINGS, type BankWord } from '../../content/phonics/bank';
import { rimeOf } from '../../content/phonics/families';
import { lookalikesOf } from '../../content/phonics/sentences';
import { RHYME } from '../config';
import type { ProgressStore } from '../state/ProgressStore';
import { drawWords } from './bank';
import { clampLevel, helpLevel, type HelpLevel } from './difficulty';
import { shuffle, type Rand } from './random';
import { lastRead } from './recent';

export type RhymeLevel = HelpLevel;

export interface RhymeRound {
  /** The family: `ug`. */
  rime: string;
  /** The two rhyming words shown and said, in their order left to right. */
  shown: [string, string];
  /** The printed word she reads: a battle item. */
  word: string;
  /** The pictures standing in the room, `word` among them, left to right. */
  options: string[];
}

export interface RhymePlan {
  rounds: RhymeRound[];
}

export interface RhymeFamily {
  rime: string;
  /** Its pictured things: what can be printed (and shown). */
  things: string[];
  /** Its pictured action words: shown only, after the things. */
  actions: string[];
}

/** A family word: one short vowel, a one-letter onset, three sound units (CAT, SOCK, KING; not FROG, BELL's doubled L is one unit too). */
const familyWord = (w: BankWord): boolean => w.onset.length === 1 && w.vowel !== null && w.units.length === 3 && !w.odd;

const LIVE_SET = new Set(LIVE);
const THING_SET = new Set(THINGS);

/** Every family the bank makes: three words or more, one a thing at least, in rime order. */
export const RHYME_FAMILIES: RhymeFamily[] = [...new Set(BANK.filter((w) => familyWord(w) && LIVE_SET.has(w)).map((w) => w.rime))]
  .sort()
  .map((rime) => {
    const ws = BANK.filter((w) => w.rime === rime && familyWord(w) && LIVE_SET.has(w));
    return { rime, things: ws.filter((w) => THING_SET.has(w)).map((w) => w.word), actions: ws.filter((w) => !THING_SET.has(w)).map((w) => w.word) };
  })
  .filter((f) => f.things.length >= 1 && f.things.length + f.actions.length >= 3);

const RHYME_FAMILY_BY_RIME: Record<string, RhymeFamily> = Object.fromEntries(RHYME_FAMILIES.map((f) => [f.rime, f]));

/** Every word the room can print: its families' things. */
export const RHYME_WORDS: string[] = RHYME_FAMILIES.flatMap((f) => f.things);

/** A word's first sound, C and K as one (CAT and KING start alike). */
export function firstSound(word: string): string {
  const s = BANK_BY_WORD[word]?.sounds[0] ?? word[0]!;
  return s === 'c' ? 'k' : s;
}

/** Do two words rhyme (the same rime: `rimeOf`, the bank's, so FROG's OG rhymes with DOG)? */
export const rhymes = (a: string, b: string): boolean => rimeOf(a) === rimeOf(b);

/**
 * Do two words nearly rhyme to her ear (hunt 11): the same vowel, and endings alike once M, N, NG and MB
 * count as one nasal, or one ending the other plus a sound. VAN, CAN... HAM (or ANT); SUN, RUN... THUMB;
 * KING, RING... PIN. A rhyme room's wrong picture is neither.
 */
export function nearRhyme(a: string, b: string): boolean {
  const ra = rimeOf(a);
  const rb = rimeOf(b);
  if (ra[0] !== rb[0]) return false;
  // By sound, not spelling: CK, C and K are one sound, X is K and S (SOCK, ROCK... BOX).
  const coda = (r: string) => r.replace(/^[aeiou]+/, '').replace(/ck|c|k/g, 'k').replace(/x/g, 'ks').replace(/^(ng|mb|n|m)/, 'N');
  const ca = coda(ra);
  const cb = coda(rb);
  return ca === cb || (ca.length > 0 && cb.length > 0 && (ca.startsWith(cb) || cb.startsWith(ca)));
}

/**
 * A near rhyme by a nasal before the ending (hunt 11, M71): the same vowel, and one word's ending is the
 * other's with an M or N before it. CAT, HAT... ANT (or PLANT); CUP... STUMP; DUCK... SKUNK. The rhyme
 * room's vowel picture leans off these (`wrongPictures`), a lean and not a rule: ruled out, fewer families
 * could be planned and the room came up less (38 visits in 300 episodes fell to 26).
 */
export function nasalNear(a: string, b: string): boolean {
  const ra = rimeOf(a);
  const rb = rimeOf(b);
  if (ra[0] !== rb[0]) return false;
  const coda = (r: string) => r.replace(/^[aeiou]+/, '').replace(/ck|c|k/g, 'k').replace(/x/g, 'ks');
  const ca = coda(ra);
  const cb = coda(rb);
  const plus = (x: string, y: string) => y.length > 0 && /^[mn]/.test(x) && x.slice(1) === y;
  return plus(ca, cb) || plus(cb, ca);
}

/**
 * The wrong pictures for `word`: one thing sharing its first sound, one
 * sharing its vowel and not its first sound; neither rhyming or nearly rhyming
 * with it, neither a look-alike of it or of the round's two cards (`shown`,
 * hunt 11: DAD beside the MAN card, a leg in a striped sock beside SOCK, read
 * as rhymes), neither in `avoid`. The vowel picture is a short word where it
 * can be (a three-unit word, as the target is), and no nasal near rhyme
 * (`nasalNear`: ANT for CAT) where another is free. Null when the bank has no
 * such pair.
 */
export function wrongPictures(word: string, avoid: Iterable<string>, rand?: Rand, shown: readonly string[] = []): [string, string] | null {
  const skip = new Set([word, ...avoid, ...lookalikesOf(word), ...shown.flatMap((s) => lookalikesOf(s))]);
  const w = BANK_BY_WORD[word];
  if (!w?.vowel) return null;
  const pick = (ws: BankWord[]) => (rand ? shuffle(ws, rand) : ws);
  const free = THINGS.filter((t) => !skip.has(t.word) && !rhymes(t.word, word) && !nearRhyme(t.word, word));
  // Short words first: a long one stands out from the three-unit target by its length alone.
  const short = (ws: BankWord[]) => [...pick(ws.filter((t) => t.units.length <= 3)), ...pick(ws.filter((t) => t.units.length > 3))];
  const onset = short(free.filter((t) => firstSound(t.word) === firstSound(word)));
  const vowelFor = (a: BankWord) => short(free.filter((t) => t.vowel === w.vowel && firstSound(t.word) !== firstSound(word) && t.word !== a.word && !lookalikesOf(a.word).includes(t.word)));
  const pairs = onset.map((a) => [a, vowelFor(a)] as const);
  // Hunt 11, M71 (c): the vowel picture no nasal near rhyme (CAT, HAT... ANT, PLANT) where another is free;
  // a lean, not a rule, so no round is lost to it.
  for (const [a, vowel] of pairs) {
    const clear = vowel.find((t) => !nasalNear(t.word, word));
    if (clear) return [a.word, clear.word];
  }
  for (const [a, vowel] of pairs) if (vowel.length) return [a.word, vowel[0]!.word];
  return null;
}

/** The two shown words for `word` in its family: things first, then action words, none in `avoid`. Null with fewer than two. */
export function shownFor(word: string, avoid: Iterable<string>, rand?: Rand): [string, string] | null {
  const f = RHYME_FAMILY_BY_RIME[rimeOf(word)];
  if (!f) return null;
  const skip = new Set([word, ...avoid, ...lookalikesOf(word)]);
  const pick = (ws: string[]) => (rand ? shuffle(ws, rand) : ws);
  const ws = [...pick(f.things.filter((w) => !skip.has(w))), ...pick(f.actions.filter((w) => !skip.has(w)))];
  return ws.length >= 2 ? [ws[0]!, ws[1]!] : null;
}

export interface RhymeInput {
  /** Words the episode says or shows first, its move pads and its gift: never a word or picture here. */
  avoid: string[];
  /** Words other rooms have planned already. */
  taken: string[];
}

/** The rhyme room's last visit's families, as the store keeps them (hunt 11: a rotation of its own). */
export const LAST_RHYMES = 'last_rhyme_rimes';
const lastRhymes = (store: ProgressStore): Set<string> => new Set((store.recentOf(LAST_RHYMES).at(-1) ?? '').split(' ').filter(Boolean));

/** A word's ease in the visit's order: a plain CVC word (CAT) before a digraph-ended one (SOCK, KING). */
const ease = (word: string): number => BANK_BY_WORD[word]?.level ?? 1;

/**
 * A visit's rounds: RHYME.rounds (fewer where the episode leaves too few
 * families free, RHYME.minRounds at least; null when not even that), each
 * from a different family. No word or picture twice in a visit, and none of
 * the episode's (`avoid`, `taken`). The printed words are drawn by the bank's
 * weight, a word still in her bag twice as likely (as the bridge's), first
 * from those the episode before did not have her read. A draw that leaves no
 * family free for its last round is drawn again (item 155: about one visit in
 * eleven had two rounds where three fitted), up to RHYME.redraws times.
 */
export function planRhyme(store: ProgressStore, input: RhymeInput, rand: Rand = Math.random, n = RHYME.rounds): RhymePlan | null {
  let best: RhymeRound[] = [];
  for (let t = 0; t <= RHYME.redraws && best.length < n; t++) {
    const rounds = drawRhymeRounds(store, input, rand, n);
    if (rounds.length > best.length) best = rounds;
  }
  if (best.length < Math.min(n, RHYME.minRounds)) return null;
  return { rounds: best.map((r, i) => ({ r, i })).sort((a, b) => ease(a.r.word) - ease(b.r.word) || a.i - b.i).map((x) => x.r) };
}

/** One greedy draw of up to `n` rounds (planRhyme's), each from a family new to the visit. */
function drawRhymeRounds(store: ProgressStore, input: RhymeInput, rand: Rand, n: number): RhymeRound[] {
  const avoid = new Set([...input.avoid, ...input.taken]);
  const before = lastRead(store);
  const lastFamilies = lastRhymes(store);
  const inBag = new Set(store.bag().left);
  const boost = (w: string) => (inBag.has(w) ? 2 : 1);
  const rounds: RhymeRound[] = [];
  const used = () => rounds.flatMap((r) => [r.word, ...r.shown, ...r.options]);
  for (let k = 0; k < n; k++) {
    const busy = new Set([...avoid, ...used()]);
    const families = new Set(rounds.map((r) => r.rime));
    // A word whose round can be made now: its family new to the visit, two shown words and two wrong pictures free.
    const open = RHYME_WORDS.filter((w) => {
      if (busy.has(w) || families.has(rimeOf(w))) return false;
      const s = shownFor(w, busy);
      return Boolean(s && wrongPictures(w, [...busy, ...s], undefined, s));
    });
    // First from the families the last visit did not show (hunt 11: VAN CAN [FAN] came back as CAN FAN [VAN] the
    // next episode, last time's answer now a card), and from words the episode before did not have her read.
    const newFamily = open.filter((w) => !lastFamilies.has(rimeOf(w)));
    const wide = newFamily.length ? newFamily : open;
    const fresh = wide.filter((w) => !before.has(w));
    const pool = fresh.length ? fresh : wide;
    if (!pool.length) break;
    const word = drawWords(store, pool, 1, rand, boost)[0]!;
    // The drawn pair of cards, or (if their look-alikes leave no wrong pictures) the pair `open` checked.
    let shown = shownFor(word, busy, rand)!;
    let wrong = wrongPictures(word, [...busy, ...shown], rand, shown);
    if (!wrong) {
      shown = shownFor(word, busy)!;
      wrong = wrongPictures(word, [...busy, ...shown], rand, shown)!;
    }
    rounds.push({ rime: rimeOf(word), shown, word, options: shuffle([word, ...wrong], rand) });
  }
  return rounds;
}

/** Every word a visit reads, in order: its battle items, the last its key. */
export const rhymeWords = (p: RhymePlan): string[] => p.rounds.map((r) => r.word);

/** Every picture a visit shows: the shown words' and the standing pictures. */
export const rhymeShown = (p: RhymePlan): string[] => [...new Set(p.rounds.flatMap((r) => [...r.shown, ...r.options]))];

/** Every word a visit says before she has read it: the shown words (the printed one is said only once she has it, or on a miss). */
export const rhymeSays = (p: RhymePlan): string[] => p.rounds.flatMap((r) => r.shown);

/** The help level her reads of a word here have reached (the ramp; recorded, and shown on the grown-ups page). */
export function recordedRhymeLevel(store: ProgressStore, word: string): RhymeLevel {
  return clampLevel(store.rhymeLevel(word, RHYME.startLevel));
}

/** The help level the room gives a word now: RHYME.startLevel at base, else her recorded level up to DIFFICULTY. */
export function rhymeLevel(store: ProgressStore, word: string): RhymeLevel {
  return helpLevel(recordedRhymeLevel(store, word), RHYME.startLevel);
}

/** How shaky her rhyme families are, on average (`rimes`, as the word machine records them): the room's lean in the minigame pool. */
export function rhymeShakiness(store: ProgressStore): number {
  return RHYME_FAMILIES.reduce((s, f) => s + store.shakiness('rimes', f.rime), 0) / Math.max(1, RHYME_FAMILIES.length);
}
