/**
 * The difficulty knob (item 067; DIFFICULTY in src/config.ts). Pure: no
 * Phaser, unit-tested (tests/unit/variety.test.ts; through each ramp in the
 * grab, bridge, shifter, charge, sentences and bank tests).
 *
 * Nothing steps up by itself. Each help ramp (the warm-up's, the Stretchy
 * Bridge's, the Shape-Shifter's; Charge the Spell has none since item 078) records her level as before, but the level a
 * game gives is `helpLevel`: the ramp's start at base, else her recorded level
 * up to the knob. The other success ramps (a solid frame skipping its
 * listening pass, sound-alike distractors for a firm word) ask `rampsAdvance`.
 */

import { DIFFICULTY } from '../config';

export type Difficulty = 1 | 2 | 3;

/** A help ramp's level (the warm-up's, the bridge's, the Shape-Shifter's): 1 the most help. */
export type HelpLevel = 1 | 2 | 3;

/** A stored level as a help level: 1 at most, 3 at least, anything between 2. */
export function clampLevel(l: number): HelpLevel {
  return l <= 1 ? 1 : l >= 3 ? 3 : 2;
}

/** Every ramp's step: one level up (less help) when `up`, else one down, kept within 1..3. */
export function stepLevel(level: HelpLevel, up: boolean): HelpLevel {
  return Math.max(1, Math.min(3, level + (up ? 1 : -1))) as HelpLevel;
}

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
export function helpLevel(recorded: number, start: number, d: Difficulty = current): HelpLevel {
  if (!rampsAdvance(d)) return clampLevel(start);
  return clampLevel(Math.min(recorded, d));
}
