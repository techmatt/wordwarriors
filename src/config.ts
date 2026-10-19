/**
 * Design resolution and the numbers every scene agrees on.
 *
 * Kept apart from main.ts because main.ts constructs the game as a side
 * effect, and scenes importing the entry point back would be a cycle.
 */
export { PORT } from './port';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Her walking speed in rooms, design pixels per second. */
export const WALK_SPEED = 330;

/**
 * Mirror her character to face the way she walks. Was off while the art was
 * placeholder cards, because a mirrored card mirrors its name; on since every
 * character got real art (art batch 1, 2026-10-18).
 */
export const FLIP_TO_FACE = true;

/** How close (px, centre to centre) she must be for a spot to light up its green dot. */
export const REACH = 95;

/**
 * Draw order. Rooms and the arena sort world objects by their own y between
 * `ground` and `fx`; the named bands sit above.
 */
export const DEPTH = {
  ground: -100,
  floor: -50,
  /** ...y-sorted world objects live between 0 and 10_000... */
  fx: 20_000,
  prompt: 90_000,
  sparkles: 95_000,
  speech: 100_000,
  hud: 100_100,
  overlay: 110_000,
} as const;

/**
 * Who is in an episode. Since item 025 the cast is drawn fresh every episode
 * (`randomCast`, src/rules/cast.ts): a villain from the whole roster, a random
 * ally, the dads in random forms and roles. The fixed cast below is the
 * "default episode": what `randomCast: false` plays, and what `?cast=default`
 * (the tests' default) plays.
 *
 * `pickScreens: true` brings back the parked hero → ally → villain picks,
 * which then choose those roles; the dads' forms are still drawn.
 * `randomVillain: true` (with `randomCast: false`) draws only the villain.
 *
 * The cast also picks the scenario (content/battle/forms.ts): with `ally:
 * 'dada_jason'` it is the chef episode, Julia as chef Julia from the moment
 * she wakes up.
 */
export const EPISODE_DEFAULTS = {
  pickScreens: false,
  randomCast: true,
  hero: 'julia',
  ally: 'ellie' as string | null,
  villain: 'tiamat',
  /** The default episode's waking dad (a person), in his own form; nobody else comes in. */
  primary: 'dada_matt',
  randomVillain: false,
};

/**
 * The active cast (Matt, item 028): who the random draw picks the ally and
 * the villain from, as persons (roster ids without a form). A dad here comes
 * in any of his forms (four Dada Matts, three Dada Jasons). Everybody else in
 * the roster is still defined, reachable by `?ally=` / `?villain=`, and joins
 * the draw by being added here. The dads wake her whatever this says.
 */
export const ACTIVE_CAST = {
  allies: ['dada_matt', 'dada_jason', 'scar', 'ellie'],
  villains: ['jormungandr', 'smaug', 'bavmorda', 'tiamat'],
};

/** The cast draw's odds (Matt, item 025). */
export const CAST_ODDS = {
  /** The primary dad (the one who wakes her) is Dada Matt this often, else Dada Jason. */
  mattPrimary: 0.6,
  /** The other dad also comes into the bedroom this often. */
  secondary: 0.5,
};

/**
 * When a sentence frame counts as solid, so its sentences skip the listening
 * pass and start on her turn. Conservative: at least `tries` answers recorded
 * for the frame and the last `lastRight` of them right first time.
 */
export const SENTENCE_SOLID = { tries: 6, lastRight: 5 };

/**
 * The word machine (item 026): words built per visit, how many of them from
 * the first family before it switches to another, and letter tiles on the
 * floor per word (the right one and silly ones). `weight` is its weight in
 * the rooms' minigame pool (a sentence frame is 1; 2 gives it about every
 * other episode), times how shaky her word families are.
 */
export const WORD_MACHINE = { rounds: 4, perFamily: 3, tiles: 3, weight: 2 };

/**
 * The home warm-up (item 033, src/scenes/EntryScene.ts): "Before we head out,
 * let's grab the ..." in the entry hall. Each word has its own level on a
 * ramp: 1 = the word, its letter names and its letter sounds; 2 = names and
 * sounds, no word; 3 = sounds only. `startLevel` is where a word she has never
 * grabbed starts; right first time moves a word up a level, a miss on its
 * first try moves it down. `helpAfter` misses add the whole word to the clue.
 * `objects` labelled pictures stand in the hall.
 */
export const GRAB = { startLevel: 2 as 1 | 2 | 3, helpAfter: 3, objects: 9 };

/** How long in the bedroom (ms, after the news) before the door starts to sparkle. */
export const DOOR_SPARKLE_MS = 12_000;

/** Pad face colours, as a child sees them. Rules code talks in these names, never A/B. */
export const PAD_COLOR = {
  green: 0x44d95a,
  red: 0xe8483f,
  blue: 0x3d7fe0,
  yellow: 0xf2c43d,
} as const;

export type PadColorName = keyof typeof PAD_COLOR;
