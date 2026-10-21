/**
 * The Stretchy Bridge (item 054): which words a visit crosses, the pictures
 * on the far bank, and how much help each word gets. Pure: no Phaser,
 * unit-tested (tests/unit/bridge.test.ts).
 *
 * She slides over the word's letters, each stone's sound held while she is on
 * it, and walks to the picture she read. Nothing here can be won from the
 * first letter: the other pictures share the word's start and differ later
 * (MAP beside MAT and MAN, or MOP and MUG), so she has to blend the whole
 * word. Only where the bank has no such picture do they share its rime
 * (CAT, HAT, BAT).
 *
 * The draw is the bank's (src/rules/bank.ts `drawWords`: shakiness ×
 * coverage, last episode's words leaning back) over every short word
 * (BRIDGE.maxUnits sound units at most; item 067: no tier or level gate, so
 * every one is in play from the start). Words still in her word bag lean
 * ahead, and a visit plays its easier tiers first:
 *   1. CVC words starting with a sound you can hold (M S F L N R V Z);
 *   2. CVC words starting with a stop sound;
 *   3. blends and digraphs.
 *
 * Each word has a help level on a ramp, like the warm-up's and the runes':
 *   1. the stones sound themselves as she slides; the pictures show from the start;
 *   2. the stones are silent unless Dad presses 2 for a hint;
 *   3. she says the whole word aloud and Dad presses 2, and only then do the
 *      pictures show; his 1 replays the slide with sounds.
 * Right first time with no help moves it up a level; a hint, a replay or a
 * wrong picture moves it down one. The level is recorded always; the room
 * gives `bridgeLevel`, level 1 at base (item 067, DIFFICULTY in src/config.ts).
 */

import { BANK_BY_WORD, THINGS, type BankWord } from '../../content/phonics/bank';
import { canHold } from '../../content/phonics/letters';
import { lookalikesOf } from '../../content/phonics/sentences';
import { BRIDGE } from '../config';
import type { ProgressStore } from '../state/ProgressStore';
import { drawWords, shuffle, type Rand } from './bank';
import { helpLevel } from './difficulty';

export type BridgeLevel = 1 | 2 | 3;
export type BridgeTier = 1 | 2 | 3;

export interface BridgeRound {
  word: string;
  /** Its stones: the word's sound units (SH one stone), and each one's sound (the SOUND_BY_UNIT key). */
  units: string[];
  sounds: string[];
  /** The far bank's pictures, the word's among them, in their order top to bottom. */
  pictures: string[];
}

export interface BridgePlan {
  rounds: BridgeRound[];
}

/** A word's first sound as two words can share it: a hard C, K and CK are one. */
const sameSound = (s: string) => (s === 'c' || s === 'ck' ? 'k' : s);

/** A word the bridge can cross: a pictured thing with a short vowel (KEY and YOYO have none). */
const bridgeable = (w: BankWord) => w.vowel !== null;

/** Every picture the bridge can show: the bank's familiar things with a short vowel. */
export const BRIDGE_WORDS: string[] = THINGS.filter(bridgeable).map((w) => w.word);

/** Every word she can cross: the short ones, BRIDGE.maxUnits sound units at most (item 067). */
export const CROSS_WORDS: string[] = THINGS.filter((w) => bridgeable(w) && w.units.length <= BRIDGE.maxUnits).map((w) => w.word);

/** A word's tier: a CVC word starting with a sound you can hold, a CVC word starting with a stop, or a blend or digraph. */
export function bridgeTier(word: string): BridgeTier {
  const w = BANK_BY_WORD[word];
  if (!w || w.level > 1) return 3;
  return canHold(w.sounds[0]!) ? 1 : 2;
}

/** The help level her crossings of a word have reached (the ramp, recorded for the grown-ups page). */
export function recordedBridgeLevel(store: ProgressStore, word: string): BridgeLevel {
  const l = store.bridgeLevel(word, BRIDGE.startLevel);
  return (l <= 1 ? 1 : l >= 3 ? 3 : 2) as BridgeLevel;
}

/** The help level the room gives a word now: BRIDGE.startLevel at base, else her recorded level up to DIFFICULTY (item 067). */
export function bridgeLevel(store: ProgressStore, word: string): BridgeLevel {
  return helpLevel(recordedBridgeLevel(store, word), BRIDGE.startLevel);
}

/** The ramp: right first time with no help is one level less help; any help or a wrong picture, one more. */
export function nextBridgeLevel(level: BridgeLevel, unaided: boolean): BridgeLevel {
  return Math.max(1, Math.min(3, level + (unaided ? 1 : -1))) as BridgeLevel;
}

/** How many sound units two words share from the start, by sound (CAT and KIT share one). */
export function sharedStart(a: string, b: string): number {
  const x = BANK_BY_WORD[a]?.sounds ?? [...a];
  const y = BANK_BY_WORD[b]?.sounds ?? [...b];
  let n = 0;
  while (n < x.length && n < y.length && sameSound(x[n]!) === sameSound(y[n]!)) n++;
  return n;
}

/**
 * The far bank's other pictures for `word`: `n` from `pool`, never the word,
 * a look-alike of it or anything in `avoid`. Best first: pictures sharing
 * its first two sounds (MAP: MAT, MAN, MASK), then its first sound (MOP,
 * MUG), so the first letter is never enough; only then its rime (CAT: HAT),
 * then anything.
 */
export function bridgePictures(word: string, n: number, rand: Rand = Math.random, avoid: Iterable<string> = [], pool: string[] = BRIDGE_WORDS): string[] {
  const out = new Set([word, ...lookalikesOf(word), ...avoid]);
  const all = [...new Set(pool)].filter((w) => !out.has(w) && w !== word);
  const rime = BANK_BY_WORD[word]?.rime;
  const groups = [
    all.filter((w) => sharedStart(word, w) >= 2),
    all.filter((w) => sharedStart(word, w) === 1),
    all.filter((w) => sharedStart(word, w) === 0 && rime !== undefined && BANK_BY_WORD[w]?.rime === rime),
    all.filter((w) => sharedStart(word, w) === 0 && BANK_BY_WORD[w]?.rime !== rime),
  ];
  const picked: string[] = [];
  for (const g of groups) {
    if (picked.length >= n) break;
    picked.push(...shuffle(g, rand).slice(0, n - picked.length));
  }
  return picked;
}

/** Where `picked` first differs from `word`, by sound unit: the word's sound there and whether it is the start, the middle or the end. */
export function whereDiffers(word: string, picked: string): { where: 'start' | 'middle' | 'end'; index: number; sound: string } {
  const w = BANK_BY_WORD[word]!;
  const i = Math.min(sharedStart(word, picked), w.sounds.length - 1);
  return { where: i === 0 ? 'start' : i === w.sounds.length - 1 ? 'end' : 'middle', index: i, sound: w.sounds[i]! };
}

export interface BridgeInput {
  /** Words the episode says or shows first, its move pads and its gift: never a bridge word or picture. */
  avoid: string[];
  /** Words other rooms have planned already. */
  taken: string[];
}

/**
 * A visit's words: `n` short words (CROSS_WORDS) by the bank's weight (× 2
 * for a word still in her word bag), none of them the episode's other words,
 * the easier tiers first; each with its far-bank pictures.
 */
export function planBridge(store: ProgressStore, input: BridgeInput, rand: Rand = Math.random, n = BRIDGE.words): BridgePlan {
  const avoid = new Set([...input.avoid, ...input.taken]);
  const eligible = CROSS_WORDS.filter((w) => !avoid.has(w));
  const inBag = new Set(store.bag().left);
  const boost = (w: string) => (inBag.has(w) ? 2 : 1);
  const words: string[] = [];
  for (let k = 0; k < n; k++) {
    const pool = eligible.filter((w) => !words.includes(w));
    if (!pool.length) break;
    words.push(drawWords(store, pool, 1, rand, boost)[0]!);
  }
  const ordered = words.map((w, i) => ({ w, i })).sort((a, b) => bridgeTier(a.w) - bridgeTier(b.w) || a.i - b.i).map((x) => x.w);
  return {
    rounds: ordered.map((word) => {
      const b = BANK_BY_WORD[word]!;
      // The other pictures keep clear of the episode's words and of this visit's other words.
      const others = bridgePictures(word, BRIDGE.pictures - 1, rand, [...avoid, ...ordered]);
      return { word, units: [...b.units], sounds: [...b.sounds], pictures: shuffle([word, ...others], rand) };
    }),
  };
}

/** Every word a visit reads, in order: its battle items. */
export const bridgeWords = (p: BridgePlan): string[] => p.rounds.map((r) => r.word);

/** Every picture a visit shows. */
export const bridgeShown = (p: BridgePlan): string[] => [...new Set(p.rounds.flatMap((r) => r.pictures))];

/** How shaky the words she can cross are, on average: the room's lean in the minigame pool. */
export function bridgeShakiness(store: ProgressStore): number {
  return CROSS_WORDS.reduce((s, w) => s + store.shakiness('words', w), 0) / Math.max(1, CROSS_WORDS.length);
}
