/**
 * One episode, start to finish: who is fighting, what has been fetched, and
 * which step comes next.
 *
 *   title → (hero → ally → villain picks, off by default) → bedroom
 *   → the entry hall's warm-up ("before we head out, let's grab the ...")
 *   → house part 1 (hub: the gift word, two side-room doors, a minigame each
 *     from the pool, one a phonics game while FORCE_PHONICS_ROOM; out the
 *     front door) → map → battle part 1 (the villain's ultimate wins)
 *   → map → house part 2 (the counter sentence in the attic) → map
 *   → battle part 2 (the counter wins) → map → victory (the victory scene,
 *     then the recap) → title
 *
 * Scenes never decide where to go next: they call `advance(scene)` when they
 * are done and this module starts the next step's scene, by the journey map
 * (`Journey`) where the arrows say. Inside a house step the hub and its side
 * rooms pass control between themselves (`enterRoom`, `backToHub`); the
 * front door is the hub's `advance()`.
 *
 * The four v0.1 prep games (Sound → Letter, Blend Path, Word → Picture, Spell
 * the Spell) are parked: their scenes and `prep`/`spell` step kinds stay so
 * `?scene=sound` etc. still open them, but no episode includes them.
 *
 * This module is the state and the flow. The cast lookups live in
 * `./cast.ts`, the episode's draws (house plan, warm-up, gift, moves,
 * counter, fight style, ending) in `./plans.ts`; both are re-exported here,
 * so importers only ever name this module. They import `episode` back (a
 * cycle): safe while neither reads an Episode.ts binding at module load.
 */

import Phaser from 'phaser';

import { personOf } from '../../content/battle/roster';
import { HOME, PLACE_BY_ID } from '../../content/house/house';
import { questFor } from '../../content/house/quests';
import { group } from '../../content/voice/ids';
import { voiceBus } from '../audio/VoiceBus';
import { EPISODE_DEFAULTS } from '../config';
import { DADS, drawCast, type CastOverrides } from '../rules/cast';
import { endingPeople } from '../rules/endings';
import type { Rand } from '../rules/bank';
import type { RoomPlan } from '../rules/sentences';
import type { MovePlan } from '../rules/moves';
import { DEFAULT_LINES, DEFAULT_STORY, drawLines, drawStory, variantKeys, type LineVariants, type Story } from '../rules/story';
import { progress } from '../state/progress';
import { voiceBank } from '../voice/VoiceBank';
import { startScene } from '../art/gate';
import { away, helper, narrator } from './cast';
import { planFor, rememberPlan } from './plans';

export {
  away,
  bedroomTaunt,
  castArt,
  castFace,
  castId,
  castScale,
  helper,
  hubScene,
  narrator,
  questSetupLine,
  randomVillain,
  reformedOf,
  storyWords,
  villainSpec,
  wakeKey,
  waker,
} from './cast';
export { counterArt, counterWord, drawEnding, fightStyle, giftWord, grabPlan, housePlan, movePlan, namedCounter, planFor } from './plans';

export type PrepGame = 'sound' | 'blend' | 'picture';

export type Step =
  | { kind: 'title' }
  | { kind: 'pick'; what: 'hero' | 'ally' | 'villain' }
  | { kind: 'bedroom' }
  | { kind: 'grab' }
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
  /**
   * The hub's gift word (item 037): an action word the helper gives her, drawn
   * from the bank (`giftWord`). Her first move choice of each part.
   */
  gift: string | null;
  /**
   * Charge the Spell (item 053): the sounds she charged in its room, in order,
   * and the battle part they fire in (the next one). Never words: they stay
   * out of `read` and `fetched` (no recap card, no bag picture).
   */
  charged: { sounds: string[]; part: 1 | 2 } | null;
  /** The battles' move choices (item 018), planned with the house: battle 1's words never become the counter word. */
  moves: MovePlan | null;
  /**
   * The house: which room holds which sentence, and which rooms are done.
   * `misses`: wrong tries on a round not yet answered, by `<slot>:<word>` (a
   * room) or `move:<part>:<n>` (a battle's move choice; `...:done` once it is
   * recorded), so a trip to the parent page (F9) and back neither turns a miss
   * into a first try nor records a choice twice (item 039).
   */
  house: { plan: RoomPlan[] | null; done: Slot[]; taught: boolean; misses?: Record<string, number> };
  /**
   * The home warm-up (item 033, src/rules/grab.ts): the word she grabs in the
   * entry hall and the hall's pictures. Drawn before the house plan, which
   * keeps the word out of its reading.
   */
  grab: { word: string; objects: string[]; level: number | null; misses: number } | null;
  /** The victory scene (content/house/endings.ts id), drawn when it starts (item 027). */
  ending: string | null;
  /** The victory scene has been counted (progress `endingPlayed`, `episodeDone`): it may be drawn earlier than it opens. */
  endingCounted: boolean;
  /** The showdown's fight style (content/battle/fights.ts id), drawn at the first battle (item 031). */
  fight: string | null;
  /** Which quest setup line and hub scene the helper plays (item 037, src/rules/story.ts), drawn with the cast. */
  story: Story;
  /** Which wake-up, bedroom taunt, sorry and victory lines this episode says (item 040, `drawLines`), drawn with the cast. */
  lines: LineVariants;
  stepIndex: number;
}

const SCENE_FOR: Record<Step['kind'], string> = {
  title: 'Title',
  pick: 'Pick',
  bedroom: 'Bedroom',
  grab: 'Entry',
  house: 'Hub',
  battle: 'Battle',
  // The victory step opens on its scene (item 027), which goes on to the recap.
  victory: 'Ending',
  alarm: 'Alarm',
  // No scene has this key: a prep step opens its game's scene (`prepScene`).
  prep: 'Prep',
  retreat: 'Retreat',
  spell: 'Spelling',
};

function prepScene(game: PrepGame): string {
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

/** Everything an episode starts afresh, the cast aside (`castEpisode` draws that): the start state and `resetEpisode`'s. */
function freshProgress(): Omit<EpisodeState, 'hero' | 'ally' | 'villain' | 'villainWasRandom' | 'primary' | 'secondary' | 'place' | 'story' | 'lines'> {
  return {
    prep: choosePrep(),
    made: { gem: false, ammo: false, helper: false, item: false },
    read: [],
    fetched: [],
    charged: null,
    gift: null,
    moves: null,
    house: { plan: null, done: [], taught: false },
    grab: null,
    ending: null,
    endingCounted: false,
    fight: null,
    stepIndex: 0,
  };
}

export const episode: EpisodeState = {
  hero: EPISODE_DEFAULTS.hero,
  ally: EPISODE_DEFAULTS.ally,
  villain: EPISODE_DEFAULTS.villain,
  villainWasRandom: false,
  primary: EPISODE_DEFAULTS.primary,
  secondary: null,
  place: HOME,
  story: { ...DEFAULT_STORY },
  lines: { ...DEFAULT_LINES },
  ...freshProgress(),
};

/** Steps that get the journey map first. */
const JOURNEY_BEFORE: Step['kind'][] = ['battle', 'victory'];

/** Tests may turn the map off to save time; the game never does. */
const skipJourney = new URLSearchParams(typeof location === 'undefined' ? '' : location.search).has('nojourney');

export function steps(): Step[] {
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
    { kind: 'grab' },
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

let castOverrides: CastOverrides = {};
/** The cast's draws (`?seed=`); the fight style draws with it too (`./plans.ts`). */
export let castRand: Rand = Math.random;
let castDefault = !EPISODE_DEFAULTS.randomCast;
let placeOverride: string | null = null;
/** `?fight=<id>`, read by the fight style's draw (`./plans.ts`). */
export let fightOverride: string | null = null;

/**
 * Fix parts of every episode's cast this session (`?ally=`, `?villain=`,
 * `?form=`, `?primary=`, `?secondary=`, `?seed=`, `?cast=default`,
 * `?place=`: BootScene), then recast the current episode.
 */
export function setCastOptions(o: { overrides?: CastOverrides; rand?: Rand; fixed?: boolean; place?: string | null; fight?: string | null }): void {
  if (o.overrides) castOverrides = o.overrides;
  if (o.fight !== undefined) fightOverride = o.fight;
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
  // Item 067: her recent allies and each dad's recent forms sit out, as her villains do.
  const recentForms = Object.fromEntries(DADS.map((d) => [d, progress.recentOf(`form_${d}`)]));
  const c = drawCast({ hero: EPISODE_DEFAULTS.hero, recent: progress.recentVillains(), recentAllies: progress.recentOf('ally'), recentForms, overrides }, castRand);
  const byRole = (d: string) => [overrides.ally, overrides.villain, overrides.hero].some((id) => id && personOf(id) === d);
  drawnFreely = { ally: overrides.ally === undefined, forms: DADS.filter((d) => !overrides.forms?.[d] && !byRole(d)), variants: !castDefault };
  episode.hero = c.hero;
  episode.ally = c.ally;
  episode.villain = c.villain;
  episode.villainWasRandom = !overrides.villain;
  episode.primary = c.primary;
  episode.secondary = c.secondary;
  // The hero cannot also be the ally (she would give herself the gift word).
  if (episode.ally && personOf(episode.ally) === personOf(episode.hero)) episode.ally = null;
  episode.place = placeOverride && (placeOverride === HOME || PLACE_BY_ID[placeOverride]) ? placeOverride : questFor(helper()).place;
  episode.fight = null;
  // The helper's quest line and hub scene (item 037): after the cast, so a
  // seed draws the same cast as before; the default cast always plays the first.
  // Her recent variants of each sit out (item 067).
  const recentVariants = (key: string) => progress.recentOf(key).map(Number);
  episode.story = drawStory(helper(), castRand, castDefault, recentVariants);
  // The wake-up and the villain's lines (item 040): after the story, so a seed's story is unchanged.
  episode.lines = drawLines(episode.villain, castRand, castDefault, recentVariants);
}

/** What the last cast draw chose freely (item 067), so only that is remembered: an override or the default cast is not her rotation. */
let drawnFreely: { ally: boolean; forms: string[]; variants: boolean } = { ally: false, forms: [], variants: false };

/** Whether this episode's cast and its house plan have been remembered (item 067): once each per episode (the plan's in `./plans.ts`). */
export const remembered = { cast: false, plan: false };

/**
 * Remember this episode's cast and story picks across episodes (item 067),
 * as she walks into the bedroom: the cast is drawn more often than episodes
 * are played (at boot, at the title, after the parked pick screens). The villain as before (item
 * 025); the ally, each dad's form she meets, the quest line, hub scene and
 * line variants.
 */
function rememberCast(): void {
  if (remembered.cast) return;
  remembered.cast = true;
  if (episode.villainWasRandom) progress.villainMet(personOf(episode.villain));
  if (drawnFreely.ally && episode.ally) progress.remember('ally', personOf(episode.ally));
  const roles = [episode.primary, episode.secondary, episode.ally, episode.villain];
  for (const dad of drawnFreely.forms) {
    const form = roles.find((id) => id && personOf(id) === dad);
    if (form) progress.remember(`form_${dad}`, form);
  }
  if (!drawnFreely.variants) return;
  const k = variantKeys(helper(), episode.villain);
  progress.remember(k.quest, String(episode.story.quest));
  progress.remember(k.scene, String(episode.story.scene));
  for (const key of Object.keys(episode.lines) as (keyof LineVariants)[]) progress.remember(k[key], String(episode.lines[key]));
}

export function resetEpisode(): void {
  castEpisode();
  Object.assign(episode, freshProgress());
  remembered.cast = false;
  remembered.plan = false;
}

/** Voice groups the current episode will need from here on. */
export function episodeGroups(): string[] {
  // In decode order (item 062: one queue). The letter sounds first: a bridge stone's held sound does not wait for its decode.
  const g = [group.core, group.phonics, group.narrator(narrator())];
  g.push(group.fighter(episode.hero), group.fighter(`${episode.villain}_evil`));
  if (episode.ally) g.push(group.fighter(episode.ally));
  // The victory scene (item 027): everyone in it says a line in their own voice.
  for (const id of endingPeople(episode)) g.push(group.ending(personOf(id)));
  return [...new Set(g)];
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
  // Not for the title: it draws a fresh cast as it opens, and its one line is
  // core (item 039: it decoded the old cast's narrator, ~500 clips, for nothing).
  if (step.kind !== 'title') {
    // A new episode: let the last one's voices go first.
    if (step.kind === 'bedroom') voiceBank.retain(episodeGroups());
    void voiceBank.loadGroups(episodeGroups());
  }
  startScene(scene, key, { step });
}

/** From the hub into a side room: the scene of the minigame drawn for it (src/rules/minigames.ts). */
export function enterRoom(scene: Phaser.Scene, slot: Slot): void {
  voiceBus.hush();
  startScene(scene, planFor(slot).scene, { step: currentStep(), slot });
}

/** From a side room back to the hub, standing at that room's door. */
export function backToHub(scene: Phaser.Scene, from: Slot): void {
  voiceBus.hush();
  startScene(scene, 'Hub', { step: currentStep(), from });
}

/** The current step is done; go to the next one. */
export function advance(scene: Phaser.Scene): void {
  episode.stepIndex++;
  // The cast is drawn more often than episodes are played (at boot, at the
  // title, and again after the parked pick screens): her villain (and since
  // item 067 the rest of her rotations) counts as met only as she walks into
  // the bedroom from the title or the last pick, the cast she really plays.
  if (currentStep().kind === 'bedroom') rememberCast();
  rememberPlan();
  if (episode.stepIndex >= steps().length) {
    // progress.episodeDone() ran as the victory scene opened (EndingScene).
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
    startScene(scene, 'Journey');
    return;
  }
  startStep(scene);
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
    // The warm-up is still home, part of the morning: no stop of its own.
    .filter(({ s }) => s.kind !== 'title' && s.kind !== 'pick' && s.kind !== 'grab')
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
    startScene(scene, parked.kind === 'prep' ? prepScene(parked.game) : SCENE_FOR[parked.kind], { step: parked });
    return;
  }
  episode.stepIndex = i;
  startStep(scene);
}
