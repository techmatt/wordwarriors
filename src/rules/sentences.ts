/**
 * Choosing the sentences for an episode, and when a frame is solid. Pure:
 * no Phaser, unit-tested.
 *
 * Fetch rooms get two different fetch frames and two different key words,
 * weighted toward shaky frames and words. The counter room gets the
 * villain's own counter sentence. Each room shows three objects: the key
 * word's picture and two other picture words.
 */

import { CHARACTER_BY_ID } from '../../content/battle/roster';
import { CVC_WORDS } from '../../content/phonics/words';
import { FETCH_ITEMS, FRAMES, sentence, type Fill, type Sentence } from '../../content/phonics/sentences';
import { SENTENCE_SOLID } from '../config';
import { pickWeighted, type ProgressStore } from '../state/ProgressStore';

export type Rand = () => number;

export interface RoomPlan {
  /** `a` and `b` are the hub's two side-room doors; `counter` is the attic. */
  slot: 'a' | 'b' | 'counter';
  /** SIDE_ROOMS id. */
  room: string;
  sentence: Sentence;
  /** The three objects in the room (key word included), in left-to-right order. */
  objects: string[];
}

/** Two picture words that are not the key word, for the room's other objects. */
export function distractors(key: string, rand: Rand = Math.random, n = 2): string[] {
  const pool = CVC_WORDS.map((w) => w.word).filter((w) => w !== key);
  return pickWeighted(pool, () => 1, n, rand);
}

function objectsFor(key: string, rand: Rand): string[] {
  const all = [key, ...distractors(key, rand)];
  // Shuffle so the answer is not always in the same place.
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all;
}

/** The two fetch rooms' plans: distinct frames, distinct key words, weighted toward shaky ones. */
export function fetchPlans(store: ProgressStore, fill: Fill, rooms: [string, string], rand: Rand = Math.random): [RoomPlan, RoomPlan] {
  const frames = pickWeighted(
    FRAMES.filter((f) => f.use === 'fetch').map((f) => f.id),
    (id) => store.shakiness('frames', id),
    2,
    rand,
  );
  const words = pickWeighted(
    FETCH_ITEMS.map((i) => i.word),
    (w) => store.shakiness('words', w),
    2,
    rand,
  );
  const plan = (i: 0 | 1, slot: 'a' | 'b'): RoomPlan => ({
    slot,
    room: rooms[i],
    sentence: sentence(frames[i]!, fill, words[i]!),
    objects: objectsFor(words[i]!, rand),
  });
  return [plan(0, 'a'), plan(1, 'b')];
}

/** The counter room's plan: the villain's counter sentence. */
export function counterPlan(fill: Fill, room: string, rand: Rand = Math.random): RoomPlan {
  const counter = CHARACTER_BY_ID[fill.villain]!.counter;
  return { slot: 'counter', room, sentence: sentence(counter.frame, fill, counter.word), objects: objectsFor(counter.word, rand) };
}

/** A solid frame skips the listening pass (SENTENCE_SOLID in config). */
export function frameIsSolid(store: ProgressStore, frameId: string, rule = SENTENCE_SOLID): boolean {
  const s = store.stat('frames', frameId);
  if (s.seen < rule.tries) return false;
  const last = s.recent.slice(-rule.lastRight);
  return last.length === rule.lastRight && last.every(Boolean);
}
