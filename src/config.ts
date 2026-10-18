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

/** Pad face colours, as a child sees them. Rules code talks in these names, never A/B. */
export const PAD_COLOR = {
  green: 0x44d95a,
  red: 0xe8483f,
  blue: 0x3d7fe0,
  yellow: 0xf2c43d,
} as const;

export type PadColorName = keyof typeof PAD_COLOR;
