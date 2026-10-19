/**
 * The rooms' minigames (item 025): a weighted pool each episode samples from,
 * apart from the quest, so any game is played in any place. Pure.
 *
 * Each of an episode's three rooms (doors a and b fetch a battle item; the
 * secret room's game fetches the counter) draws one entry that fits its slot,
 * weighted, and no entry comes up twice in an episode. Today every entry is
 * the sentence game in one of its frames, its weight times how shaky that
 * frame is (so a frame she keeps missing comes back sooner, as before).
 *
 * A new minigame is one entry here: its scene, a weight, the slots it can
 * fill. Whatever it is, it must end in a key word she has read (the thing
 * fetched, or the counter), which the room's plan carries as `sentence.key`
 * today; a non-sentence game brings its own plan alongside (the word machine
 * is next).
 */

import { FRAMES } from '../../content/phonics/sentences';
import { pickWeighted, type ProgressStore } from '../state/ProgressStore';
import type { Rand } from './sentences';

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
}

/** The pool. */
export const MINIGAMES: Minigame[] = [
  ...FRAMES.map((f): Minigame => ({ id: `sentence:${f.id}`, scene: 'SentenceRoom', weight: 1, slots: [f.use], frame: f.id })),
];

export const MINIGAME_BY_ID: Record<string, Minigame> = Object.fromEntries(MINIGAMES.map((g) => [g.id, g]));

/**
 * The episode's three games: two different fetch games (doors a and b), then
 * the counter game. A sentence game's weight is scaled by its frame's
 * shakiness.
 */
export function drawGames(store: ProgressStore, rand: Rand = Math.random, pool: Minigame[] = MINIGAMES): [Minigame, Minigame, Minigame] {
  const weight = (id: string) => {
    const g = pool.find((m) => m.id === id)!;
    return g.weight * (g.frame ? store.shakiness('frames', g.frame) : 1);
  };
  const fits = (slot: GameSlot) => pool.filter((g) => g.slots.includes(slot)).map((g) => g.id);
  const fetch = pickWeighted(fits('fetch'), weight, 2, rand);
  const counter = pickWeighted(fits('counter').filter((id) => !fetch.includes(id)), weight, 1, rand);
  const byId = (id: string) => pool.find((g) => g.id === id)!;
  if (fetch.length < 2 || counter.length < 1) throw new Error('minigames: the pool cannot fill the rooms');
  return [byId(fetch[0]!), byId(fetch[1]!), byId(counter[0]!)];
}
