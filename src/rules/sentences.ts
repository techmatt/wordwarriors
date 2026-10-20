/**
 * Choosing the sentences for an episode, and when a frame is solid. Pure:
 * no Phaser, unit-tested.
 *
 * Item 015: the episode picks its three frames first (two different fetch
 * frames for the side rooms, one counter frame for the attic, each weighted
 * toward shaky frames), then draws three different key words from her word
 * bag (ProgressStore `bag`): without replacement across episodes, weighted
 * toward shaky words. The counter word is drawn like the others, so any
 * pictured word can beat any villain. Each room shows three objects: the
 * key word's picture and two other picture words.
 *
 * Item 037: the bag is every pictured word of the word bank
 * (content/phonics/bank.ts), and every draw weighs a word through
 * src/rules/bank.ts (shakiness x coverage x level gate), so key words spread
 * over the vowels and first sounds, and blends come in as CVC firms up. The
 * room's other pictures are chosen for reading (`distractorsFor`): another
 * first letter while the key word is new, one sharing its first sound or
 * rime once it is firm. No key word is on any of the episode's move pads
 * (`moveWords`): a right answer never comes twice in an episode.
 *
 * A key word is never spoken or shown before its room asks for it, so the
 * draw keeps out every word the episode says or shows earlier: its sentences'
 * own frame words and names, the taught spell, and everything the hero, ally
 * and villain say or show (`saidEarly`). The counter word also keeps out the
 * words on battle 1's move pads (planned up front, src/rules/moves.ts) and the
 * episode's fetch words (battle 1's item banners).
 */

import { CHARACTER_BY_ID, MINIONS, comboPart } from '../../content/battle/roster';
import type { FighterSpec } from '../../content/battle/types';
import { FETCH_ITEMS, lookalikesOf, sentence, tokenWord, type Fill, type Sentence } from '../../content/phonics/sentences';
import { ACTIONS, THINGS } from '../../content/phonics/bank';
import { MINIGAMES, drawGames, type Minigame } from './minigames';
import { machineWords, planMachine, type MachinePlan } from './wordMachine';
import { SENTENCE_SOLID } from '../config';
import type { ProgressStore } from '../state/ProgressStore';
import { distractorsFor, drawWords, openWords, withStems } from './bank';

export type Rand = () => number;

interface PlanBase {
  /** `a` and `b` are the hub's two side-room doors; `counter` is the attic. */
  slot: 'a' | 'b' | 'counter';
  /** Side room id (content/house/house.ts SIDE_ROOM_BY_ID): the house's or the quest place's. */
  room: string;
  /** The minigame played there (src/rules/minigames.ts) and its scene. */
  game: string;
  scene: string;
  /** The word the room ends in: its prize (the picture on the hub door), the counter in the attic. */
  key: string;
  /** Every word she reads there, in order, `key` last: from a fetch room, each is a battle item. */
  fetches: string[];
}

/** The sentence game's room. */
export interface SentencePlan extends PlanBase {
  kind: 'sentence';
  sentence: Sentence;
  /** The three objects in the room (key word included), in left-to-right order. */
  objects: string[];
}

/** The word machine's room (item 026): the words it builds, `fetches`, in its plan's rounds. */
export interface MachineRoomPlan extends PlanBase {
  kind: 'machine';
  machine: MachinePlan;
}

export type RoomPlan = SentencePlan | MachineRoomPlan;

/** Every word the bag holds: the bank's pictured words (item 037: CVC, blends and digraphs). */
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

/** The bank's action words: kept out of the key words when the episode's own move pads are not given. */
const ACTION_WORDS: string[] = ACTIONS.map((w) => w.word);

/** Words a side room can fetch (each has a battle item). */
const FETCHABLE = new Set(FETCH_ITEMS.map((i) => i.word));

/**
 * How much more likely the villain's own named counter word is than any
 * other, when it is in the bag: the named items (Evil Tiamat's Magic Hat
 * swallowing her storm) are the best-staged defeats, so they come up a bit
 * more often, without breaking the bag.
 */
export const NAMED_COUNTER_BOOST = 3;

/**
 * Two picture words for the room's other objects: not the key word, not a
 * look-alike of it (LOOKALIKES), and nothing in `avoid` (the sentence's own
 * words, so no CAN picture under WE CAN USE THE; the gift word; the
 * episode's other key words). Chosen for reading (`distractorsFor`): while
 * the key word is new neither starts with its first letter, her strongest
 * clue and all the hint gives for a non-decodable word (no MAP beside the
 * MOP); once it is firm one shares its first sound or its rime (CAT beside
 * HAT), so the first letter is not enough. If a rule leaves too few, it gives way.
 */
export function distractors(store: ProgressStore, key: string, rand: Rand = Math.random, n = 2, avoid: string[] = []): string[] {
  return distractorsFor(store, key, BAG_WORDS, n, rand, [...lookalikesOf(key), ...avoid]);
}

function objectsFor(store: ProgressStore, s: Sentence, rand: Rand, avoid: string[]): string[] {
  const key = s.key;
  const all = [key, ...distractors(store, key, rand, 2, [...avoid, ...s.tokens.map(tokenWord)])];
  // Shuffle so the answer is not always in the same place.
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all;
}

export function wordsOf(s: string | undefined): string[] {
  return (s ?? '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
}

/** Everything one fighter says or shows: names, ability and ultimate banners, taunts, minion names. */
function fighterWords(f: FighterSpec): string[] {
  const out = [f.displayName, f.sayName, f.ultimate.name, ...f.abilities.flatMap((a) => [a.name, a.callout])];
  for (const t of f.taunts) out.push(t.text, t.say);
  for (const a of [...f.abilities, f.ultimate]) if (a.minion) out.push(MINIONS[a.minion]?.name);
  return out.flatMap(wordsOf);
}

/**
 * Every word the episode's own characters say or show before the attic: the
 * hero's and ally's (good) and the villain's (evil) names, abilities,
 * ultimates, taunts and minions, the villain's wake-up threat, and the hero
 * and ally's combo. A key word is never one of these.
 */
export function saidEarly(cast: { hero: string; ally: string | null; villain: string; helper: string }): string[] {
  const out = new Set<string>();
  const add = (ws: string[]) => ws.forEach((w) => out.add(w));
  for (const id of new Set([cast.hero, cast.helper, ...(cast.ally ? [cast.ally] : [])])) {
    const c = CHARACTER_BY_ID[id];
    if (c) add(fighterWords(c.good));
  }
  const v = CHARACTER_BY_ID[cast.villain];
  if (v) {
    add(fighterWords(v.evil));
    add(wordsOf(v.house.threat));
    add(wordsOf(v.house.threatSay));
  }
  if (cast.ally) for (const [a, b] of [[cast.hero, cast.ally], [cast.ally, cast.hero]] as const) add(wordsOf(comboPart(a, b).name));
  return [...out];
}

/**
 * Draw one key word from the bag: an `eligible` word still in it, weighted
 * by `wordWeight` (shakiness x coverage x level gate, src/rules/bank.ts)
 * times `boost`. When no eligible word is left, the bag
 * refills (a new round) with every bag word except `keepOut` (this episode's
 * words so far, so they do not open the new round too). It falls back to
 * any eligible word only if even a full bag has none.
 *
 * Drawing does not spend the word: it leaves the bag only when she reads it
 * right first time (SentenceRoom calls `takeFromBag`), so an episode she
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
  const ok = new Set(eligible);
  const open = openWords(store);
  store.topUpBag(BAG_WORDS, LEGACY_BAG_WORDS);
  // A bag left with only words of a shut level counts as spent (item 039).
  let pool = store.bag().left.filter((w) => ok.has(w));
  if (!pool.some(open)) {
    store.refillBag(BAG_WORDS.filter((w) => !keepOut.includes(w)));
    pool = store.bag().left.filter((w) => ok.has(w));
  }
  if (!pool.some(open) && eligible.some(open)) pool = eligible.filter(open);
  if (!pool.length) pool = [...eligible];
  return drawWords(store, pool, 1, rand, boost)[0]!;
}

export interface EpisodeInput {
  fill: Fill;
  /** The ally, or null (the helper is then the narrator). */
  ally: string | null;
  /** The hub's gift word (an action word): said before any room, so never a key word. */
  spell: string;
  /** The two side rooms (SIDE_ROOMS ids) for doors a and b, and the attic. */
  rooms: [string, string];
  counterRoom: string;
  /**
   * Every word battle 1's move pads show (`battle1Words`), kept out of the
   * counter draw.
   */
  battle1Moves?: string[];
  /**
   * Every word on any move pad this episode, both battles (item 037): no room
   * key word is one of them, so a right answer never comes twice. A `both`
   * word (NET) can be either, never both in one episode. Without it, every
   * action word of the bank is kept out.
   */
  moveWords?: string[];
  /** The rooms' games, a, b and counter (`drawGames`); drawn here when not given. */
  games?: [Minigame, Minigame, Minigame];
  /** The pool `games` is drawn from when not given (default: every minigame). */
  pool?: Minigame[];
  /** Words said before any room besides the cast's own (the quest's setup line): never key words. */
  saidBefore?: string[];
}

/**
 * The episode's three room plans: fetch rooms a and b, then the attic's
 * counter sentence. Draws three words from the bag (spent as she reads them).
 */
export function episodePlans(store: ProgressStore, input: EpisodeInput, rand: Rand = Math.random): [RoomPlan, RoomPlan, RoomPlan] {
  const { fill, spell } = input;
  // The rooms' games come from the minigame pool (item 025); each sentence game is a frame.
  const games = [...(input.games ?? drawGames(store, rand, input.pool))] as [Minigame, Minigame, Minigame];
  if (games[2].machine) throw new Error('episodePlans: the word machine is a fetch room, not the counter');
  const frames = games.map((g) => {
    if (!g.frame && !g.machine) throw new Error(`episodePlans: ${g.id} is neither a sentence game nor the word machine`);
    return g.frame;
  });

  // Every word any of the sentences shows besides its key word: she reads
  // them (and hears them on green) in every room, so none is a key word.
  const shown = frames.flatMap((f) => (f ? sentence(f, fill, 'x').tokens.slice(0, -1).map(tokenWord) : []));
  const avoid = new Set(withStems([spell, ...shown, ...(input.saidBefore ?? []), ...saidEarly({ hero: fill.hero, ally: input.ally, villain: fill.villain, helper: fill.helper })]));

  // The word machine builds several words (item 026): they are planned first,
  // so the sentence rooms and the counter keep clear of all of them.
  // The episode's move pads, and battle 1's (kept out of the counter since item 009):
  // no room's word, the machine's included, is one of them.
  const moves = new Set<string>([...(input.moveWords ?? ACTION_WORDS), ...(input.battle1Moves ?? [])]);
  const machines: (MachinePlan | null)[] = games.map((g) => (g.machine ? planMachine(store, { avoid: [...avoid, ...moves], taken: [] }, rand) : null));
  machines.forEach((m, i) => {
    if (!m || m.rounds.length) return;
    // No family has two words this episode can use (it never happens with
    // today's words): that room plays a sentence game instead.
    const spare = (input.pool ?? MINIGAMES).find((g) => g.frame && g.slots.includes('fetch') && !games.includes(g))!;
    games[i] = spare;
    frames[i] = spare.frame;
    machines[i] = null;
    for (const t of sentence(spare.frame!, fill, 'x').tokens.slice(0, -1)) avoid.add(tokenWord(t));
  });
  const taken = machines.flatMap((m) => (m ? machineWords(m) : []));

  // A frame ending "...A {x}" takes no word starting with a vowel: no WE NEED A ANT (item 039).
  const fits = (i: number) => {
    const f = frames[i];
    const article = f ? tokenWord(sentence(f, fill, 'x').tokens.at(-2) ?? '') : '';
    return (w: string) => article !== 'a' || !/^[aeiou]/.test(w);
  };
  const keys: string[] = [];
  for (let i = 0; i < 2; i++) {
    const m = machines[i];
    if (m) {
      keys.push(machineWords(m).at(-1) ?? '');
      continue;
    }
    const eligible = BAG_WORDS.filter((w) => FETCHABLE.has(w) && !avoid.has(w) && !moves.has(w) && !keys.includes(w) && !taken.includes(w)).filter(fits(i));
    keys.push(drawKey(store, eligible, rand, [...keys, ...taken]));
  }
  // The counter: not a word on battle 1's move pads, not a word fetched this
  // episode (battle 1 shouts THE NET!).
  const named = CHARACTER_BY_ID[fill.villain]?.counter.word;
  const eligible = BAG_WORDS.filter((w) => !avoid.has(w) && !moves.has(w) && !keys.includes(w) && !taken.includes(w)).filter(fits(2));
  keys.push(drawKey(store, eligible, rand, [...keys, ...taken], (w) => (w === named ? NAMED_COUNTER_BOOST : 1)));

  const slots = ['a', 'b', 'counter'] as const;
  const roomIds = [input.rooms[0], input.rooms[1], input.counterRoom];
  return slots.map((slot, i): RoomPlan => {
    const base = { slot, room: roomIds[i]!, game: games[i]!.id, scene: games[i]!.scene, key: keys[i]! };
    const m = machines[i];
    if (m) return { ...base, kind: 'machine', machine: m, fetches: machineWords(m) };
    const s = sentence(frames[i]!, fill, keys[i]!);
    // No room offers the spell or another of the episode's key words as a wrong picture.
    const others = [spell, ...keys.filter((k) => k !== keys[i]), ...taken];
    return { ...base, kind: 'sentence', fetches: [keys[i]!], sentence: s, objects: objectsFor(store, s, rand, others) };
  }) as [RoomPlan, RoomPlan, RoomPlan];
}

/** A sentence room's plan, for code that only runs in one (the sentence room, its tests). */
export function asSentence(plan: RoomPlan): SentencePlan {
  if (plan.kind !== 'sentence') throw new Error(`room ${plan.slot} plays ${plan.game}, not the sentence game`);
  return plan;
}

/** A solid frame skips the listening pass (SENTENCE_SOLID in config). */
export function frameIsSolid(store: ProgressStore, frameId: string, rule = SENTENCE_SOLID): boolean {
  const s = store.stat('frames', frameId);
  if (s.seen < rule.tries) return false;
  const last = s.recent.slice(-rule.lastRight);
  return last.length === rule.lastRight && last.every(Boolean);
}
