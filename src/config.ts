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
 * Who is in an episode while Matt is testing v0.2 (Matt, 2026-10-18): the
 * pick screens are skipped and the cast is fixed. `pickScreens: true` brings
 * back hero → ally → villain picks; `randomVillain: true` (with the picks off)
 * draws a surprise villain instead of `villain`.
 */
export const EPISODE_DEFAULTS = {
  pickScreens: false,
  hero: 'julia',
  ally: 'ellie' as string | null,
  villain: 'tiamat',
  randomVillain: false,
};

/**
 * When a sentence frame counts as solid, so its sentences skip the listening
 * pass and start on her turn. Conservative: at least `tries` answers recorded
 * for the frame and the last `lastRight` of them right first time.
 */
export const SENTENCE_SOLID = { tries: 6, lastRight: 5 };

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
