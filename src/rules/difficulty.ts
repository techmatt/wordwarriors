/**
 * The difficulty knob (item 067; DIFFICULTY in src/config.ts). Pure: no
 * Phaser, unit-tested (tests/unit/variety.test.ts; through each ramp in the
 * grab, bridge, charge, sentences and bank tests).
 *
 * Nothing steps up by itself. Each help ramp (the warm-up's, the Stretchy
 * Bridge's, Charge the Spell's) records her level as before, but the level a
 * game gives is `helpLevel`: the ramp's start at base, else her recorded level
 * up to the knob. The other success ramps (a solid frame skipping its
 * listening pass, sound-alike distractors for a firm word) ask `rampsAdvance`.
 */

import { DIFFICULTY } from '../config';

export type Difficulty = 1 | 2 | 3;

let current: Difficulty = DIFFICULTY;

/** The knob now: DIFFICULTY, or this session's `?difficulty=`. */
export function difficulty(): Difficulty {
  return current;
}

/** Set the knob for this session (`?difficulty=`, BootScene; tests). Anything but 1-3 is ignored. */
export function setDifficulty(n: number): void {
  if (n === 1 || n === 2 || n === 3) current = n;
}

/** May the success ramps advance at all (above base)? */
export function rampsAdvance(d: Difficulty = current): boolean {
  return d > 1;
}

/**
 * The help level a game gives: `start` at base; above it her `recorded` level
 * (1..3), never past the knob. A word or sound she has never met records
 * nothing, so its recorded level is `start`.
 */
export function helpLevel(recorded: number, start: number, d: Difficulty = current): 1 | 2 | 3 {
  const clamp = (l: number) => (l <= 1 ? 1 : l >= 3 ? 3 : 2) as 1 | 2 | 3;
  if (!rampsAdvance(d)) return clamp(start);
  return clamp(Math.min(recorded, d));
}
