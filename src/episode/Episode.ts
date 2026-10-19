/**
 * One episode, start to finish: who is fighting, what has been fetched, and
 * which step comes next.
 *
 *   title → (hero → ally → villain picks, off by default) → bedroom
 *   → house part 1 (hub: learn the spell, two side-room sentence games,
 *     out the front door) → battle part 1 (the villain's ultimate wins)
 *   → house part 2 (back to the hub, the counter sentence game in the attic,
 *     out the front door) → battle part 2 (the counter wins) → victory → title
 *
 * Scenes never decide where to go next: they call `advance(scene)` when they
 * are done and this module starts the next step's scene. Inside a house step
 * the hub and its side rooms pass control between themselves (`enterRoom`,
 * `backToHub`); the front door is the hub's `advance()`.
 *
 * The four v0.1 prep games (Sound → Letter, Blend Path, Word → Picture, Spell
 * the Spell) are parked: their scenes and `prep`/`spell` step kinds stay so
 * `?scene=sound` etc. still open them, but no episode includes them.
 */

import Phaser from 'phaser';

import { charArt } from '../../content/art/assets';
import { formFor } from '../../content/battle/forms';
import { CHARACTER_BY_ID, ROSTER, personOf } from '../../content/battle/roster';
import type { CharacterSpec, CounterItem } from '../../content/battle/types';
import { COUNTER_ROOM, FETCH_ROOMS, HOME, PLACE_BY_ID } from '../../content/house/house';
import { QUESTS, questFor, questLine } from '../../content/house/quests';
import { group, narratorLine } from '../../content/voice/ids';
import { voiceBus } from '../audio/VoiceBus';
import { EPISODE_DEFAULTS } from '../config';
import { drawCast, wakerOf, type CastOverrides } from '../rules/cast';
import { episodePlans, wordsOf, type Rand, type RoomPlan } from '../rules/sentences';
import { battle1Words, planMoves, type MovePlan } from '../rules/moves';
import { spellFor } from '../rules/spell';
import { progress } from '../state/progress';
import { voiceBank } from '../voice/VoiceBank';

export type PrepGame = 'sound' | 'blend' | 'picture';

/** What each (parked) prep game makes, which the battle then uses. */
export const PREP_MAKES: Record<PrepGame, 'gem' | 'ammo' | 'helper'> = {
  sound: 'gem',
  blend: 'ammo',
  picture: 'helper',
};

export type Step =
  | { kind: 'title' }
  | { kind: 'pick'; what: 'hero' | 'ally' | 'villain' }
  | { kind: 'bedroom' }
  | { kind: 'house'; part: 1 | 2 }
  | { kind: 'battle'; part: 1 | 2 }
  | { kind: 'victory' }
  // Parked v0.1 steps: reachable by ?scene= only.
  | { kind: 'alarm' }
  | { kind: 'prep'; game: PrepGame; index: number }
  | { kind: 'retreat' }
  | { kind: 'spell' };

export type Slot = RoomPlan['slot'];

export interface EpisodeState {
  /** Roster ids: a dad is his form this episode (`dada_matt_lifter`). See src/rules/cast.ts. */
  hero: string;
  ally: string | null;
  villain: string;
  villainWasRandom: boolean;
  /** The dad who wakes her (narrates with no ally), in his form; null when both dads are busy. */
  primary: string | null;
  /** The other dad, there in the bedroom too, or null. */
  secondary: string | null;
  /** The quest place (content/house/house.ts PLACES id, or `home`): where the helper takes her to train. */
  place: string;
  prep: PrepGame[];
  /** v0.1's made things (parked games); `item` is still the counter-item. */
  made: { gem: boolean; ammo: boolean; helper: boolean; item: boolean };
  /** Words she read (or spelled) right this episode, in order, for the victory recap. */
  read: string[];
  /** Key words fetched from the side rooms, in order: each is a battle item. */
  fetched: string[];
  /** The move word the helper taught her in the hub; her first move choice is this spell. */
  spell: string | null;
  /** The battles' move choices (item 018), planned with the house: battle 1's words never become the counter word. */
  moves: MovePlan | null;
  /** The house: which room holds which sentence, and which rooms are done. */
  house: { plan: RoomPlan[] | null; done: Slot[]; taught: boolean };
  stepIndex: number;
}

const SCENE_FOR: Record<Step['kind'], string> = {
  title: 'Title',
  pick: 'Pick',
  bedroom: 'Bedroom',
  house: 'Hub',
  battle: 'Battle',
  victory: 'Victory',
  alarm: 'Alarm',
  prep: 'Prep',
  retreat: 'Retreat',
  spell: 'Spelling',
};

export function prepScene(game: PrepGame): string {
  return game === 'sound' ? 'SoundToLetter' : game === 'blend' ? 'BlendPath' : 'WordToPicture';
}

let episodeCount = 0;

function choosePrep(): PrepGame[] {
  const all: PrepGame[][] = [
    ['sound', 'picture'],
    ['blend', 'sound'],
    ['picture', 'blend'],
  ];
  return all[episodeCount % all.length]!;
}

export const episode: EpisodeState = {
  hero: EPISODE_DEFAULTS.hero,
  ally: EPISODE_DEFAULTS.ally,
  villain: EPISODE_DEFAULTS.villain,
  villainWasRandom: false,
  primary: EPISODE_DEFAULTS.primary,
  secondary: null,
  place: HOME,
  prep: choosePrep(),
  made: { gem: false, ammo: false, helper: false, item: false },
  read: [],
  fetched: [],
  spell: null,
  moves: null,
  house: { plan: null, done: [], taught: false },
  stepIndex: 0,
};

export function steps(_state: EpisodeState = episode): Step[] {
  const picks: Step[] = EPISODE_DEFAULTS.pickScreens
    ? [
        { kind: 'pick', what: 'hero' },
        { kind: 'pick', what: 'ally' },
        { kind: 'pick', what: 'villain' },
      ]
    : [];
  return [
    { kind: 'title' },
    ...picks,
    { kind: 'bedroom' },
    { kind: 'house', part: 1 },
    { kind: 'battle', part: 1 },
    { kind: 'house', part: 2 },
    { kind: 'battle', part: 2 },
    { kind: 'victory' },
  ];
}

export function currentStep(): Step {
  return steps()[episode.stepIndex] ?? { kind: 'title' };
}

/** The dad who wakes her (src/rules/cast.ts `wakerOf`), in his form. */
export function waker(state: EpisodeState = episode): string {
  return wakerOf(state);
}

/**
 * The helper (teaches the spell, fills `{helper}` in sentences, takes her on
 * the quest): the ally, or with no ally the dad who woke her. A roster id, so
 * a dad's form, whose abilities the spell comes from.
 */
export function helper(state: EpisodeState = episode): string {
  return state.ally ?? waker(state);
}

/**
 * Who gives instructions: the helper's person (narrator lines are voiced per
 * person: lifter Dada Matt narrates as `dada_matt`).
 */
export function narrator(state: EpisodeState = episode): string {
  return personOf(helper(state));
}

/**
 * The roster id `id` plays in this episode: a person's form when they are in
 * the cast (`dada_matt` → `dada_matt_cyber` when Dada Matt is the cyberdecker
 * today), else `id`. The voice speaks as the person; this is who to draw.
 */
export function castId(id: string, state: EpisodeState = episode): string {
  const person = personOf(id);
  const inCast = [state.ally, state.villain, state.primary, state.secondary, state.hero].find((c) => c && personOf(c) === person);
  return inCast ?? id;
}

/**
 * The image `id` appears as in this episode, once she is awake: its outfit
 * (content/battle/forms.ts: Julia the chef when Dada Jason is the ally), else
 * the roster image of the form it plays (`castId`). The title, the pick
 * screens and Julia asleep in bed use `charArt` directly: the default images.
 */
export function castArt(id: string, evil = false, state: EpisodeState = episode): string {
  const c = castId(id, state);
  if (evil) return charArt(c, true);
  return formFor(c, state)?.art ?? charArt(c, false);
}

/** The name-free face card for `id` in this episode (names as sight words): its outfit's, else its form's `face_<id>`. */
export function castFace(id: string, state: EpisodeState = episode): string {
  const c = castId(id, state);
  return formFor(c, state)?.face ?? `face_${c}`;
}

/** The quest's setup line, said in the bedroom in the helper's voice: theirs, or the narrator's "right here at home". */
export function questSetupLine(state: EpisodeState = episode): string {
  const h = helper(state);
  return QUESTS[h] ? questLine(h) : narratorLine(narrator(state), 'quest_home');
}

/** True when the episode trains somewhere other than the house. */
export function away(state: EpisodeState = episode): boolean {
  return state.place !== HOME && Boolean(PLACE_BY_ID[state.place]);
}

let castOverrides: CastOverrides = {};
let castRand: Rand = Math.random;
let castDefault = !EPISODE_DEFAULTS.randomCast;
let placeOverride: string | null = null;

/**
 * Fix parts of every episode's cast this session (`?ally=`, `?villain=`,
 * `?form=`, `?primary=`, `?secondary=`, `?seed=`, `?cast=default`,
 * `?place=`: BootScene), then recast the current episode.
 */
export function setCastOptions(o: { overrides?: CastOverrides; rand?: Rand; fixed?: boolean; place?: string | null }): void {
  if (o.overrides) castOverrides = o.overrides;
  if (o.rand) castRand = o.rand;
  if (o.fixed !== undefined) castDefault = o.fixed;
  if (o.place !== undefined) placeOverride = o.place;
  castEpisode();
}

/**
 * Draw this episode's cast (src/rules/cast.ts) and its quest place. `picked`
 * fixes roles for this episode only: the parked pick screens' choices, after
 * which the dads' roles, forms and the quest are drawn around them.
 */
export function castEpisode(picked: CastOverrides = {}): void {
  const fixed: CastOverrides = castDefault
    ? {
        ally: EPISODE_DEFAULTS.ally,
        ...(EPISODE_DEFAULTS.randomVillain ? {} : { villain: EPISODE_DEFAULTS.villain }),
        primary: EPISODE_DEFAULTS.primary,
        secondary: false,
        forms: { dada_matt: 'builder', dada_jason: 'chef' },
      }
    : {};
  const overrides = { ...fixed, ...castOverrides, ...picked };
  const c = drawCast({ hero: EPISODE_DEFAULTS.hero, recent: progress.recentVillains(), overrides }, castRand);
  episode.hero = c.hero;
  episode.ally = c.ally;
  episode.villain = c.villain;
  episode.villainWasRandom = !overrides.villain;
  episode.primary = c.primary;
  episode.secondary = c.secondary;
  // The hero cannot also be the ally (she would teach herself the spell).
  if (episode.ally && personOf(episode.ally) === personOf(episode.hero)) episode.ally = null;
  if (episode.villainWasRandom) progress.villainMet(personOf(episode.villain));
  episode.place = placeOverride && (placeOverride === HOME || PLACE_BY_ID[placeOverride]) ? placeOverride : questFor(helper()).place;
}

export function heroSpec(): CharacterSpec {
  return CHARACTER_BY_ID[episode.hero]!;
}
export function villainSpec(): CharacterSpec {
  return CHARACTER_BY_ID[episode.villain]!;
}

export function resetEpisode(): void {
  castEpisode();
  episode.prep = choosePrep();
  episode.made = { gem: false, ammo: false, helper: false, item: false };
  episode.read = [];
  episode.fetched = [];
  episode.spell = null;
  episode.moves = null;
  episode.house = { plan: null, done: [], taught: false };
  episode.stepIndex = 0;
}

/** Pick a random villain (any form) that is not the hero's or ally's own person: the pick screen's surprise. */
export function randomVillain(rand = Math.random): string {
  const pool = ROSTER.filter((c) => personOf(c.id) !== personOf(episode.hero) && (!episode.ally || personOf(c.id) !== personOf(episode.ally)));
  return pool[Math.floor(rand() * pool.length)]!.id;
}

/**
 * The house plan: two fetch rooms with a sentence each, and the attic with
 * the villain's counter sentence. Made once per episode, on first need.
 */
export function housePlan(): RoomPlan[] {
  if (!episode.house.plan) {
    // The spell first: the hub says and shows it before the side rooms, so
    // no room may make it a key word; nor the attic's counter word.
    episode.spell ??= spellFor(episode.hero, helper());
    const fill = { villain: episode.villain, helper: helper(), hero: episode.hero };
    // The rooms: the quest place's own, or two of the house's.
    const place = away() ? PLACE_BY_ID[episode.place]! : null;
    const rooms = place
      ? ([place.rooms[0]!.id, place.rooms[1]!.id] as [string, string])
      : (Phaser.Utils.Array.Shuffle([...FETCH_ROOMS]).slice(0, 2) as [string, string]);
    const counterRoom = place ? place.secret.id : COUNTER_ROOM;
    // The three key words come out of her word bag here; the counter keeps
    // clear of battle 1's move pads, and none is a word of the quest's setup line.
    const battle1Moves = battle1Words(movePlan());
    const saidBefore = wordsOf(questFor(helper()).text);
    episode.house.plan = episodePlans(progress, { fill, ally: episode.ally, spell: episode.spell, rooms, counterRoom, battle1Moves, saidBefore });
  }
  return episode.house.plan;
}

/** The battles' move choices: made once per episode, on first need (the house plan needs battle 1's). */
export function movePlan(): MovePlan {
  if (!episode.moves) {
    episode.spell ??= spellFor(episode.hero, helper());
    const team = [episode.hero, ...(episode.ally ? [episode.ally] : [])];
    episode.moves = planMoves(progress, { hero: episode.hero, team, helper: helper(), spell: episode.spell });
  }
  return episode.moves;
}

export function planFor(slot: Slot): RoomPlan {
  return housePlan().find((p) => p.slot === slot)!;
}

/** The word the attic's counter sentence ends in: whatever beats the villain this episode. */
export function counterWord(): string {
  return planFor('counter').sentence.key;
}

/**
 * The villain's named counter item when this episode's counter word is its
 * own word (Evil Tiamat and the HAT: the Magic Hat), else null and the
 * counter is just the thing in the picture.
 */
export function namedCounter(): CounterItem | null {
  const c = villainSpec().counter;
  return c.word === counterWord() ? c : null;
}

/** The counter's art: the named item's card, or the word's own picture. */
export function counterArt(): string {
  const named = namedCounter();
  return named ? `item_${named.id}` : `pic_${counterWord()}`;
}

/** Voice groups the current episode will need from here on. */
export function episodeGroups(): string[] {
  const g = [group.core, group.phonics, group.narrator(narrator())];
  g.push(group.fighter(episode.hero), group.fighter(`${episode.villain}_evil`));
  if (episode.ally) g.push(group.fighter(episode.ally));
  return g;
}

/** True for a step kind that has a scene (a `?scene=` value jumpTo can take). */
export function isStepKind(kind: string): kind is Step['kind'] {
  return Object.prototype.hasOwnProperty.call(SCENE_FOR, kind);
}

/** Start the scene for the current step. */
export function startStep(scene: Phaser.Scene): void {
  const step = currentStep();
  voiceBus.hush();
  const key = step.kind === 'prep' ? prepScene(step.game) : SCENE_FOR[step.kind];
  void voiceBank.loadGroups(episodeGroups());
  scene.scene.start(key, { step });
}

/** From the hub into a side room: the scene of the minigame drawn for it (src/rules/minigames.ts). */
export function enterRoom(scene: Phaser.Scene, slot: Slot): void {
  voiceBus.hush();
  scene.scene.start(planFor(slot).scene, { step: currentStep(), slot });
}

/** From a side room back to the hub, standing at that room's door. */
export function backToHub(scene: Phaser.Scene, from: Slot): void {
  voiceBus.hush();
  scene.scene.start('Hub', { step: currentStep(), from });
}

/** The current step is done; go to the next one. */
export function advance(scene: Phaser.Scene): void {
  episode.stepIndex++;
  if (episode.stepIndex >= steps().length) {
    progress.episodeDone();
    episodeCount++;
    resetEpisode();
  }
  // The battles and the victory are reached by a short hop along the journey
  // map, so she can see where she is in the episode and what comes next. So is
  // the run home after the retreat (house part 2): "back home, he still waits".
  const next = currentStep();
  if ((JOURNEY_BEFORE.includes(next.kind) || (next.kind === 'house' && next.part === 2)) && !skipJourney) {
    voiceBus.hush();
    void voiceBank.loadGroups(episodeGroups());
    scene.scene.start('Journey');
    return;
  }
  startStep(scene);
}

/** Steps that get the journey map first. */
const JOURNEY_BEFORE: Step['kind'][] = ['battle', 'victory'];

/** Tests may turn the map off to save time; the game never does. */
let skipJourney = new URLSearchParams(typeof location === 'undefined' ? '' : location.search).has('nojourney');
export function setSkipJourney(v: boolean): void {
  skipJourney = v;
}

/** The journey stops: every step from the bedroom to victory, with an icon each. */
export function journeyStops(): { icon: string; index: number }[] {
  const icon = (s: Step): string => {
    if (s.kind === 'bedroom') return '🛏️';
    if (s.kind === 'house') return away() ? PLACE_BY_ID[episode.place]!.glyph : '🏠';
    if (s.kind === 'battle') return '⚔️';
    if (s.kind === 'victory') return '🏆';
    return '•';
  };
  return steps()
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => s.kind !== 'title' && s.kind !== 'pick')
    .map(({ s, index }) => ({ icon: icon(s), index }));
}

/**
 * Jump into a step directly (dev F-keys, `?scene=`), with a plausible episode
 * around it. Parked steps (alarm, prep, retreat, spell) are not in the list,
 * so they start on their own with the episode as it is. stepIndex is left
 * alone (0, the title, after a boot), so when a parked scene finishes its
 * advance() runs on into the bedroom, carrying whatever state it left behind.
 */
export function jumpTo(scene: Phaser.Scene, kind: Step['kind'], extra: Partial<EpisodeState> = {}, part: 1 | 2 = 1): void {
  Object.assign(episode, extra);
  const list = steps();
  const i = list.findIndex((s) => s.kind === kind && (!('part' in s) || s.part === part));
  if (i < 0) {
    // A parked pick (pickScreens off) is the hero pick: a pick with no `what`
    // would fall through to the villain branch.
    const parked: Step =
      kind === 'prep' ? { kind: 'prep', game: episode.prep[0]!, index: 0 }
        : kind === 'pick' ? { kind: 'pick', what: 'hero' }
          : ({ kind } as Step);
    voiceBus.hush();
    void voiceBank.loadGroups(episodeGroups());
    scene.scene.start(parked.kind === 'prep' ? prepScene(parked.game) : SCENE_FOR[parked.kind], { step: parked });
    return;
  }
  episode.stepIndex = i;
  startStep(scene);
}
