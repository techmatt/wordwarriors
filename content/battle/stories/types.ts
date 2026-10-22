/**
 * A story fight (item 107): a turn-based showdown told like a short story,
 * one villain's script as data. The two sides take turns; each beat is a few
 * lines said by the characters in the fight (never a narrator), then one
 * thing happening, which may wait for her: a word pick, a walk to a safe
 * spot, a walk to grab something. A second villain's story is a data file
 * like `smaug.ts`, listed in `index.ts`; the staging (src/battle/story/) is
 * shared.
 *
 * Every line is a voice line (`storyLine` in content/voice/ids.ts): the
 * villain's in his evil voice; Dad's and the ally's composed per person, so
 * whoever plays them says them. No line says a bank word (tests/unit/
 * storyFight.test.ts), so nothing she reads is ever heard first.
 *
 * Pure data: no Phaser.
 */

import type { SpokenLine } from '../../voice/ids.js';

/**
 * Who says a line. `dad`: the dad in the fight (the ally when the ally is a
 * dad, else the dad who woke her); `ally`: the episode's ally. Either falls
 * back to the other when the episode has only one of them.
 */
export type StoryWho = 'villain' | 'dad' | 'ally';

export interface StoryLine extends SpokenLine {
  who: StoryWho;
  /** Unique within the story: the line id is `story_<story>_<key>` (plus the person for dad and ally). */
  key: string;
}

/**
 * What a beat waits for from her.
 *
 * - `pad`: a move choice. The right word is drawn from `answers` (words that
 *   make sense against what the villain just did) by the bank's weighting;
 *   `gift` is the hub's gift word. The other pads are any move words.
 * - `dodgePads`: a move choice that is a dodge (HOP, JUMP over the charge).
 * - `dodge`: she walks to the safe spot `spot` before the attack lands. It
 *   misses whether she gets there or not.
 * - `grab`: she walks to `spot` and presses green (the support move). It
 *   goes on by itself if she does not.
 */
export type StoryInput =
  | { kind: 'pad'; answers: string[] | 'gift' }
  | { kind: 'dodgePads'; answers: string[] }
  | { kind: 'dodge'; spot: string }
  | { kind: 'grab'; spot: string };

/**
 * A staged move (src/battle/story/moves.ts): `fire` a breath sweeping the
 * floor, `rain` fire falling from above, `tail` a tail smash shaking the
 * floor, `guards` gold guards charging across, `spin` Dad's spinning attack.
 */
export type StoryMove = 'fire' | 'rain' | 'tail' | 'guards' | 'spin';

/**
 * One beat of the story.
 *
 * - `talk`: lines only.
 * - `fetched`: the things she fetched in the house get their turn (`all`:
 *   every fetched thing; otherwise only the charged runes and made things).
 * - `counter`: her word pick (`input` a `pad`), fired at the villain.
 * - `attack`: the villain's `move`, waiting on a dodge (`dodge` or `dodgePads`).
 * - `support`: Dad's `move` while she grabs (`grab`).
 * - `ultimate`: part 1's end: he flies up until he is a dot and dives; the
 *   heroes are floored and retreat ("To be continued!").
 * - `finale`: part 2's end: he dives again, the episode's counter-item stops
 *   him, everyone's finisher, and he turns good.
 */
export interface StoryBeat {
  id: string;
  kind: 'talk' | 'fetched' | 'counter' | 'attack' | 'support' | 'ultimate' | 'finale';
  /** Said before the action (the telegraph). */
  lines?: StoryLine[];
  /** Said after it. */
  after?: StoryLine[];
  move?: StoryMove;
  /** A big move gets the stage: its splash (`fx_story_<splash>`), a camera punch-in, a held frame. */
  big?: string;
  input?: StoryInput;
  /** `fetched`: every fetched thing, not only the runes and made things. */
  all?: boolean;
}

/** A place in the arena: a safe spot to walk to, or the hoard. Drawn as `prop_fight_<prop>`. */
export interface StorySpot {
  id: string;
  /** Where she stands on it (arena floor). */
  x: number;
  y: number;
  /** How high she stands on it, px (a ledge). */
  lift?: number;
  /** The fight style's prop drawn there (content/battle/fights.ts `props`): standing on its bottom edge at (x + propDx, y + propDy); a ledge's top is where she stands. */
  prop: string;
  propDx?: number;
  propDy?: number;
}

/** A big move's splash picture: art `fx_story_<id>`. */
export interface StorySplash {
  id: string;
  look: string;
  glyph: string;
}

export interface StoryScript {
  id: string;
  /** The roster id the story is written for: the debug link forces him. */
  villain: string;
  spots: StorySpot[];
  splashes: StorySplash[];
  part1: StoryBeat[];
  part2: StoryBeat[];
}

/** Art id of a big move's splash. */
export const storySplashArt = (id: string) => `fx_story_${id}`;
