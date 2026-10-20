/**
 * The word machine's rounds (item 026): which families and words a visit
 * builds, and which letter tiles lie on the floor. Pure: no Phaser,
 * unit-tested.
 *
 * A visit is `WORD_MACHINE.rounds` rounds: up to `perFamily` words of one
 * family (CAT, then HAT, then BAT: the rime stays, the first sound changes),
 * then a switch to a second family for the rest. The family is weighted
 * toward shaky rimes (ProgressStore `rimes`), each word by the one word
 * weighting (`wordWeight`, src/rules/bank.ts: shakiness × coverage × level
 * gate) times how shaky its first sound is (`onsets`).
 *
 * The words come out of her word bag (item 015) like any key word: a word
 * still in the bag, never one in `avoid` (whatever the episode says or shows
 * before: the spell, frame words, the cast's words) nor one another room has
 * (`taken`). When no family has two words left in the bag, the machine uses
 * every eligible word instead (the bag, shared with the sentence rooms, refills
 * only when it is empty). Building a word right first time spends it
 * (`takeFromBag`), a miss puts it back.
 *
 * Modes. Only `make` (make the picture) is played today: a picture and a
 * fixed rime, onset tiles on the floor, wrong tiles make silly words. Each
 * tile already says what it makes and whether that is a real word, which is
 * what the later modes need: `flip` (a built word, change its first sound to
 * reach the next picture) and `real_or_silly` (is ZAT a word?). A new mode is
 * a new `MachineMode`, a plan for it here, and its handler in the scene.
 */

import { FAMILIES, FAMILY_BY_RIME, onsetOf, rimeOf, sillyWord, type Family } from '../../content/phonics/families';
import { WORD_MACHINE } from '../config';
import { pickWeighted, type ProgressStore } from '../state/ProgressStore';
import { gates, met, wordWeight as bankWeight } from './bank';
import { BAG_WORDS, LEGACY_BAG_WORDS, type Rand } from './sentences';

export type MachineMode = 'make' | 'flip' | 'real_or_silly';

export interface MachineTile {
  /** Lower case. */
  letter: string;
  /** The word this tile makes with the rime, lower case: `bat` or the silly `zat`. */
  makes: string;
  /** A real (pictured) word, or a silly one. Mode 1 lays only the right tile and silly ones. */
  real: boolean;
}

export interface MachineRound {
  rime: string;
  /** The word to build: the picture shown. */
  word: string;
  onset: string;
  /** Left to right on the floor; exactly one makes `word`. */
  tiles: MachineTile[];
}

export interface MachinePlan {
  mode: MachineMode;
  rounds: MachineRound[];
}

export interface MachineInput {
  /** Words the episode says or shows before (never built). */
  avoid: Set<string> | string[];
  /** Words other rooms already have this episode. */
  taken: string[];
}

export interface MachineRules {
  rounds: number;
  perFamily: number;
  tiles: number;
}

/** The words of `fam` in `pool`. */
function inFamily(fam: Family, pool: string[]): string[] {
  return fam.words.filter((w) => pool.includes(w));
}

/** The tiles for building `word`: its own onset and silly ones, shuffled. */
export function tilesFor(word: string, n: number, rand: Rand): MachineTile[] {
  const fam = FAMILY_BY_RIME[rimeOf(word)]!;
  const silly = pickWeighted(fam.silly.map((s) => s.letter), () => 1, Math.max(1, n - 1), rand);
  const tiles: MachineTile[] = [
    { letter: onsetOf(word), makes: word, real: true },
    ...silly.map((l) => ({ letter: l, makes: sillyWord(l, fam.rime), real: false })),
  ];
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j]!, tiles[i]!];
  }
  return tiles;
}

/**
 * One visit's rounds. Every word it builds is in the returned plan, in order;
 * the caller keeps them out of the episode's other rooms.
 */
export function planMachine(store: ProgressStore, input: MachineInput, rand: Rand = Math.random, rules: MachineRules = WORD_MACHINE): MachinePlan {
  const avoid = new Set(input.avoid);
  const eligible = BAG_WORDS.filter((w) => FAMILIES.some((f) => f.words.includes(w)) && !avoid.has(w) && !input.taken.includes(w));
  const usable = (pool: string[]) => FAMILIES.filter((f) => inFamily(f, pool).length >= 2);

  // The bag is shared with the sentence rooms: it refills only once it is
  // empty (as `drawKey` refills only when nothing it can use is left). While
  // other words are still in it and no family has two left, the machine takes
  // eligible words from outside the bag, without spending the round. Words new
  // to the game join a round under way (`topUpBag`).
  store.topUpBag(BAG_WORDS, LEGACY_BAG_WORDS);
  let pool = store.bag().left.filter((w) => eligible.includes(w));
  if (!usable(pool).length && !store.bag().left.length) {
    store.refillBag(BAG_WORDS.filter((w) => !input.taken.includes(w)));
    pool = store.bag().left.filter((w) => eligible.includes(w));
  }
  if (!usable(pool).length) pool = [...eligible];

  const m = met(store);
  const g = gates(store);
  const wordWeight = (w: string) => bankWeight(store, w, m, g) * store.shakiness('onsets', onsetOf(w));
  const rimeWeight = (r: string) => store.shakiness('rimes', r);
  const words: string[] = [];

  const first = usable(pool);
  if (first.length) {
    const rime = pickWeighted(first.map((f) => f.rime), rimeWeight, 1, rand)[0]!;
    words.push(...pickWeighted(inFamily(FAMILY_BY_RIME[rime]!, pool), wordWeight, Math.min(rules.perFamily, rules.rounds), rand));
    // Then a new family for the rest of the visit, from the bag if it can.
    const left = rules.rounds - words.length;
    if (left > 0) {
      const others = (p: string[]) => FAMILIES.filter((f) => f.rime !== rime && inFamily(f, p).length > 0);
      const from = others(pool).length ? pool : eligible.filter((w) => !words.includes(w));
      const next = others(from);
      if (next.length) {
        // A family with enough words for the rest comes first.
        const full = next.filter((f) => inFamily(f, from).length >= left);
        const choice = pickWeighted((full.length ? full : next).map((f) => f.rime), rimeWeight, 1, rand)[0]!;
        words.push(...pickWeighted(inFamily(FAMILY_BY_RIME[choice]!, from), wordWeight, left, rand));
      }
    }
  }

  return { mode: 'make', rounds: words.map((word) => ({ rime: rimeOf(word), word, onset: onsetOf(word), tiles: tilesFor(word, rules.tiles, rand) })) };
}

/** A visit's words, in order: what she builds, fetches and reads there. */
export function machineWords(plan: MachinePlan): string[] {
  return plan.rounds.map((r) => r.word);
}
