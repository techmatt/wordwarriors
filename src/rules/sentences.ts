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
 * src/rules/bank.ts (shakiness x coverage x recency), so key words spread
 * over the vowels and first sounds; every word is in play (item 067). The
 * room's other pictures are chosen for reading (`distractorsFor`): another
 * first letter while the key word is new, one sharing its first sound or
 * rime once it is firm. No key word is on any of the episode's move pads
 * (`moveWords`): a right answer never comes twice in an episode.
 *
 * A key word is never spoken or shown before its room asks for it, so the
 * draw keeps out every word the episode says or shows earlier: its sentences'
 * own frame words and names, the gift word, and everything the hero, ally
 * and villain say or show (`saidEarly`). The counter word also keeps out the
 * words on battle 1's move pads (planned up front, src/rules/moves.ts) and the
 * episode's fetch words (battle 1's item banners).
 */

import { CHARACTER_BY_ID, MINIONS, comboPart } from '../../content/battle/roster';
import type { FighterSpec } from '../../content/battle/types';
import { FETCH_ITEMS, lookalikesOf, sentence, tokenWord, type Fill, type Sentence } from '../../content/phonics/sentences';
import { ACTIONS, THINGS } from '../../content/phonics/bank';
import { MINIGAMES, drawGames, type Minigame, type MinigameKind } from './minigames';
import { machineWords, planMachine, type MachinePlan } from './wordMachine';
import { gestureWords, planCharge, type ChargePlan } from './charge';
import { bridgeShown, bridgeWords, planBridge, type BridgePlan } from './bridge';
import { SENTENCE_SOLID } from '../config';
import type { ProgressStore } from '../state/ProgressStore';
import { distractorsFor, drawFromBag, withStems } from './bank';
import { shuffle, type Rand } from './random';
import { rampsAdvance } from './difficulty';

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

/**
 * Charge the Spell's room (item 053): the visit's word and its runes (item
 * 058). `key` and `fetches` are the word, a battle item; the runes go to the
 * battle as `episode.charged`.
 */
export interface ChargeRoomPlan extends PlanBase {
  kind: 'charge';
  charge: ChargePlan;
}

/** The Stretchy Bridge's room (item 054): the words it crosses, `fetches`, in its plan's rounds. */
export interface BridgeRoomPlan extends PlanBase {
  kind: 'bridge';
  bridge: BridgePlan;
}

export type RoomPlan = SentencePlan | MachineRoomPlan | ChargeRoomPlan | BridgeRoomPlan;

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
 * more often, without breaking the bag. Item 067 doubled the pool (every
 * level in play, 109 pictured words where 51 were open), so 3 became 6 to
 * keep the same share.
 */
export const NAMED_COUNTER_BOOST = 6;

/** Bank things that take no "A" (some, not one): never the key word of a "...A {x}" frame (item 069; GUM item 092). */
export const NO_ARTICLE = new Set(['cheese', 'milk', 'jam', 'grass', 'chips', 'gum']);

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
  // Shuffled so the answer is not always in the same place.
  return shuffle([key, ...distractors(store, key, rand, 2, [...avoid, ...s.tokens.map(tokenWord)])], rand);
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
  // The combo's name: with no ally the helper steps in for it (BattleScene.combo), so its name is said too (item 069).
  const partner = cast.ally ?? cast.helper;
  for (const [a, b] of [[cast.hero, partner], [partner, cast.hero]] as const) add(wordsOf(comboPart(a, b).name));
  return [...out];
}

/**
 * Draw one key word from the bag: an `eligible` word still in it, weighted
 * by `wordWeight` (shakiness x coverage x recency, src/rules/bank.ts)
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
  store.topUpBag(BAG_WORDS, LEGACY_BAG_WORDS);
  return drawFromBag(store, 'keys', BAG_WORDS, eligible, rand, keepOut, boost);
}

export interface EpisodeInput {
  fill: Fill;
  /** The ally, or null (the helper is then the narrator). */
  ally: string | null;
  /** The hub's gift word (an action word): said before any room, so never a key word. */
  gift: string;
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

/** What the planners share while an episode's rooms are planned (`episodePlans`). */
interface PlanContext {
  store: ProgressStore;
  rand: Rand;
  fill: Fill;
  gift: string;
  /** Words no room's own words or key may be: said or shown before the rooms (stemmed), each frame's shown words, Charge's gestures. */
  avoid: Set<string>;
  /** The episode's move pads, both battles, and battle 1's (kept out of the counter since item 009). */
  moves: Set<string>;
  /** The villain's own named counter word (HAT for Evil Tiamat), if any: the attic's to draw. */
  named: string[];
  /** Every word the rooms planned so far read (each a battle item), in planning order. */
  taken: string[];
  /** Every picture the rooms planned so far show (the bridge's far banks). */
  pictured: string[];
}

type RoomBase = Omit<PlanBase, 'fetches'>;

/**
 * How a kind with words of its own plans its room (the word machine, the
 * bridge, Charge the Spell): before any key is drawn, kept clear of the rooms
 * planned before it, its key the last word it reads, so a fetch room only.
 */
interface OwnWordsPlanner<P> {
  /** The room's own words; null when it cannot this episode (a sentence game plays instead). */
  plan(ctx: PlanContext, g: Minigame): P | null;
  /** Every word read there, in order, its key last. */
  reads(plan: P): string[];
  /** The pictures it shows: no other room's key word. */
  pictures?(plan: P): string[];
  /** Words it says along the way: no key word drawn after it. */
  says?(plan: P): string[];
  room(base: RoomBase, plan: P): RoomPlan;
}

/** How a kind that draws its key from the bag plans its room (the sentence game). */
interface KeyPlanner {
  /** Words it shows besides its key word, in every room (a frame's own words): never a key word. */
  shows(g: Minigame, fill: Fill): string[];
  room(base: RoomBase, ctx: PlanContext & { keys: string[]; game: Minigame }): RoomPlan;
}

type KindPlanner = OwnWordsPlanner<unknown> | KeyPlanner;

// The word machine builds several words (item 026): no room's word, its own included, is a move pad.
// Nor the villain's own named counter word, so the attic can still draw it (item 092: Evil Tiamat's
// machine built HAT and the Magic Hat never came), as the bridge and Charge keep it.
const MACHINE: OwnWordsPlanner<MachinePlan> = {
  plan: (ctx) => {
    const m = planMachine(ctx.store, { avoid: [...ctx.avoid, ...ctx.moves, ...ctx.named] }, ctx.rand);
    // No family has two words this episode can use (it never happens with today's words).
    return m.rounds.length ? m : null;
  },
  reads: machineWords,
  room: (base, m) => ({ ...base, kind: 'machine', machine: m, fetches: machineWords(m) }),
};

// The Stretchy Bridge (item 054) reads several words too; its far-bank
// pictures are shown, so no room's key word is one of them. Nor is the
// villain's own named counter word on it, so the attic can still draw it.
const BRIDGE: OwnWordsPlanner<BridgePlan> = {
  plan: (ctx) => planBridge(ctx.store, { avoid: [...ctx.avoid, ...ctx.moves, ...ctx.named], taken: ctx.taken }, ctx.rand),
  reads: bridgeWords,
  pictures: bridgeShown,
  room: (base, b) => ({ ...base, kind: 'bridge', bridge: b, fetches: bridgeWords(b) }),
};

// Charge the Spell (item 058) spells one word, a battle item. Its runes'
// gestures speak (item 074: "Tap the egg"), so it is no word whose gestures
// say a word she reads after it, and the keys keep clear of what they say.
const CHARGE: OwnWordsPlanner<ChargePlan> = {
  plan: (ctx) => {
    const later = [ctx.gift, ...ctx.moves, ...ctx.taken, ...ctx.pictured, ...ctx.named];
    return planCharge(ctx.store, { avoid: [...ctx.avoid, ...ctx.moves, ...ctx.taken, ...ctx.pictured, ...ctx.named], later }, ctx.rand);
  },
  reads: (c) => [c.word],
  says: (c) => gestureWords(c.runes),
  room: (base, c) => ({ ...base, kind: 'charge', charge: c, fetches: [c.word] }),
};

// The sentence game shows its frame's words in every room; its key word is drawn from the bag.
const SENTENCE: KeyPlanner = {
  shows: (g, fill) => sentence(g.frame!, fill, 'x').tokens.slice(0, -1).map(tokenWord),
  room: (base, { store, rand, fill, gift, keys, taken, game }) => {
    const s = sentence(game.frame!, fill, base.key);
    // No room offers the gift word or another of the episode's key words as a wrong picture.
    const others = [gift, ...keys.filter((k) => k && k !== base.key), ...taken];
    return { ...base, kind: 'sentence', fetches: [base.key], sentence: s, objects: objectsFor(store, s, rand, others) };
  },
};

/** Each kind's planner: a new kind is a minigame entry plus its planner here. */
const PLANNERS: Record<MinigameKind, KindPlanner> = { machine: MACHINE, bridge: BRIDGE, charge: CHARGE, sentence: SENTENCE };

/**
 * The order the kinds with words of their own plan them: each keeps clear of
 * those planned before it (the bridge of the machine's words; Charge of both,
 * and of the bridge's pictures). A new such kind takes its place here.
 */
const PLAN_ORDER: MinigameKind[] = ['machine', 'bridge', 'charge'];

const plannerOf = (g: Minigame): KindPlanner => {
  const p = PLANNERS[g.kind] as KindPlanner | undefined;
  if (!p) throw new Error(`episodePlans: ${g.id} has no planner for its kind (${g.kind})`);
  return p;
};

/** A room whose game has planned its own words: what it reads and says, and its room's plan. */
interface Planned {
  reads: string[];
  says: string[];
  room(base: RoomBase): RoomPlan;
}

/** Plan a game's own words (null: it cannot), adding what it reads and shows to the context for the rooms planned after it. */
function planOwn<P>(planner: OwnWordsPlanner<P>, ctx: PlanContext, g: Minigame): Planned | null {
  const p = planner.plan(ctx, g);
  if (p === null) return null;
  const reads = planner.reads(p);
  ctx.taken.push(...reads);
  ctx.pictured.push(...(planner.pictures?.(p) ?? []));
  return { reads, says: planner.says?.(p) ?? [], room: (base) => planner.room(base, p) };
}

/**
 * The episode's three room plans: fetch rooms a and b, then the attic's
 * counter sentence. Draws three words from the bag (spent as she reads them).
 */
export function episodePlans(store: ProgressStore, input: EpisodeInput, rand: Rand = Math.random): [RoomPlan, RoomPlan, RoomPlan] {
  const { fill, gift } = input;
  // The rooms' games come from the minigame pool (item 025); each sentence game is a frame.
  const games = [...(input.games ?? drawGames(store, rand, input.pool))] as [Minigame, Minigame, Minigame];
  if ('plan' in plannerOf(games[2])) throw new Error(`episodePlans: ${games[2].id} is a fetch room, not the counter`);

  // Every word any of the rooms shows besides its key word: she reads them
  // (and hears them on green) in every room, so none is a key word.
  const shown = games.flatMap((g) => {
    const planner = plannerOf(g);
    return 'shows' in planner ? planner.shows(g, fill) : [];
  });
  const avoid = new Set(withStems([gift, ...shown, ...(input.saidBefore ?? []), ...saidEarly({ hero: fill.hero, ally: input.ally, villain: fill.villain, helper: fill.helper })]));
  // The episode's move pads, and battle 1's: no room's word, a game's own included, is one of them.
  const moves = new Set<string>([...(input.moveWords ?? ACTION_WORDS), ...(input.battle1Moves ?? [])]);
  const named = CHARACTER_BY_ID[fill.villain]?.counter.word;
  const ctx: PlanContext = { store, rand, fill, gift, avoid, moves, named: named ? [named] : [], taken: [], pictured: [] };

  // The games with words of their own plan them first, kind by kind, so the
  // sentence rooms and the counter keep clear of all of them.
  const own: (Planned | null)[] = [null, null, null];
  for (const kind of PLAN_ORDER) {
    games.forEach((g, i) => {
      const planner = plannerOf(g);
      if (g.kind !== kind || !('plan' in planner)) return;
      own[i] = planOwn(planner, ctx, g);
      if (own[i]) return;
      // It cannot this episode: that room plays a sentence game instead.
      const spare = (input.pool ?? MINIGAMES).find((s) => s.kind === 'sentence' && s.slots.includes('fetch') && !games.includes(s))!;
      games[i] = spare;
      for (const w of SENTENCE.shows(spare, fill)) avoid.add(w);
    });
  }
  games.forEach((g, i) => {
    if ('plan' in plannerOf(g) && !own[i]) throw new Error(`episodePlans: ${g.kind} has no place in PLAN_ORDER`);
    for (const w of own[i]?.says ?? []) avoid.add(w);
  });
  const { taken, pictured } = ctx;

  // A frame ending "...A {x}" takes no word starting with a vowel: no WE NEED A ANT (item 039).
  const fits = (i: number) => {
    const f = games[i]!.frame;
    const article = f ? tokenWord(sentence(f, fill, 'x').tokens.at(-2) ?? '') : '';
    // X-RAY starts on a vowel sound too (item 058: no WE NEED A XRAY); nor a word that takes
    // no "A" (item 069: SCAR NEEDS A CHEESE).
    return (w: string) => article !== 'a' || (!/^[aeiou]|^x/.test(w) && !NO_ARTICLE.has(w));
  };
  const keys: string[] = [];
  for (let i = 0; i < 2; i++) {
    // A game with its own words ends on the last of them.
    const o = own[i];
    if (o) {
      keys.push(o.reads.at(-1) ?? '');
      continue;
    }
    // Not the villain's named counter word either: the attic's to draw (item 092).
    const eligible = BAG_WORDS.filter((w) => FETCHABLE.has(w) && !avoid.has(w) && !moves.has(w) && !keys.includes(w) && !taken.includes(w) && !pictured.includes(w) && !ctx.named.includes(w)).filter(fits(i));
    keys.push(drawKey(store, eligible, rand, [...keys, ...taken]));
  }
  // The counter: not a word on battle 1's move pads, not a word fetched this
  // episode (battle 1 shouts THE NET!). Every bag word is decodable (item 009;
  // the long-vowel KEY and YOYO too since item 048, and may be the counter: item 090).
  const eligible = BAG_WORDS.filter((w) => !avoid.has(w) && !moves.has(w) && !keys.includes(w) && !taken.includes(w) && !pictured.includes(w)).filter(fits(2));
  keys.push(drawKey(store, eligible, rand, [...keys, ...taken], (w) => (w === named ? NAMED_COUNTER_BOOST : 1)));

  const slots = ['a', 'b', 'counter'] as const;
  const roomIds = [input.rooms[0], input.rooms[1], input.counterRoom];
  return slots.map((slot, i): RoomPlan => {
    const game = games[i]!;
    const base = { slot, room: roomIds[i]!, game: game.id, scene: game.scene, key: keys[i]! };
    const o = own[i];
    if (o) return o.room(base);
    return (plannerOf(game) as KeyPlanner).room(base, { ...ctx, keys, game });
  }) as [RoomPlan, RoomPlan, RoomPlan];
}

/** A sentence room's plan, for code that only runs in one (the sentence room, its tests). */
export function asSentence(plan: RoomPlan): SentencePlan {
  if (plan.kind !== 'sentence') throw new Error(`room ${plan.slot} plays ${plan.game}, not the sentence game`);
  return plan;
}

/**
 * Does a frame's listening pass get skipped? Only above base difficulty
 * (item 067: no ramp steps up by itself), and only once it is solid.
 */
export function skipsListening(store: ProgressStore, frameId: string): boolean {
  return rampsAdvance() && frameIsSolid(store, frameId);
}

/** Is a frame solid (SENTENCE_SOLID in config)? Recorded for the grown-ups page; `skipsListening` is what the room asks. */
export function frameIsSolid(store: ProgressStore, frameId: string, rule = SENTENCE_SOLID): boolean {
  const s = store.stat('frames', frameId);
  if (s.seen < rule.tries) return false;
  const last = s.recent.slice(-rule.lastRight);
  return last.length === rule.lastRight && last.every(Boolean);
}
