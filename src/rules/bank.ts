/**
 * One weighting for every word she reads (item 037). Pure: the progress store
 * and the bank, unit-tested.
 *
 * Every draw (the rooms' key words and the counter, the move pads, the ally's
 * gift word, the warm-up's word, the word machine's words) weighs a word by
 *
 *   shakiness × coverage × level gate
 *
 * - shakiness: how often she has missed it (ProgressStore, as before 037);
 * - coverage: favours the vowels, first sounds and levels she has met least,
 *   so the draws spread across the phonics rather than circle the same few;
 * - level gate: level 2 (blends) comes in as level 1 firms up, level 3
 *   (digraphs) as level 2 does (BANK_DRAW.levels in src/config.ts).
 *
 * Distractors (a room's other pictures, the other move pads, the hall's other
 * labels) are chosen for reading too: while a word is new they differ from it
 * in the first sound, so the first letter is enough; once it is firm one of
 * them shares its first sound or its rime, so she has to read past the first
 * letter.
 */

import { BANK, BANK_BY_WORD, LEVELS, LIVE, VOWEL_LIST, type BankWord, type Level } from '../../content/phonics/bank';
import { BANK_DRAW } from '../config';
import { pickWeighted, type BagKind, type ProgressStore } from '../state/ProgressStore';

/** A random source, 0..1 like Math.random: seeded in tests and with `?seed=`. */
export type Rand = () => number;

/** A shuffled copy of `xs` (Fisher-Yates from the end, one `rand()` per step). */
export function shuffle<T>(xs: readonly T[], rand: Rand): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

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

/** The share of a level's words that are solid (shakiness at or under BANK_DRAW.solid). */
export function firmness(store: ProgressStore, level: Level): number {
  const words = LIVE.filter((w) => w.level === level);
  const solid = words.filter((w) => store.stat('words', w.word).seen > 0 && store.shakiness('words', w.word) <= BANK_DRAW.solid);
  return solid.length / Math.max(1, words.length);
}

/** A level's gate, 0..1: level 1 is always open; a level opens as the one below firms up. */
export function levelGate(store: ProgressStore, level: Level): number {
  if (level === 1) return 1;
  const g = BANK_DRAW.levels[level];
  const firm = firmness(store, (level - 1) as Level);
  if (firm < g.start) return 0;
  return Math.min(1, g.min + ((1 - g.min) * (firm - g.start)) / Math.max(0.001, g.full - g.start));
}

/** A word's weight in any draw: shakiness × coverage × level gate (× `boost`). Words outside the bank (names) weigh shakiness only. */
export function wordWeight(store: ProgressStore, word: string, m: Met = met(store), gates?: Record<number, number>): number {
  const w = BANK_BY_WORD[word];
  const shaky = store.shakiness('words', word);
  if (!w) return shaky;
  const gate = gates ? gates[w.level]! : levelGate(store, w.level);
  return shaky * coverage(store, word, m) * gate;
}

/** The gates of every level, worked out once per draw. */
export function gates(store: ProgressStore): Record<number, number> {
  return Object.fromEntries(LEVELS.map((l) => [l, levelGate(store, l)]));
}

/**
 * `said` plus every bank word heard inside one of them (item 039): a plural
 * (LEGS: LEG, FOXES: FOX), an ending on a doubled last letter (PIGGY, PIGGIES,
 * BIGGEST, TOPPING, YUMMIEST), a plain ending (JUMPING), or a compound whose
 * other half is a word (CUPCAKES, PANCAKES, SUNSHINE, PIGLETS). Exact-word
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
      const compound = rest.length >= 3 && (Boolean(BANK_BY_WORD[half]) || COMPOUND_HALVES.has(half));
      if (plural || ending || compound) out.add(b.word);
    }
  }
  return [...out];
}

/** Second halves of compounds the game says, beyond bank words (CUP-CAKES, SUN-SHINE, PIG-LETS). */
const COMPOUND_HALVES = new Set(['cake', 'shine', 'let', 'ball', 'fish', 'man', 'box']);

/**
 * Is a word's level open to her (its gate above 0)? A bag draw whose pool
 * holds only shut words looks wider before falling back on them (item 039:
 * the end of a bag round left only digraphs in it, and they were drawn as
 * the gift, the moves and the keys while digraphs were still shut).
 */
export function openWords(store: ProgressStore): (w: string) => boolean {
  return openIn(gates(store));
}

/** `openWords` by gates already worked out (`gates`); a word outside the bank is open. */
export function openIn(g: Record<number, number>): (w: string) => boolean {
  return (w) => !BANK_BY_WORD[w] || g[BANK_BY_WORD[w]!.level]! > 0;
}

/**
 * Draw one word from bag `which`: an `eligible` word still in it, by
 * `wordWeight` × `boost`. When none of them is open (a bag left with only
 * words of a shut level counts as spent, item 039) the bag refills with
 * `catalogue` but `keepOut` (this episode's words so far); failing that, any
 * open eligible word, then any eligible word. Drawing never spends the word.
 * The caller tops the bag up first (`topUpBag`, `topUpMoves`).
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
  const open = openWords(store);
  let pool = store.bag(which).left.filter((w) => ok.has(w));
  if (!pool.some(open)) {
    store.refillBag(catalogue.filter((w) => !keepOut.includes(w)), which);
    pool = store.bag(which).left.filter((w) => ok.has(w));
  }
  if (!pool.some(open) && eligible.some(open)) pool = eligible.filter(open);
  if (!pool.length) pool = [...eligible];
  return drawWords(store, pool, 1, rand, boost)[0]!;
}

/**
 * Draw `n` distinct words from `pool` by `wordWeight` × `boost`. A word whose
 * level is still shut has weight 0 and comes up only when nothing else can
 * (pickWeighted's floor), so a pool of only shut words still draws.
 */
export function drawWords(store: ProgressStore, pool: string[], n: number, rand: Rand = Math.random, boost: (w: string) => number = () => 1): string[] {
  const m = met(store);
  const g = gates(store);
  const open = pool.filter(openIn(g));
  const from = open.length >= n ? open : pool;
  return pickWeighted(from, (w) => wordWeight(store, w, m, g) * boost(w), n, rand);
}

/**
 * Is a word firm enough for distractors that share its sound (BANK_DRAW.firm)?
 * `kind` is the record to judge by: her reads (`words`), or the warm-up's
 * grabs for the hall's word (a grab is exposure, kept apart from reads).
 */
export function isFirm(store: ProgressStore, word: string, kind: 'words' | 'grabs' = 'words'): boolean {
  const s = store.stat(kind, word);
  return s.recent.length >= 2 && store.shakiness(kind, word) <= BANK_DRAW.firm;
}

const onsetOf = (w: string) => BANK_BY_WORD[w]?.onset ?? w.charAt(0);
/** A word's first sound, as far as two letters can share one: a hard C and K are one (CH is its own). */
const firstSound = (w: string) => (w.startsWith('ch') ? 'ch' : w.charAt(0) === 'c' ? 'k' : w.charAt(0));
const rimeOf = (w: string) => BANK_BY_WORD[w]?.rime ?? w.slice(1);

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
  /** Words solid (as `firmness` counts them). */
  solid: number;
  reads: number;
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
    onset: rows([...ONSETS].sort((a, b) => a.length - b.length || a.localeCompare(b)), (w) => w.onset),
    level: rows(LEVELS.map(String), (w) => String(w.level)),
  };
}
