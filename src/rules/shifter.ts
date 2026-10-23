/**
 * The Shape-Shifter (item 096): the villain's polymorph spell walks a
 * creature down a chain of pictured words, one letter changed a link (CAT,
 * BAT, BAG, BUG, MUG), and she reads every link. Pure: no Phaser,
 * unit-tested (tests/unit/shifter.test.ts).
 *
 * Today's games can be half-won from the first letter; here every position
 * changes in turn, so she has to read every letter. Chains changing all three
 * places come first (hunt 6, M29: the vowel too), then those keeping the order
 * first letter, last, vowel (`ORDER`) but for one step back at most (CAT BAT
 * BAG BIG PIG), the first link at the first letter. Its words are the bank's familiar
 * pictured CVC words, one letter a sound (`SHIFT_WORDS`): a link with no such
 * word is left out, so a chain may be shorter (SHIFTER.minLinks at least).
 *
 * Two beats, mixed through the chain (`beatFor`):
 *   - read it: the new word appears written on the creature, not voiced; the
 *     room shows pictures differing from it only at the changed letter (BAT,
 *     HAT, RAT) and she walks to the one she read;
 *   - fix it: the creature turns into the new picture with its old label
 *     (a bat labelled CAT); the room shows letter stones with different
 *     sounds and she walks to the one that fixes the label.
 * A link is read it on the even links when the bank has pictures enough to
 * stand beside it, else fix it (a letter stone can always be made).
 *
 * Each word has a help level on a ramp, like the bridge's: 1 the changed
 * letter lit and each stone sounding as she comes near; 2 lit, silent
 * stones; 3 nothing lit. Right first time with no help moves it up a level;
 * a hint or a miss, down one. The room gives `shifterLevel`: level 1 at base
 * (item 067, DIFFICULTY in src/config.ts).
 */

import { BANK_BY_WORD, THINGS } from '../../content/phonics/bank';
import { NO_ARTICLE, NUMBER_WORDS, lookalikesOf } from '../../content/phonics/sentences';
import { SHIFTER } from '../config';
import type { ProgressStore } from '../state/ProgressStore';
import { met, recentWords, wordWeight } from './bank';
import { clampLevel, helpLevel, stepLevel, type HelpLevel } from './difficulty';
import { pickWeighted, shuffle, type Rand } from './random';

export type ShifterLevel = HelpLevel;
export type Beat = 'read' | 'fix';
/** Which letter a link changes: 0 the first, 2 the last, 1 the vowel. */
export type Position = 0 | 1 | 2;

export interface ShifterLink {
  /** The creature before and after. */
  from: string;
  to: string;
  /** The letter that changes. */
  pos: Position;
  beat: Beat;
  /** Read it: the pictures standing in the room (`to` among them). Fix it: the letter stones (`to[pos]` among them). In their order left to right. */
  options: string[];
}

export interface ShifterPlan {
  /** The creature the spell starts on: shown and said, not read. */
  start: string;
  links: ShifterLink[];
}

/** The order a chain changes its letters in: the first, then the last, the vowel last. */
const ORDER: Position[] = [0, 2, 1];

const VOWELS = 'aeiou';
/** Consonants a fix-it stone can be: one letter, one plain sound (no Q X, no C beside K). */
const STONE_CONSONANTS = 'bdfghjklmnprstvwz';
/** Letters two stones must not both be: the same sound. */
const sameSound = (a: string, b: string) => a === b || (a === 'c' && b === 'k') || (a === 'k' && b === 'c');

/** Every word a chain can use: a familiar pictured CVC word, one letter a sound (CAT; not DUCK, BELL or SHIP). */
export const SHIFT_WORDS: string[] = THINGS.filter((w) => w.level === 1 && !w.odd && w.units.length === 3 && w.units.every((u) => u.length === 1) && w.vowel !== null).map((w) => w.word);

/** Where two words differ, if in exactly one letter; else null. */
export function changedAt(a: string, b: string): Position | null {
  if (a.length !== 3 || b.length !== 3) return null;
  const at = [0, 1, 2].filter((i) => a[i] !== b[i]);
  return at.length === 1 ? (at[0] as Position) : null;
}

/** How many times a chain's links go back in ORDER (the first letter after the last, say). */
export function orderBreaks(positions: Position[]): number {
  let n = 0;
  for (let i = 1; i < positions.length; i++) if (ORDER.indexOf(positions[i]!) < ORDER.indexOf(positions[i - 1]!)) n++;
  return n;
}

/** The words differing from `word` only at `pos`, from `pool`. */
export function siblings(word: string, pos: Position, pool: string[] = SHIFT_WORDS): string[] {
  return pool.filter((w) => w !== word && changedAt(word, w) === pos);
}

/**
 * A read-it link's wrong pictures: words differing from `to` only at `pos`, never `from` (she is looking at
 * it) and never a look-alike of `to` (hunt 6: BAT beside CAT and RAT, a fair pick then told it is wrong).
 */
export function pictureSiblings(to: string, pos: Position, from: string, pool: string[]): string[] {
  const like = lookalikesOf(to);
  return siblings(to, pos, pool).filter((w) => w !== from && !like.includes(w));
}

/**
 * Every chain of `n` links through `words` (no word twice), each with its positions. No link joins two
 * look-alikes (hunt 6: a bat turning into a rat, or a pin into a pen, left her nothing she could see to fix).
 */
export function chainsOf(n: number, words: string[] = SHIFT_WORDS): string[][] {
  const out: string[][] = [];
  const next = new Map(words.map((w) => [w, words.filter((x) => changedAt(w, x) !== null && !lookalikesOf(w).includes(x))]));
  const walk = (path: string[]) => {
    if (path.length === n + 1) {
      out.push(path);
      return;
    }
    for (const x of next.get(path.at(-1)!)!) if (!path.includes(x)) walk([...path, x]);
  };
  for (const w of words) walk([w]);
  return out;
}

/** The positions a chain's links change. */
export const positionsOf = (chain: string[]): Position[] => chain.slice(1).map((w, i) => changedAt(chain[i]!, w)!);

/**
 * A read-it link's wrong pictures, as many as `pool` gives up to
 * SHIFTER.options - 1: its siblings at `pos` first. At the vowel or the last
 * letter (hunt 6, M29: no word had two pictured siblings there, so every
 * read-it link changed the first letter and she could pick from the first
 * sound alone) one sibling may stand with any other pictured word, one with
 * `to`'s first letter first; never `from`, a look-alike of `to`, or `to`.
 */
export function wrongPictures(to: string, pos: Position, from: string, pool: string[], rand?: Rand): string[] {
  const n = SHIFTER.options - 1;
  const sibs = pictureSiblings(to, pos, from, pool);
  const pick = (ws: string[]) => (rand ? shuffle(ws, rand) : ws);
  if (sibs.length >= n || pos === 0 || !sibs.length) return pick(sibs).slice(0, n);
  const like = lookalikesOf(to);
  const others = pool.filter((w) => w !== to && w !== from && !sibs.includes(w) && !like.includes(w));
  const front = (ws: string[]) => [...pick(ws.filter((w) => w[0] === to[0])), ...pick(ws.filter((w) => w[0] !== to[0]))];
  return [...pick(sibs), ...front(others)].slice(0, n);
}

/**
 * A link's beat: read it on the even links (the first one too) where `pool`
 * has SHIFTER.options - 1 wrong pictures for it (`wrongPictures`), else fix it.
 */
function beatFor(i: number, from: string, to: string, pos: Position, pool: string[]): Beat {
  return i % 2 === 0 && wrongPictures(to, pos, from, pool).length >= SHIFTER.options - 1 ? 'read' : 'fix';
}

/** How many of the word's three places a chain changes (hunt 6, M29: most chains never changed the vowel). */
export const placesOf = (chain: string[]): number => new Set(positionsOf(chain)).size;

/** Fix it's stones for the letter `right` replacing `old`: `right` and n - 1 others of its kind (vowels with a vowel), no two the same sound, never `old`. */
export function stonesFor(right: string, old: string, n: number, rand: Rand): string[] {
  const kind = VOWELS.includes(right) ? VOWELS : STONE_CONSONANTS;
  const others = [...kind].filter((l) => !sameSound(l, right) && !sameSound(l, old));
  return shuffle([right, ...shuffle(others, rand).slice(0, n - 1)], rand);
}

/** A chain's links as words joined either way round (BAT-CAT is CAT-BAT). */
const linksOf = (chain: string[]): string[] => chain.slice(1).map((w, i) => [chain[i]!, w].sort().join('-'));

/** A visit's chain as the store remembers it (`recent.chains`, hunt 7, M36): its words in order. */
export const chainKey = (p: ShifterPlan): string => [p.start, ...shifterWords(p)].join(' ');

/**
 * The words the episode before had her read (hunt 8, M37: MAT came up three
 * episodes running): its rooms', pads' and gift's, kept as one entry by the
 * house plan (src/episode/plans.ts `rememberPlan`), so the next chain keeps clear of them.
 */
export const LAST_READ = 'last_episode_words';

/** The episode before's words (`LAST_READ`), as the store keeps them. */
export const lastRead = (store: ProgressStore): Set<string> => new Set((store.recentOf(LAST_READ).at(-1) ?? '').split(' ').filter(Boolean));

/** How many chains the store keeps: the last SHIFTER.recentChains by link, twice that whole. */
export const CHAINS_KEPT = 2 * SHIFTER.recentChains;

/** The chains the store keeps (newest last), whole; the last SHIFTER.recentChains of them by link, the last SHIFTER.wordChains by word. */
function recentChains(store: ProgressStore): { chains: Set<string>; links: Set<string>; words: Set<string> } {
  const kept = store.recentOf('chains').slice(-CHAINS_KEPT);
  return { chains: new Set(kept), links: new Set(kept.slice(-SHIFTER.recentChains).flatMap((k) => linksOf(k.split(' ')))), words: new Set(kept.slice(-SHIFTER.wordChains).flatMap((k) => k.split(' '))) };
}

export interface ShifterInput {
  /** Words the episode says or shows first, its move pads and its gift: never a chain word or picture. */
  avoid: string[];
  /** Words other rooms have planned already. */
  taken: string[];
}

/**
 * A visit's chain: SHIFTER.links links (fewer where no chain that long fits,
 * SHIFTER.minLinks at least; null when not even that) through the words the
 * episode leaves free. Of those sharing no link with the last few chains
 * (`recent.chains`, M36), the chains changing the most places and breaking
 * ORDER least, those holding at most one recent read (hunt 7), one drawn by
 * the bank's weight of the words she reads; each link its beat and options.
 */
export function planShifter(store: ProgressStore, input: ShifterInput, rand: Rand = Math.random): ShifterPlan | null {
  const avoid = new Set([...input.avoid, ...input.taken]);
  const free = SHIFT_WORDS.filter((w) => !avoid.has(w));
  // Both beats where the bank allows: a chain with a read-it link (its odd links are fix it).
  const beats = (c: string[]) => c.slice(1).some((to, i) => beatFor(i, c[i]!, to, changedAt(c[i]!, to)!, free.filter((w) => !c.includes(w))) === 'read');
  // The longest chains that fit, scored: first by how many of the three places they change (hunt 6, M29:
  // 255 of 300 never changed the vowel), then in order but for one step back at most (Matt's CAT BAT BAG BIG
  // PIG goes back to the first letter once), the first link changing the first letter; else the least out of order.
  const score = (c: string[]) => (3 - placesOf(c)) * 10 + Math.max(0, orderBreaks(positionsOf(c)) - 1) * 2 + (positionsOf(c)[0] === 0 ? 0 : 1);
  const best = (cs: string[][]) => {
    const scores = cs.map(score);
    const low = Math.min(...scores);
    return cs.filter((_, i) => scores[i] === low);
  };
  const m = met(store);
  const recent = recentWords(store);
  const lately = recentChains(store);
  const before = lastRead(store);
  let pool: string[][] = [];
  let allFix: string[][] = [];
  for (let n = SHIFTER.links; n >= SHIFTER.minLinks && !pool.length; n--) {
    // The first creature is said after "It starts as a...": never a number or a word that takes no A (hunt 6:
    // "It starts as a... ten!", M23's case; JAM, fix 92's).
    const all = chainsOf(n, free).filter((c) => !NUMBER_WORDS.has(c[0]!) && !NO_ARTICLE.has(c[0]!));
    if (!all.length) continue;
    // Hunt 7, M36: a chain sharing a link with one of the last SHIFTER.recentChains waits (MUG BUG BUN BIN
    // came back whole every three episodes), and one the same as any kept (CHAINS_KEPT), where the pool
    // allows; under the length, above the rest. A drawn run of ten repeats none (tests/unit/shifterDraws.test.ts).
    const notSame = all.filter((c) => !lately.chains.has(c.join(' ')));
    const noLink = (cs: string[][]) => cs.filter((c) => !linksOf(c).some((l) => lately.links.has(l)));
    const chains = [noLink(notSame), noLink(all), notSame].find((cs) => cs.length) ?? all;
    // Of those changing the most places (M29), chains holding at most one word she read lately, where
    // any do (hunt 7: the best-scored chains are few, so recency's weight hardly moved them and MAT MAN
    // PAN came back three episodes in four; 45 of 100 episodes shared a word with the one before, 25 now),
    // and first those holding no word the episode before had her read (hunt 8, M37 (a): MAT three
    // episodes running). Item 126 (Matt's pick 2b): first of all those holding no word of the last
    // SHIFTER.wordChains chains either, and when no chain changing the most places is one, "the most
    // places" gives way to one changing fewer (the few all-three-places chains ran through BUG and MAT:
    // BUG was in one visit in three). Under the length, the read-it link; above the rest of the score.
    const fresh = (cs: string[][]) => {
      const most = Math.max(...cs.map(placesOf));
      const top = cs.filter((c) => placesOf(c) === most);
      const few = (c: string[]) => c.slice(1).filter((w) => recent.has(w)).length <= 1;
      const unread = (c: string[]) => !c.some((w) => before.has(w));
      const unchained = (c: string[]) => few(c) && unread(c) && !c.some((w) => lately.words.has(w));
      const clear = (c: string[]) => few(c) && unread(c);
      const tiers = [top.filter(unchained), cs.filter(unchained), top.filter(clear), top.filter(unread), cs.filter(unread), top.filter(few)];
      return tiers.find((t) => t.length) ?? cs;
    };
    // A shorter chain with a read-it link before an all-fix-it one (M29: one visit in twenty had none).
    const mixed = chains.filter(beats);
    if (mixed.length) pool = best(fresh(mixed));
    else if (!allFix.length) allFix = best(fresh(chains));
  }
  if (!pool.length) pool = allFix;
  if (!pool.length) return null;
  const each = new Map(free.map((w) => [w, wordWeight(store, w, m, recent)]));
  const weight = (i: string) => pool[Number(i)]!.slice(1).reduce((s, w) => s + each.get(w)!, 0);
  const chain = pool[Number(pickWeighted(pool.map((_, i) => String(i)), weight, 1, rand)[0])]!;
  // A read-it link's other pictures keep clear of the episode's words, and of the chain's own words still to come.
  const pictures = free.filter((w) => !chain.includes(w));
  const links = chain.slice(1).map((to, i): ShifterLink => {
    const from = chain[i]!;
    const pos = changedAt(from, to)!;
    const beat = beatFor(i, from, to, pos, pictures);
    const options =
      beat === 'read'
        ? shuffle([to, ...wrongPictures(to, pos, from, pictures, rand)], rand)
        : stonesFor(to[pos]!, from[pos]!, SHIFTER.options, rand);
    return { from, to, pos, beat, options };
  });
  return { start: chain[0]!, links };
}

/** Every word a visit reads, in order: its battle items, the last the creature that goes to the battle. */
export const shifterWords = (p: ShifterPlan): string[] => p.links.map((l) => l.to);

/** Every picture a visit shows: its creatures and the read-it pictures. */
export const shifterShown = (p: ShifterPlan): string[] => [...new Set([p.start, ...p.links.flatMap((l) => [l.to, ...(l.beat === 'read' ? l.options : [])])])];

/** The help level her reads of a word here have reached (the ramp; recorded, and shown on the grown-ups page). */
export function recordedShifterLevel(store: ProgressStore, word: string): ShifterLevel {
  return clampLevel(store.shifterLevel(word, SHIFTER.startLevel));
}

/** The help level the room gives a word now: SHIFTER.startLevel at base, else her recorded level up to DIFFICULTY. */
export function shifterLevel(store: ProgressStore, word: string): ShifterLevel {
  return helpLevel(recordedShifterLevel(store, word), SHIFTER.startLevel);
}

/** The ramp: right first time with no help is one level less help; a hint or a miss, one more. */
export function nextShifterLevel(level: ShifterLevel, unaided: boolean): ShifterLevel {
  return stepLevel(level, unaided);
}

/** How shaky the words a chain can use are, on average: the room's lean in the minigame pool. */
export function shifterShakiness(store: ProgressStore): number {
  return SHIFT_WORDS.reduce((s, w) => s + store.shakiness('words', w), 0) / Math.max(1, SHIFT_WORDS.length);
}

/** A word's letter at `pos`, as the bank spells its sound (CAT's C is K's sound). */
export function soundAt(word: string, pos: Position): string {
  return BANK_BY_WORD[word]?.sounds[pos] ?? word[pos]!;
}
