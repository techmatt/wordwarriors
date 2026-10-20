/**
 * Charge the Spell's runes (item 053): the letter sounds a rune can carry,
 * each with its gesture and the move it becomes in the battle.
 *
 * The gesture is Jolly Phonics style, one memorable action per sound (S a
 * hissing snake, M rubbing a tummy). The narrator performs it: their sprite
 * bobs and squashes in its `motion` while `glyph` (an emoji prop) does the
 * action beside them, and they say `text`, which trails off into the sound's
 * own `letter_<x>_sound` line. So the text never names the letter (letter
 * SOUNDS, never names) and never spells the sound ("sss" would be captioned,
 * and edge-tts reads it as "ess"); at help level 2 the line plays without
 * the sound after it, a cloze she completes.
 *
 * Lines here are voiced before the battle, so they say no bank word at all,
 * stems included (tests/unit/charge.test.ts), and no glyph is a bank word's
 * picture or close to one (a 🥁 would show DRUM before she reads it; a mouse
 * reads as RAT, a hatching chick as CHICK, a plane as JET, a ladybird as BUG).
 *
 * `tier`: 1 the continuous sounds (she can hold them: M S F A L N R V Z and
 * the short vowels), 2 the quick ones (stops, H W Y J), 3 the digraphs, one
 * sound each. Q and X are left out (their placeholders are too unlike the
 * sound, as in the parked games), CK too (C's sound, never first).
 *
 * `move`: the ability her hero fires for the rune in the next battle (the
 * word effects' shape, content/phonics/effects.ts), by the sound's feel: a
 * held hum is a beam, a hiss a wave, a pop a bolt. Its projectile is the
 * gesture's glyph, never a word's picture. Pure data: no Phaser.
 */

import type { AbilitySpec } from '../battle/types.js';

export type RuneTier = 1 | 2 | 3;

/** How the gesture moves: the narrator by bob and squash, the glyph prop as it says. */
export type GestureMotion =
  /** The prop weaves along a wavy path in front of them. */
  | 'weave'
  /** The prop flies across, from one side of them to the other. */
  | 'fly'
  /** The prop bounces side to side. */
  | 'bounce'
  /** The prop and the narrator pulse together (a tummy rub, a wobble). */
  | 'pulse'
  /** The prop shakes on the spot. */
  | 'shake'
  /** The prop blinks on and off. */
  | 'blink'
  /** The prop puffs up, then shrinks away (a candle blown out). */
  | 'puff'
  /** The prop climbs from their feet to their head. */
  | 'climb';

export interface RuneSound {
  /** The sound unit: a letter, or a digraph's two letters (`sh`). Its line is `letter_<sound>_sound`. */
  sound: string;
  tier: RuneTier;
  gesture: { glyph: string; motion: GestureMotion; text: string; say?: string };
  move: AbilitySpec;
}

function move(sound: string, kind: AbilitySpec['kind'], color: number, glyph: string, extra: Partial<AbilitySpec> = {}): AbilitySpec {
  return { id: `rune_${sound}`, name: `${sound.toUpperCase()} rune`, kind, cooldown: 0, color, power: 2, glyph, ...extra };
}

function rune(sound: string, tier: RuneTier, glyph: string, motion: GestureMotion, text: string, kind: AbilitySpec['kind'], color: number, extra: Partial<AbilitySpec> = {}): RuneSound {
  return { sound, tier, gesture: { glyph, motion, text }, move: move(sound, kind, color, glyph, extra) };
}

/** Every rune, the continuous sounds first. */
export const RUNES: RuneSound[] = [
  // Tier 1: continuous, she can hold them.
  rune('m', 1, '🍰', 'pulse', 'Rub your tummy, so tasty, it goes...', 'beam', 0xff9ad5, { color2: 0xffffff }),
  rune('s', 1, '🐍', 'weave', 'The snake wiggles, and hisses...', 'wave', 0x7be36b, { color2: 0xd8ffb0 }),
  rune('f', 1, '🔥', 'puff', 'Blow on the fire, it goes...', 'cone', 0xff7b3a, { color2: 0xffd23f }),
  rune('a', 1, '💪', 'climb', 'Tiny critters crawl up my arm, and I go...', 'bolt', 0xff4040, { count: 4, homing: true }),
  rune('l', 1, '🍭', 'pulse', 'Lick a lollipop, it goes...', 'orbit', 0xff6ad5, { count: 4 }),
  rune('n', 1, '🕊️', 'fly', 'Arms out wide, like a bird gliding, it goes...', 'dash', 0xbfd4ff, { power: 3 }),
  rune('r', 1, '🐯', 'shake', 'The tiger growls, it goes...', 'slam', 0xffa53d, { power: 3 }),
  rune('v', 1, '🏎️', 'fly', 'The race car zooms past, it goes...', 'dash', 0xff3d3d, { power: 3 }),
  rune('z', 1, '🐝', 'weave', 'The bee buzzes about, it goes...', 'bolt', 0xffd23f, { count: 5, homing: true }),
  rune('e', 1, '👐', 'shake', 'Crack the egg open, it goes...', 'lightning', 0xfff4b0),
  rune('i', 1, '👃', 'shake', 'Wiggle your nose like a mouse, it goes...', 'bolt', 0xc0c0d0, { count: 3, homing: true }),
  rune('o', 1, '🔦', 'blink', 'Flick the light on and off, it goes...', 'beam', 0xfff59a, { color2: 0xffffff }),
  rune('u', 1, '☂️', 'pulse', 'Put up the umbrella, it goes...', 'shield', 0x9b5de5, { duration: 4 }),
  // Tier 2: quick sounds, once the continuous ones are solid.
  rune('t', 2, '🎾', 'bounce', 'Watch the tennis ball go back and forth...', 'bolt', 0xd8ff3d, { count: 4, homing: true }),
  rune('p', 2, '🕯️', 'puff', 'Puff out the candle, it goes...', 'wave', 0xffe0a0, { color2: 0xffffff }),
  rune('b', 2, '⚾', 'bounce', 'Swing hard at the ball, it goes...', 'bolt', 0xffffff, { count: 3, homing: true, power: 3 }),
  rune('d', 2, '🦕', 'pulse', 'The dinosaur takes a step, it goes...', 'slam', 0x5ad17a, { power: 3 }),
  rune('c', 2, '📷', 'blink', 'The camera clicks, it goes...', 'lightning', 0xe0e8ff),
  rune('k', 2, '🚪', 'shake', 'Knock on the door, it goes...', 'rain', 0xa0703a, { count: 10 }),
  rune('g', 2, '🚿', 'weave', 'Water gurgles down the drain, it goes...', 'wave', 0x3d9bff, { color2: 0xbfefff }),
  rune('h', 2, '😮', 'pulse', 'Pant like a puppy, it goes...', 'cone', 0xffffff, { color2: 0xbfefff }),
  rune('j', 2, '🍮', 'pulse', 'The jelly wobbles on a plate, it goes...', 'orbit', 0xffb347, { count: 3 }),
  rune('w', 2, '🌬️', 'puff', 'Blow like the wind, it goes...', 'wave', 0xd8f0ff, { color2: 0xffffff }),
  rune('y', 2, '🥄', 'pulse', 'A spoon of yogurt, so good, it goes...', 'rain', 0xfff4e0, { count: 10 }),
  // Tier 3: two letters, one sound.
  rune('sh', 3, '🤫', 'pulse', 'Finger on your mouth, it goes...', 'freeze', 0xbfefff, { duration: 2 }),
  rune('ch', 3, '🚂', 'fly', 'The train chugs along, it goes...', 'dash', 0x8a8a9a, { power: 3 }),
  rune('th', 3, '😛', 'pulse', 'Poke your tongue out, it goes...', 'beam', 0xff8fb0, { color2: 0xffffff }),
];

export const RUNE_BY_SOUND: Record<string, RuneSound> = Object.fromEntries(RUNES.map((r) => [r.sound, r]));

/** The sounds that share one sound with another rune (C and K): a round has only one of them. */
export const SAME_SOUND: string[][] = [['c', 'k']];

/** Runes that look alike on the altar (mirrored B D P): a round has only one of them. */
export const LOOKALIKE_RUNES: string[][] = [['b', 'd', 'p']];
