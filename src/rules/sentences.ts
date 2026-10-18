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
import { FETCH_ITEMS, FRAMES, lookalikesOf, sentence, tokenWord, type Fill, type Sentence } from '../../content/phonics/sentences';
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

/**
 * Two picture words for the room's other objects: not the key word, not a
 * look-alike of it (LOOKALIKES), and nothing in `avoid` (the sentence's own
 * words, so no CAN picture under WE CAN USE THE; the taught spell).
 */
export function distractors(key: string, rand: Rand = Math.random, n = 2, avoid: string[] = []): string[] {
  const banned = new Set([key, ...lookalikesOf(key), ...avoid]);
  const pool = CVC_WORDS.map((w) => w.word).filter((w) => !banned.has(w));
  return pickWeighted(pool, () => 1, n, rand);
}

function objectsFor(s: Sentence, rand: Rand, avoid: string[]): string[] {
  const key = s.key;
  const all = [key, ...distractors(key, rand, 2, [...avoid, ...s.tokens.map(tokenWord)])];
  // Shuffle so the answer is not always in the same place.
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all;
}

/**
 * The two fetch rooms' plans: distinct frames, distinct key words, weighted
 * toward shaky ones. A key word is never in `avoid` (the episode passes the
 * taught spell and the villain's counter word, both heard or due elsewhere)
 * and never a word its own sentence already shows (its frame or a filled name),
 * because the prefix line would say it before she reads it.
 */
export function fetchPlans(
  store: ProgressStore,
  fill: Fill,
  rooms: [string, string],
  rand: Rand = Math.random,
  avoid: string[] = [],
): [RoomPlan, RoomPlan] {
  const frames = pickWeighted(
    FRAMES.filter((f) => f.use === 'fetch').map((f) => f.id),
    (id) => store.shakiness('frames', id),
    2,
    rand,
  );
  const words: string[] = [];
  for (const frame of frames) {
    const shown = new Set(sentence(frame, fill, 'x').tokens.slice(0, -1).map(tokenWord));
    const pool = FETCH_ITEMS.map((i) => i.word).filter((w) => !avoid.includes(w) && !shown.has(w) && !words.includes(w));
    words.push(pickWeighted(pool, (w) => store.shakiness('words', w), 1, rand)[0]!);
  }
  const plan = (i: 0 | 1, slot: 'a' | 'b'): RoomPlan => {
    const s = sentence(frames[i]!, fill, words[i]!);
    return { slot, room: rooms[i], sentence: s, objects: objectsFor(s, rand, avoid) };
  };
  return [plan(0, 'a'), plan(1, 'b')];
}

/** The counter room's plan: the villain's counter sentence. `avoid` keeps words (the spell) out of its other objects. */
export function counterPlan(fill: Fill, room: string, rand: Rand = Math.random, avoid: string[] = []): RoomPlan {
  const counter = CHARACTER_BY_ID[fill.villain]!.counter;
  const s = sentence(counter.frame, fill, counter.word);
  return { slot: 'counter', room, sentence: s, objects: objectsFor(s, rand, avoid) };
}

/** A solid frame skips the listening pass (SENTENCE_SOLID in config). */
export function frameIsSolid(store: ProgressStore, frameId: string, rule = SENTENCE_SOLID): boolean {
  const s = store.stat('frames', frameId);
  if (s.seen < rule.tries) return false;
  const last = s.recent.slice(-rule.lastRight);
  return last.length === rule.lastRight && last.every(Boolean);
}
