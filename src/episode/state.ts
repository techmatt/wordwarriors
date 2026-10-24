/**
 * The episode's state (split from Episode.ts in item 076, which re-exports
 * it): the `episode` object every scene reads, what an episode starts afresh,
 * and its step list. No Phaser and no import back into this folder, so the
 * draws (`./draws.ts`) and the rules can be unit-tested in node.
 */

import { HOME } from '../../content/house/house';
import { EPISODE_DEFAULTS } from '../config';
import type { RoomPlan } from '../rules/rooms';
import type { MovePlan } from '../rules/moves';
import { DEFAULT_LINES, DEFAULT_STORY, type LineVariants, type Story } from '../rules/story';

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
  /** `item`: the counter-item is made. */
  made: { item: boolean };
  /** Words she read (or spelled) right this episode, in order, for the victory recap. */
  read: string[];
  /** Things fetched, in order (the entry hall's warm-up, then each side room's word): each is a battle item. */
  fetched: string[];
  /**
   * The hub's gift word (item 037): an action word the helper gives her, drawn
   * from the bank (`giftWord`). Her first move choice of each part.
   */
  gift: string | null;
  /**
   * Charge the Spell (item 053): the sounds she charged in its room, in order,
   * and the battle part they fire in (the next one). The sounds stay out of
   * `read` and `fetched`; the word itself is read and fetched (item 058).
   *
   * `modelled`: the solo runes already recorded as said with the helper (hunt 10: F9 and back counted them twice).
   *
   * `at`: the round charging now and how many of its runes are charged (item 140: two words may share a sound), for F9 and back.
   */
  charged: { sounds: string[]; part: 1 | 2; modelled?: string[]; at?: { word: string; index: number } } | null;
  /**
   * Dad isn't here (item 106): a game that asks Dad got nothing from him for
   * DAD_AWAY_MS, so the helper joins in where he would judge, for the rest of
   * the session (hunt 7, M34: the episodes after it too, not kept in the
   * store, so a reload asks him again). Any Dad 1 / 2 turns it off. `?solo`
   * starts the session solo.
   */
  solo: boolean;
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
  /** The victory scene has been counted (progress `remember('ending')`, `episodeDone`): it may be drawn earlier than it opens. */
  endingCounted: boolean;
  /** The showdown's fight style (content/battle/fights.ts id), drawn at the first battle (item 031). */
  fight: string | null;
  /** Which quest setup line and hub scene the helper plays (item 037, src/rules/story.ts), drawn with the cast. */
  story: Story;
  /** Which wake-up, bedroom taunt, sorry and victory lines this episode says (item 040, `drawLines`), drawn with the cast. */
  lines: LineVariants;
  stepIndex: number;
}

/** Episodes finished this session: the parked prep games rotate by it. */
let episodeCount = 0;

/** An episode was finished (`advance` past the victory). */
export function countEpisode(): void {
  episodeCount++;
}

function choosePrep(): PrepGame[] {
  const all: PrepGame[][] = [
    ['sound', 'picture'],
    ['blend', 'sound'],
    ['picture', 'blend'],
  ];
  return all[episodeCount % all.length]!;
}

/** Everything an episode starts afresh, the cast (`castEpisode` draws that) and solo (the session's) aside: the start state and `resetEpisode`'s. */
export function freshProgress(): Omit<EpisodeState, 'hero' | 'ally' | 'villain' | 'villainWasRandom' | 'primary' | 'secondary' | 'place' | 'story' | 'lines' | 'solo'> {
  return {
    prep: choosePrep(),
    made: { item: false },
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
  // The session's, not the episode's (M34): `resetEpisode` keeps it.
  solo: typeof location !== 'undefined' && new URLSearchParams(location.search).has('solo'),
  ...freshProgress(),
};

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
  // No scene has this key: a prep step opens its game's scene (`sceneForStep`).
  prep: 'Prep',
  retreat: 'Retreat',
  spell: 'Spelling',
};

/** The scene a step opens on: a parked prep step opens its game's scene. */
export function sceneForStep(step: Step): string {
  if (step.kind !== 'prep') return SCENE_FOR[step.kind];
  return step.game === 'sound' ? 'SoundToLetter' : step.game === 'blend' ? 'BlendPath' : 'WordToPicture';
}

/** True for a step kind that has a scene (a `?scene=` value jumpTo can take). */
export function isStepKind(kind: string): kind is Step['kind'] {
  return Object.prototype.hasOwnProperty.call(SCENE_FOR, kind);
}
