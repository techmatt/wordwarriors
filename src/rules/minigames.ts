/**
 * The rooms' minigames (item 025): a weighted pool each episode samples from,
 * apart from the quest, so any game is played in any place. Pure.
 *
 * Each of an episode's three rooms (doors a and b fetch a battle item; the
 * secret room's game fetches the counter) draws one entry that fits its slot,
 * weighted, and no entry comes up twice in an episode. The entries are the
 * sentence game in each of its frames, its weight times how shaky that frame
 * is (so a frame she keeps missing comes back sooner, as before), and the word
 * machine (item 026, fetch rooms only), times how shaky her word families are,
 * and Charge the Spell (item 053, fetch rooms only), times how shaky her
 * letter sounds are, and the Stretchy Bridge (item 054, fetch rooms only),
 * times how shaky the words it can give her are, and the Shape-Shifter (item
 * 096, fetch rooms only), times how shaky the words its chains can use are.
 *
 * A new minigame is one entry here: its kind, its scene, a weight, the
 * slots it can fill. A new kind is also a `MinigameKind`, its lean here
 * (`LEAN`), its planner and its room plan (src/rules/sentences.ts `PLANNERS`
 * and `RoomPlan`; `PLAN_ORDER` if it plans words of its own). Whatever it
 * is, it must end in a key word she has read (the thing fetched, or the
 * counter), which the room's plan carries as `key` (and every word read
 * there as `fetches`); a non-sentence game brings its own plan alongside, as
 * the machine's `machine`.
 */

import { FAMILIES } from '../../content/phonics/families';
import { FRAMES } from '../../content/phonics/sentences';
import { BRIDGE, CHARGE, SHIFTER, VARIETY, WORD_MACHINE } from '../config';
import type { ProgressStore } from '../state/ProgressStore';
import { pickWeighted, type Rand } from './random';
import { bridgeShakiness } from './bridge';
import { soundShakiness } from './charge';
import { shifterShakiness } from './shifter';

export type GameSlot = 'fetch' | 'counter';

/**
 * What a minigame is: the sentence game (in one of its frames), the word
 * machine (item 026), Charge the Spell (item 053) or the Stretchy Bridge
 * (item 054) or the Shape-Shifter (item 096). The room's plan carries the
 * same kind (`RoomPlan`).
 */
export type MinigameKind = 'sentence' | 'machine' | 'charge' | 'bridge' | 'shifter';

export interface Minigame {
  /** Unique: `sentence:<frame>` for the sentence game in a frame. */
  id: string;
  /** What it is: each kind has its lean here and its planner (src/rules/sentences.ts `PLANNERS`). */
  kind: MinigameKind;
  /** The Phaser scene that plays it. */
  scene: string;
  /** Relative weight in the draw (1 is ordinary). */
  weight: number;
  /** Which rooms it can be: a fetch room, the secret counter room, or both. */
  slots: GameSlot[];
  /** For the sentence game: its frame (content/phonics/sentences.ts). */
  frame?: string;
}

/** The sentence game in each of its frames: the pool before item 026, and the tests' default (`?games=sentence`). */
export const SENTENCE_GAMES: Minigame[] = FRAMES.map((f): Minigame => ({ id: `sentence:${f.id}`, kind: 'sentence', scene: 'SentenceRoom', weight: 1, slots: [f.use], frame: f.id }));

/** The word machine: a fetch room only (the counter belongs to the villain's sentence); its plan is the visit's words (src/rules/wordMachine.ts). */
export const WORD_MACHINE_GAME: Minigame = { id: 'word_machine', kind: 'machine', scene: 'WordMachine', weight: WORD_MACHINE.weight, slots: ['fetch'] };

/**
 * Charge the Spell (item 053): a fetch room only. One word a visit, each
 * rune's sound said back, then the word read aloud, judged by Dad (its plan:
 * the word and runes, src/rules/charge.ts); the word is a battle item
 * (fetched, item 058) and its runes fire in the next battle. For the beta it is one of the phonics games, one of which is
 * forced per episode (FORCE_PHONICS_ROOM, src/episode/plans.ts `roomGames`).
 */
export const CHARGE_GAME: Minigame = { id: 'charge', kind: 'charge', scene: 'ChargeRoom', weight: CHARGE.weight, slots: ['fetch'] };

/**
 * The Stretchy Bridge (item 054): a fetch room only. Words blended across
 * stepping stones (its plan: src/rules/bridge.ts); every word she reads
 * across it is a battle item, like the machine's. For the beta it is one of
 * the phonics games, one of which is forced per episode (FORCE_PHONICS_ROOM).
 */
export const BRIDGE_GAME: Minigame = { id: 'bridge', kind: 'bridge', scene: 'BridgeRoom', weight: BRIDGE.weight, slots: ['fetch'] };

/**
 * The Shape-Shifter (item 096): a fetch room only. The villain's spell walks
 * a creature down a chain of words, one letter changed a link; she reads each
 * link, walking and green only (its plan: src/rules/shifter.ts). Every word
 * she reads there is a battle item, the last creature among them. For the
 * beta it is behind door b of about half the episodes (SHIFTER_ROOM, item
 * 126, src/episode/plans.ts `roomGames`).
 */
export const SHIFTER_GAME: Minigame = { id: 'shifter', kind: 'shifter', scene: 'ShifterRoom', weight: SHIFTER.weight, slots: ['fetch'] };

/** The phonics games FORCE_PHONICS_ROOM puts in every episode, one of them, by weight. */
export const PHONICS_GAMES: Minigame[] = [CHARGE_GAME, BRIDGE_GAME];

/** The pool. */
export const MINIGAMES: Minigame[] = [...SENTENCE_GAMES, WORD_MACHINE_GAME, CHARGE_GAME, BRIDGE_GAME, SHIFTER_GAME];

export const MINIGAME_BY_ID: Record<string, Minigame> = Object.fromEntries(MINIGAMES.map((g) => [g.id, g]));

/** How shaky her word families are, on average: the machine's lean, as a frame's shakiness is the sentence game's. */
function familyShakiness(store: ProgressStore): number {
  return FAMILIES.reduce((n, f) => n + store.shakiness('rimes', f.rime), 0) / Math.max(1, FAMILIES.length);
}

/**
 * How much a game's kind leans its weight toward what she finds shaky: a
 * sentence game by its frame, the word machine by her word families, Charge
 * the Spell by her letter sounds, the Stretchy Bridge by its words, the
 * Shape-Shifter by the words its chains can use.
 */
const LEAN: Record<MinigameKind, (store: ProgressStore, g: Minigame) => number> = {
  sentence: (store, g) => store.shakiness('frames', g.frame!),
  machine: familyShakiness,
  charge: soundShakiness,
  bridge: bridgeShakiness,
  shifter: shifterShakiness,
};

/**
 * The episode's three games: two different fetch games (doors a and b), then
 * the counter game. A game's weight is scaled by its kind's lean (`LEAN`).
 * A game she played in her last episodes (the store's `games`) weighs
 * VARIETY.gameWeight as much (item 067), so the rooms rotate.
 */
export function drawGames(store: ProgressStore, rand: Rand = Math.random, pool: Minigame[] = MINIGAMES): [Minigame, Minigame, Minigame] {
  const recent = new Set(store.recentOf('games'));
  const weight = (id: string) => {
    const g = pool.find((m) => m.id === id)!;
    return g.weight * LEAN[g.kind](store, g) * (recent.has(id) ? VARIETY.gameWeight : 1);
  };
  const fits = (slot: GameSlot) => pool.filter((g) => g.slots.includes(slot)).map((g) => g.id);
  const fetch = pickWeighted(fits('fetch'), weight, 2, rand);
  const counter = pickWeighted(fits('counter').filter((id) => !fetch.includes(id)), weight, 1, rand);
  const byId = (id: string) => pool.find((g) => g.id === id)!;
  if (fetch.length < 2 || counter.length < 1) throw new Error('minigames: the pool cannot fill the rooms');
  return [byId(fetch[0]!), byId(fetch[1]!), byId(counter[0]!)];
}
