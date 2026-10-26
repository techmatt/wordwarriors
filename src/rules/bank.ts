/**
 * One weighting for every word she reads (item 037). Pure: the progress store
 * and the bank, unit-tested.
 *
 * Every draw (the rooms' key words and the counter, the move pads, the ally's
 * gift word, the warm-up's word, the word machine's words) weighs a word by
 *
 *   shakiness × coverage × recency
 *
 * - shakiness: how often she has missed it (ProgressStore, as before 037);
 * - coverage: favours the vowels, first sounds and levels she has met least,
 *   so the draws spread across the phonics rather than circle the same few;
 * - recency (item 067): a word among her latest right-first-time reads
 *   (VARIETY.words in src/config.ts) weighs VARIETY.wordWeight, so last
 *   episode's words rarely come straight back.
 *
 * Every familiar word is in play (item 067, Matt's ruling: no level gate,
 * OCTOPUS included). A game where she sounds a word out unit by unit keeps to
 * short words by its own limit (GRAB / BRIDGE / WORD_MACHINE `maxUnits`,
 * CHARGE `units`); the recognition roles (key words, the counter, pads, the
 * gift) take any word.
 *
 * Distractors (a room's other pictures, the other move pads, the hall's other
 * pictures) are chosen for reading too: while a word is new they differ from it
 * in the first sound, so the first letter is enough; once it is firm (and
 * only from DIFFICULTY 2, item 067) one of them shares its first sound or its
 * rime, so she has to read past the first letter.
 */

import { BANK, BANK_BY_WORD, LEVELS, LIVE, THINGS, VOWEL_LIST, type BankWord } from '../../content/phonics/bank';
import { onsetOf, rimeOf } from '../../content/phonics/families';
import { BANK_DRAW, VARIETY } from '../config';
import type { BagKind, ProgressStore } from '../state/ProgressStore';
import { rampsAdvance } from './difficulty';
import { pickWeighted, type Rand } from './random';

/** How many reads she has had of each vowel, first sound and level: every recorded read of a bank word counts. */
export interface Met {
  vowel: Record<string, number>;
  onset: Record<string, number>;
  level: Record<string, number>;
}

export function met(store: ProgressStore, words: BankWord[] = LIVE): Met {
  const out: Met = { vowel: {}, onset: {}, level: {} };
  for (const w of words) {
    const n = store.stat('words', w.word).seen;
    if (w.vowel) out.vowel[w.vowel] = (out.vowel[w.vowel] ?? 0) + n;
    out.onset[w.onset] = (out.onset[w.onset] ?? 0) + n;
    out.level[w.level] = (out.level[w.level] ?? 0) + n;
  }
  return out;
}

/** One dimension's coverage factor: 1 for a tag never met, about 0.5 at the average, less above it. */
function factor(counts: Record<string, number>, tag: string, tags: string[]): number {
  const mean = tags.reduce((n, t) => n + (counts[t] ?? 0), 0) / Math.max(1, tags.length);
  return 1 / (1 + (counts[tag] ?? 0) / (1 + mean));
}

// The words in play (item 040: an `odd` thing like YAK is out, so coverage never chases it).
const ONSETS = [...new Set(LIVE.map((w) => w.onset))];

/** The coverage term for a word, 0..1: the product of its vowel's, first sound's and level's factors, softened. */
export function coverage(store: ProgressStore, word: string, m: Met = met(store)): number {
  const w = BANK_BY_WORD[word];
  if (!w) return 1;
  const f =
    // A long-vowel word (KEY) has no short vowel to cover.
    (w.vowel ? factor(m.vowel, w.vowel, VOWEL_LIST) : 1) *
    factor(m.onset, w.onset, ONSETS) *
    factor(m.level, String(w.level), LEVELS.map(String));
  // The cube root keeps it one term of three, not a cube of small numbers.
  return Math.cbrt(f);
}

/** Her latest right-first-time reads, the words the draws lean away from (VARIETY.words; item 067). */
export function recentWords(store: ProgressStore): Set<string> {
  return new Set(store.recentOf('words'));
}

/**
 * Words a grown-up asked to see in play this session (item 121: `?words=new`
 * is the words item 121 added, `?words=tree,bee` those): each weighs
 * FAVOURED_WEIGHT times as much in every draw, so the next episodes show them
 * wherever a game can use them (the bag still spends a word once read).
 */
let favoured = new Set<string>();
/** The words items 121, 126 and 157 added (familiar things she knows: the farm, dragons, Dad's bedtime stories, home and school; COW, MOM, DAD; the Shape-Shifter's PUP CUB COT KID): `?words=new`, and NEW on the grown-ups page. */
// Not a stored one (hunt 9: `npm run variety` listed SACK DASH SWISH GATE as new words that never came up).
export const NEW_WORDS: string[] = BANK.filter((w) => (w.since === '121' || w.since === '126' || w.since === '157') && !w.stored).map((w) => w.word);
export const FAVOURED_WEIGHT = 40;
export function favourWords(words: Iterable<string>): void {
  favoured = new Set(words);
}

/** A word's weight in any draw: shakiness × coverage × recency. Words outside the bank (names) weigh shakiness only. */
export function wordWeight(store: ProgressStore, word: string, m: Met = met(store), recent: Set<string> = recentWords(store)): number {
  const w = BANK_BY_WORD[word];
  const shaky = store.shakiness('words', word);
  if (!w) return shaky;
  return shaky * coverage(store, word, m) * (recent.has(word) ? VARIETY.wordWeight : 1) * (favoured.has(word) ? FAVOURED_WEIGHT : 1);
}

/**
 * `said` plus every bank word heard inside one of them (item 039): a plural
 * (LEGS: LEG, FOXES: FOX), an ending on a doubled last letter (PIGGY, PIGGIES,
 * BIGGEST, TOPPING, YUMMIEST), a plain ending (JUMPING), or a compound whose
 * other half is a word (CUPCAKES, PANCAKES, SUNSHINE, PIGLETS, PIGGYBACK), or
 * a compound's second half after a listed first half (DUMBBELL: BELL). Exact-word
 * matching let Smaug's "piggy bank" threat come before PIG as a key word.
 * Not any prefix: FIND, FIGHT, HATES, KITCHEN, BATTLES, CAPTAIN stay clear.
 */
export function withStems(said: Iterable<string>): string[] {
  const out = new Set(said);
  for (const w of [...out]) {
    for (const b of BANK) {
      if (w === b.word || !w.startsWith(b.word)) continue;
      const rest = w.slice(b.word.length);
      const last = b.word.at(-1)!;
      // -ES only after a hiss (FOXES: FOX), so HATES is not HAT's plural.
      const plural = rest === 's' || (rest === 'es' && /(s|x|z|ch|sh)$/.test(b.word));
      // An ending on a doubled last letter (PIG-GY, TOP-PING), or a plain one
      // after two consonants (JUMP-ING); a plain one after a vowel and a
      // consonant is another word's (HAT-ING is HATE's).
      const ending =
        new RegExp(`^${last}(y|ie|ies|ing|er|est|iest|ed)$`).test(rest) || (/[^aeiou]{2}$/.test(b.word) && /^(y|ies|ing|er|est|ed)$/.test(rest));
      const half = rest.replace(/s$/, '');
      // A pet form inside a compound (item 069: PIG-GY-BACK, from "Piggyback Charge").
      const pet = new RegExp(`^${last}(?:y|ie)([a-z]{3,})$`).exec(rest)?.[1]?.replace(/s$/, '');
      const compound = (rest.length >= 3 && (Boolean(BANK_BY_WORD[half]) || COMPOUND_HALVES.has(half))) || Boolean(pet && (BANK_BY_WORD[pet] || COMPOUND_HALVES.has(pet)));
      if (plural || ending || compound) out.add(b.word);
      // Item 056: a compound's other half when it is a bank word too (CUP-CAKES says CAKE).
      if (compound && BANK_BY_WORD[half]) out.add(half);
    }
    for (const h of COMPOUND_HEADS) {
      const tail = w.startsWith(h) ? w.slice(h.length).replace(/s$/, '') : '';
      if (tail && BANK_BY_WORD[tail]) out.add(tail);
    }
  }
  return [...out];
}

/** Second halves of compounds the game says, beyond bank words (CUP-CAKES, SUN-SHINE, PIG-LETS). */
// Item 056: DOM, so KINGDOM says KING.
// HOUSE (item 121): TREE-HOUSE, Dada Matt's workshop, says TREE.
// NOT (hunt 10): Evil Bavmorda's "You cannot stop my magic" says CAN, readable since M40. WORK and DOOR
// (hunt 10): Moriarty's CLOCKWORK gadgets and TRAPDOORS say CLOCK and TRAP.
const COMPOUND_HALVES = new Set(['cake', 'shine', 'let', 'ball', 'fish', 'man', 'box', 'dom', 'back', 'house', 'not', 'work', 'door']);

/**
 * First halves of compounds the game says whose second half is a bank word
 * (item 069): DUMB-BELL says BELL, BROOM-STICK STICK, BATH-TUB TUB. Listed,
 * not any ending: HERSELF, LISTEN and KITCHEN do not say ELF, TEN or HEN.
 */
// LOLLI (item 071, M16): a LOLLIPOP says POP. COPY (hunt 10): Moriarty's COPYCATS says CAT.
const COMPOUND_HEADS = ['bath', 'broom', 'dumb', 'kettle', 'ear', 'hand', 'hazel', 'snow', 'war', 'lolli', 'copy'];

/** Every word the key-word bag holds: the bank's pictured words (item 037: CVC, blends and digraphs). */
export const BAG_WORDS: string[] = THINGS.map((w) => w.word);

/**
 * The bag words before item 035 added MUG RUG JUG: a progress blob saved then
 * knew these (`topUpBag`). Spelled out, since the catalogue has moved on; a
 * blob saved since remembers its own catalogue (`bagKnown`), so 037's words
 * join a round under way either way.
 */
export const LEGACY_BAG_WORDS: string[] = [
  'cat', 'dog', 'sun', 'fox', 'bug', 'pig', 'hat', 'bed', 'cup', 'map', 'fan', 'web', 'bus', 'hen', 'box',
  'net', 'pen', 'van', 'bat', 'bag', 'can', 'nut', 'tub', 'cap', 'pin', 'jet', 'log', 'mop', 'pot', 'rat',
];

/**
 * Draw one key word from the bag: an `eligible` word still in it, weighted
 * by `wordWeight` (shakiness x coverage x recency) times `boost`. When no
 * eligible word is left, the bag
 * refills (a new round) with every bag word except `keepOut` (this episode's
 * words so far, so they do not open the new round too). It falls back to
 * any eligible word only if even a full bag has none.
 *
 * Drawing does not spend the word: it leaves the bag only when she reads it
 * right first time (the room's `recordRead`, src/world/SideRoom.ts, calls `takeFromBag`), so an episode she
 * abandons, or a dev `?scene=` jump, costs her bag nothing, and a word she
 * missed simply stays in.
 */
export function drawKey(
  store: ProgressStore,
  eligible: string[],
  rand: Rand = Math.random,
  keepOut: string[] = [],
  boost: (w: string) => number = () => 1,
): string {
  store.topUpBag(BAG_WORDS, LEGACY_BAG_WORDS);
  return drawFromBag(store, 'keys', BAG_WORDS, eligible, rand, keepOut, boost);
}

/**
 * Draw one word from bag `which`: an `eligible` word still in it, by
 * `wordWeight` × `boost`. When none is left the bag refills with `catalogue`
 * and draws from it but `keepOut` (this episode's words so far); failing
 * that, any eligible word. Drawing never spends the word. The caller tops the bag up first
 * (`topUpBag`, `topUpMoves`).
 */
export function drawFromBag(
  store: ProgressStore,
  which: BagKind,
  catalogue: string[],
  eligible: string[],
  rand: Rand,
  keepOut: string[],
  boost?: (w: string) => number,
): string {
  const ok = new Set(eligible);
  let pool = store.bag(which).left.filter((w) => ok.has(w));
  if (!pool.length) {
    // The new round holds every word; this episode's are only not drawn now (item 069: kept out of
    // the refill, they were lost for the whole round when the episode was left before reading them).
    store.refillBag(catalogue, which);
    pool = store.bag(which).left.filter((w) => ok.has(w) && !keepOut.includes(w));
  }
  if (!pool.length) pool = [...eligible];
  return drawWords(store, pool, 1, rand, boost)[0]!;
}

/** Draw `n` distinct words from `pool` by `wordWeight` × `boost`. */
export function drawWords(store: ProgressStore, pool: string[], n: number, rand: Rand = Math.random, boost: (w: string) => number = () => 1): string[] {
  const m = met(store);
  const recent = recentWords(store);
  return pickWeighted(pool, (w) => wordWeight(store, w, m, recent) * boost(w), n, rand);
}

/**
 * Is a word firm enough for distractors that share its sound (BANK_DRAW.firm)?
 * Never at base difficulty (item 067: no ramp steps up by itself; DIFFICULTY
 * 2 lets it). `kind` is the record to judge by: her reads (`words`), or the
 * warm-up's grabs for the hall's word (a grab is exposure, kept apart from reads).
 */
export function isFirm(store: ProgressStore, word: string, kind: 'words' | 'grabs' = 'words'): boolean {
  if (!rampsAdvance()) return false;
  const s = store.stat(kind, word);
  return s.recent.length >= 2 && store.shakiness(kind, word) <= BANK_DRAW.firm;
}

/** A word's first sound, as far as two letters can share one: a hard C and K are one (CH is its own). */
const firstSound = (w: string) => (w.startsWith('ch') ? 'ch' : w.charAt(0) === 'c' ? 'k' : w.charAt(0));

/** Does `other` share `target`'s first sound (a non-empty onset) or its rime? */
export function sharesSound(target: string, other: string): boolean {
  const o = onsetOf(target);
  return (o !== '' && onsetOf(other) === o) || rimeOf(other) === rimeOf(target);
}

/**
 * `n` distractors for `target` from `pool` (never `target`, nothing in
 * `banned`: its look-alikes, the episode's words). While the word is new they
 * start with another letter. Once it is firm (`isFirm`), one of them shares
 * its first sound or its rime (CAT beside CAN or HAT), so the first letter is
 * not enough; the rest still start with another letter. If a rule leaves too
 * few, it gives way. `firm` overrides the judgement (the hall judges by grabs).
 * `weight` weighs the candidates (uniform by default; the move pads lean to
 * words still in their bag, item 038).
 */
export function distractorsFor(
  store: ProgressStore,
  target: string,
  pool: string[],
  n: number,
  rand: Rand = Math.random,
  banned: Iterable<string> = [],
  firm: boolean = isFirm(store, target),
  weight: (w: string) => number = () => 1,
): string[] {
  const out = new Set([target, ...banned]);
  const all = [...new Set(pool)].filter((w) => !out.has(w));
  // Another first letter and another first sound: KIT is no "other start" for CAT (item 039).
  const unlike = all.filter((w) => w.charAt(0) !== target.charAt(0) && firstSound(w) !== firstSound(target));
  const picked: string[] = [];
  if (firm && n > 0) {
    const share = all.filter((w) => sharesSound(target, w));
    picked.push(...pickWeighted(share, weight, 1, rand));
  }
  const rest = unlike.filter((w) => !picked.includes(w));
  const from = rest.length >= n - picked.length ? rest : all.filter((w) => !picked.includes(w));
  picked.push(...pickWeighted(from, weight, n - picked.length, rand));
  return picked;
}

/** Coverage for the parent screen: per vowel, first sound and level, the bank's words and how many she has read. */
export interface CoverageRow {
  tag: string;
  words: number;
  /** Words she has read at least once. */
  readWords: number;
  /** Words solid: read, and shakiness at or under BANK_DRAW.solid. */
  solid: number;
  reads: number;
}

/** The coverage table's one row for every word starting with a vowel. */
export const VOWEL_ONSET = 'vowel';

/**
 * A word's first-sound row on the grown-ups page (item 144, M69): its onset, or `vowel` for a word starting with
 * a vowel, a short-vowel word's empty onset (ANT) and a long-path word's first vowel (APPLE, IGLOO) alike; Dad read
 * A 1·1·0 as one short-A first word. The draws' coverage still weighs by `onset`.
 */
export function firstSoundTag(w: BankWord): string {
  return /^[aeiou]*$/.test(w.onset) ? VOWEL_ONSET : w.onset;
}

export function coverageTable(store: ProgressStore): { vowel: CoverageRow[]; onset: CoverageRow[]; level: CoverageRow[] } {
  const rows = (tags: string[], key: (w: BankWord) => string): CoverageRow[] =>
    tags.map((tag) => {
      const ws = LIVE.filter((w) => key(w) === tag);
      const stats = ws.map((w) => store.stat('words', w.word));
      return {
        tag,
        words: ws.length,
        readWords: stats.filter((s) => s.seen > 0).length,
        solid: ws.filter((w, i) => stats[i]!.seen > 0 && store.shakiness('words', w.word) <= BANK_DRAW.solid).length,
        reads: stats.reduce((n, s) => n + s.seen, 0),
      };
    });
  return {
    vowel: rows(VOWEL_LIST, (w) => w.vowel ?? ''),
    onset: rows(
      [...new Set(LIVE.map(firstSoundTag))].sort((a, b) => Number(b === VOWEL_ONSET) - Number(a === VOWEL_ONSET) || a.length - b.length || a.localeCompare(b)),
      firstSoundTag,
    ),
    level: rows(LEVELS.map(String), (w) => String(w.level)),
  };
}
