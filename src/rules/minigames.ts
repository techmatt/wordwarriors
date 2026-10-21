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
 * times how shaky the words it can give her are.
 *
 * A new minigame is one entry here: its scene, a weight, the slots it can
 * fill. Whatever it is, it must end in a key word she has read (the thing
 * fetched, or the counter), which the room's plan carries as `key` (and every
 * word read there as `fetches`); a non-sentence game brings its own plan
 * alongside, as the machine's `machine` (src/rules/sentences.ts `RoomPlan`).
 */

import { FAMILIES } from '../../content/phonics/families';
import { FRAMES } from '../../content/phonics/sentences';
import { BRIDGE, CHARGE, VARIETY, WORD_MACHINE } from '../config';
import { pickWeighted, type ProgressStore } from '../state/ProgressStore';
import type { Rand } from './bank';
import { bridgeShakiness } from './bridge';
import { soundShakiness } from './charge';

export type GameSlot = 'fetch' | 'counter';

export interface Minigame {
  /** Unique: `sentence:<frame>` for the sentence game in a frame. */
  id: string;
  /** The Phaser scene that plays it. */
  scene: string;
  /** Relative weight in the draw (1 is ordinary). */
  weight: number;
  /** Which rooms it can be: a fetch room, the secret counter room, or both. */
  slots: GameSlot[];
  /** For the sentence game: its frame (content/phonics/sentences.ts). */
  frame?: string;
  /** The word machine (item 026): its plan is the visit's words (src/rules/wordMachine.ts). */
  machine?: boolean;
  /** Charge the Spell (item 053): letter sounds said aloud, judged by Dad; its plan is the visit's runes (src/rules/charge.ts). */
  charge?: boolean;
  /** The Stretchy Bridge (item 054): words blended across stepping stones; its plan is the visit's words (src/rules/bridge.ts). */
  bridge?: boolean;
}

/** The sentence game in each of its frames: the pool before item 026, and the tests' default (`?games=sentence`). */
export const SENTENCE_GAMES: Minigame[] = FRAMES.map((f): Minigame => ({ id: `sentence:${f.id}`, scene: 'SentenceRoom', weight: 1, slots: [f.use], frame: f.id }));

/** The word machine: a fetch room only (the counter belongs to the villain's sentence). */
export const WORD_MACHINE_GAME: Minigame = { id: 'word_machine', scene: 'WordMachine', weight: WORD_MACHINE.weight, slots: ['fetch'], machine: true };

/**
 * Charge the Spell (item 053): a fetch room only. It reads no word, so it
 * fetches none; its runes become her hero's moves in the next battle. For the
 * beta it is forced into every episode (FORCE_PHONICS_ROOM, Episode.ts `roomGames`).
 */
export const CHARGE_GAME: Minigame = { id: 'charge', scene: 'ChargeRoom', weight: CHARGE.weight, slots: ['fetch'], charge: true };

/**
 * The Stretchy Bridge (item 054): a fetch room only. Every word she reads
 * across it is a battle item, like the machine's. For the beta it is one of
 * the two forced phonics rooms (FORCE_PHONICS_ROOM).
 */
export const BRIDGE_GAME: Minigame = { id: 'bridge', scene: 'BridgeRoom', weight: BRIDGE.weight, slots: ['fetch'], bridge: true };

/** The phonics games FORCE_PHONICS_ROOM puts in every episode, one of them, by weight. */
export const PHONICS_GAMES: Minigame[] = [CHARGE_GAME, BRIDGE_GAME];

/** The pool. */
export const MINIGAMES: Minigame[] = [...SENTENCE_GAMES, WORD_MACHINE_GAME, CHARGE_GAME, BRIDGE_GAME];

export const MINIGAME_BY_ID: Record<string, Minigame> = Object.fromEntries(MINIGAMES.map((g) => [g.id, g]));

/** How shaky her word families are, on average: the machine's lean, as a frame's shakiness is the sentence game's. */
function familyShakiness(store: ProgressStore): number {
  return FAMILIES.reduce((n, f) => n + store.shakiness('rimes', f.rime), 0) / Math.max(1, FAMILIES.length);
}

/**
 * The episode's three games: two different fetch games (doors a and b), then
 * the counter game. A sentence game's weight is scaled by its frame's
 * shakiness, the word machine's by her families'. A game she played in her
 * last episodes (the store's `games`) weighs VARIETY.gameWeight as much
 * (item 067), so the rooms rotate.
 */
export function drawGames(store: ProgressStore, rand: Rand = Math.random, pool: Minigame[] = MINIGAMES): [Minigame, Minigame, Minigame] {
  const recent = new Set(store.recentOf('games'));
  const weight = (id: string) => {
    const g = pool.find((m) => m.id === id)!;
    const lean = g.frame ? store.shakiness('frames', g.frame) : g.machine ? familyShakiness(store) : g.charge ? soundShakiness(store) : g.bridge ? bridgeShakiness(store) : 1;
    return g.weight * lean * (recent.has(id) ? VARIETY.gameWeight : 1);
  };
  const fits = (slot: GameSlot) => pool.filter((g) => g.slots.includes(slot)).map((g) => g.id);
  const fetch = pickWeighted(fits('fetch'), weight, 2, rand);
  const counter = pickWeighted(fits('counter').filter((id) => !fetch.includes(id)), weight, 1, rand);
  const byId = (id: string) => pool.find((g) => g.id === id)!;
  if (fetch.length < 2 || counter.length < 1) throw new Error('minigames: the pool cannot fill the rooms');
  return [byId(fetch[0]!), byId(fetch[1]!), byId(counter[0]!)];
}
