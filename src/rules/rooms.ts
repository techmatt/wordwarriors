/**
 * Planning the episode's three rooms (`episodePlans`): which game each plays,
 * what each reads, and the key words. Pure: no Phaser, unit-tested. Moved out
 * of src/rules/sentences.ts in item 141; the sentence game's own word rules
 * (`distractors`, `saidEarly`, when a frame is solid) stay there.
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
 * room's other pictures are chosen for reading (`distractors`). No key word
 * is on any of the episode's move pads (`moveWords`): a right answer never
 * comes twice in an episode.
 *
 * A key word is never spoken or shown before its room asks for it, so the
 * draw keeps out every word the episode says or shows earlier: its sentences'
 * own frame words and names, the gift word, and everything the hero, ally
 * and villain say or show (`saidEarly`). The counter word also keeps out the
 * words on battle 1's move pads (planned up front, src/rules/moves.ts) and the
 * episode's fetch words (battle 1's item banners).
 */

import { CHARACTER_BY_ID } from '../../content/battle/roster';
import { FETCH_ITEMS, FRAME_BY_ID, NO_ARTICLE, NOT_FETCHED, NUMBER_WORDS, sentence, tokenWord, type Fill, type Sentence } from '../../content/phonics/sentences';
import { ACTIONS } from '../../content/phonics/bank';
import { NAMED_COUNTER_BOOST } from '../config';
import { MINIGAMES, drawGames, type Minigame, type MinigameKind } from './minigames';
import { machineWords, planMachine, type MachinePlan } from './wordMachine';
import { chargeRunes, chargeWords, gestureWords, planCharge, type ChargePlan } from './charge';
import { bridgeShown, bridgeWords, planBridge, type BridgePlan } from './bridge';
import { planShifter, shifterShown, shifterWords, type ShifterPlan } from './shifter';
import { planRhyme, rhymeSays, rhymeShown, rhymeWords, type RhymePlan } from './rhyme';
import type { SceneKey } from '../scenes/keys';
import type { ProgressStore } from '../state/ProgressStore';
import { BAG_WORDS, drawKey, withStems } from './bank';
import { shuffle, type Rand } from './random';
import { distractors, saidEarly } from './sentences';

interface PlanBase {
  /** `a` and `b` are the hub's two side-room doors; `counter` is the attic. */
  slot: 'a' | 'b' | 'counter';
  /** Side room id (content/house/house.ts SIDE_ROOM_BY_ID): the house's or the quest place's. */
  room: string;
  /** The minigame played there (src/rules/minigames.ts) and its scene. */
  game: string;
  scene: SceneKey;
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
 * Charge the Spell's room (item 053): the visit's words and their runes, a
 * round each (item 140). `fetches` are the words, each a battle item, `key`
 * the last; the runes go to the battle as `episode.charged`.
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

/** The Shape-Shifter's room (item 096): the chain it walks, the words read, `fetches`, its links' new words. */
export interface ShifterRoomPlan extends PlanBase {
  kind: 'shifter';
  shifter: ShifterPlan;
}

/** The rhyme room (item 139): its rounds, the words read, `fetches`, each round's printed word. */
export interface RhymeRoomPlan extends PlanBase {
  kind: 'rhyme';
  rhyme: RhymePlan;
}

export type RoomPlan = SentencePlan | MachineRoomPlan | ChargeRoomPlan | BridgeRoomPlan | ShifterRoomPlan | RhymeRoomPlan;

/** The bank's action words: kept out of the key words when the episode's own move pads are not given. */
const ACTION_WORDS: string[] = ACTIONS.map((w) => w.word);

/** Words a side room can fetch (each has a battle item). */
const FETCHABLE = new Set(FETCH_ITEMS.map((i) => i.word));

function objectsFor(store: ProgressStore, s: Sentence, rand: Rand, avoid: string[]): string[] {
  const key = s.key;
  // Shuffled so the answer is not always in the same place.
  return shuffle([key, ...distractors(store, key, rand, 2, [...avoid, ...s.tokens.map(tokenWord)])], rand);
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
  /**
   * Words whose picture every episode shows before any room, unsaid (hunt 12: the bed she wakes in and presses
   * green on, BED): never a key word or the attic's counter, which the episode must not show first, but read
   * in the other games as any word (item 157 put BED back in play).
   */
  notKeys?: string[];
  /**
   * Words the counter room's backdrop paints (`SideRoomSpec.pictures`, hunt 12, M85: the hideout's treasure
   * chest behind ...DOES NOT LIKE THE CHEST): never the attic's counter word there, as the doors' signs.
   */
  notCounter?: string[];
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
 * bridge, the Shape-Shifter, Charge the Spell): before any key is drawn, kept clear of the rooms
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

// The Shape-Shifter (item 096) reads a chain of words; its creatures and
// read-it pictures are shown, and its first creature is said (not read), so no
// key word drawn after it is one of them. Nor the villain's named counter word.
const SHIFTER_PLANNER: OwnWordsPlanner<ShifterPlan> = {
  plan: (ctx) => planShifter(ctx.store, { avoid: [...ctx.avoid, ...ctx.moves, ...ctx.named, ...ctx.pictured], taken: ctx.taken }, ctx.rand),
  reads: shifterWords,
  pictures: shifterShown,
  says: (p) => [p.start],
  room: (base, p) => ({ ...base, kind: 'shifter', shifter: p, fetches: shifterWords(p) }),
};

// The rhyme room (item 139) reads a word a round; its pictures are shown and its
// rhyming pairs said before she reads, so no key word drawn after it is one of
// them. Nor the villain's named counter word.
const RHYME_PLANNER: OwnWordsPlanner<RhymePlan> = {
  plan: (ctx) => planRhyme(ctx.store, { avoid: [...ctx.avoid, ...ctx.moves, ...ctx.named, ...ctx.pictured], taken: ctx.taken }, ctx.rand),
  reads: rhymeWords,
  pictures: rhymeShown,
  says: rhymeSays,
  room: (base, p) => ({ ...base, kind: 'rhyme', rhyme: p, fetches: rhymeWords(p) }),
};

// Charge the Spell (item 058) spells its words (two since item 140), each a battle item. Its runes'
// gestures show things (the /e/ rune's chick, item 074; since item 156 what their texts say no
// longer counts), so it is no word whose gestures show a word she reads after it, and the keys
// keep clear of what they show.
const CHARGE: OwnWordsPlanner<ChargePlan> = {
  plan: (ctx) => {
    const later = [ctx.gift, ...ctx.moves, ...ctx.taken, ...ctx.pictured, ...ctx.named];
    return planCharge(ctx.store, { avoid: [...ctx.avoid, ...ctx.moves, ...ctx.taken, ...ctx.pictured, ...ctx.named], later }, ctx.rand);
  },
  reads: chargeWords,
  says: (c) => gestureWords(chargeRunes(c)),
  room: (base, c) => ({ ...base, kind: 'charge', charge: c, fetches: chargeWords(c) }),
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
const PLANNERS: Record<MinigameKind, KindPlanner> = { machine: MACHINE, bridge: BRIDGE, shifter: SHIFTER_PLANNER, rhyme: RHYME_PLANNER, charge: CHARGE, sentence: SENTENCE };

/**
 * The order the kinds with words of their own plan them: each keeps clear of
 * those planned before it (the bridge of the machine's words; the
 * Shape-Shifter of both and the bridge's pictures; the rhyme room of those three; Charge of all of them). A new such kind takes its place here.
 */
const PLAN_ORDER: MinigameKind[] = ['machine', 'bridge', 'shifter', 'rhyme', 'charge'];

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
  const notKeys = new Set(withStems(input.notKeys ?? []));

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
      // A frame whose words no room planned before it reads or shows (item 139's review: WE CAN USE THE after a
      // machine built CAN), where the pool has one.
      const spares = (input.pool ?? MINIGAMES).filter((s) => s.kind === 'sentence' && s.slots.includes('fetch') && !games.includes(s));
      const clear = spares.find((s) => !SENTENCE.shows(s, fill).some((w) => ctx.taken.includes(w) || ctx.pictured.includes(w)));
      const spare = clear ?? spares[0]!;
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
    // A number word only where it reads right (item 093, M23: no WE NEED A THREE, no TIAMAT HIDES FROM THE THREE).
    const numbers = !f || FRAME_BY_ID[f]?.numbers === true;
    // X-RAY starts on a vowel sound too (item 058: no WE NEED A XRAY); nor a word that takes
    // no "A" (item 069: SCAR NEEDS A CHEESE); nor one the frame itself rules out (hunt 10, M49: RAN AWAY FROM THE ZOO).
    const not = (f && FRAME_BY_ID[f]?.not) || [];
    return (w: string) => (numbers || !NUMBER_WORDS.has(w)) && !not.includes(w) && (article !== 'a' || (!/^[aeiou]|^x/.test(w) && !NO_ARTICLE.has(w)));
  };
  const keys: string[] = [];
  for (let i = 0; i < 2; i++) {
    // A game with its own words ends on the last of them.
    const o = own[i];
    if (o) {
      keys.push(o.reads.at(-1) ?? '');
      continue;
    }
    // Not the villain's named counter word either: the attic's to draw (item 092). Nor MOM or DAD (hunt 9, M41).
    const eligible = BAG_WORDS.filter((w) => FETCHABLE.has(w) && !NOT_FETCHED.has(w) && !avoid.has(w) && !notKeys.has(w) && !moves.has(w) && !keys.includes(w) && !taken.includes(w) && !pictured.includes(w) && !ctx.named.includes(w)).filter(fits(i));
    keys.push(drawKey(store, eligible, rand, [...keys, ...taken]));
  }
  // The counter: not a word on battle 1's move pads, not a word fetched this
  // episode (battle 1 shouts THE NET!). Every bag word is decodable (item 009;
  // the long-vowel KEY and YOYO too since item 048, and may be the counter: item 090).
  // Nor a thing its room's backdrop paints (hunt 12, M85).
  const backdrop = new Set(withStems(input.notCounter ?? []));
  const eligible = BAG_WORDS.filter((w) => !avoid.has(w) && !notKeys.has(w) && !backdrop.has(w) && !moves.has(w) && !keys.includes(w) && !taken.includes(w) && !pictured.includes(w)).filter(fits(2));
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
