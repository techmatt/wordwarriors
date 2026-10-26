/**
 * Charge the Spell's runes (item 053): the letter sounds a rune can carry,
 * each with its gesture and the move it becomes in the battle.
 *
 * The gesture is Jolly Phonics style, one memorable action per sound (S a
 * hissing snake, M rubbing a tummy). The narrator performs it: their sprite
 * bobs and squashes in its `motion` while `glyph` (an emoji prop) does the
 * action beside them, and they say only the sound's own `letter_<x>_sound`
 * line. `text`, the gesture told in words, is neither voiced (since item 058)
 * nor composed into lines.json: it is kept for a teaching mode, should Matt
 * want one (docs/rulings.md). It never names the letter (letter SOUNDS, never
 * names) and never spells the sound ("sss" would be captioned, and edge-tts
 * reads it as "ess").
 *
 * The gesture texts say no bank word at all, stems included
 * (tests/unit/charge.test.ts), and no glyph is a bank word's own picture (a 🥁
 * would show DRUM before she reads it; a mouse reads as RAT, a plane as JET, a
 * ladybird as BUG). A glyph close to one (M's cake slice, E's hatching chick)
 * makes that word a gesture word (`GLYPH_LOOKS_LIKE`, src/rules/charge.ts), so
 * an episode whose Charge uses the rune keeps it out of reading.
 *
 * `tier`: 1 the continuous sounds (she can hold them: M S F A L N R V Z and
 * the short vowels), 2 the quick ones (stops, H W Y J), 3 the digraphs, one
 * sound each: a label only since item 067 (no draw reads it; the unit tests
 * do), every sound in play from the start. Q and X are left out (their placeholders are too unlike the
 * sound, as in the parked games), CK too (C's sound, never first).
 *
 * `move`: the ability her hero fires for the rune in the next battle (the
 * word effects' shape, content/phonics/effects.ts), by the sound's feel: a
 * held hum is a beam, a hiss a wave, a pop a bolt. Its projectile is the
 * gesture's glyph, never a word's picture. Pure data: no Phaser.
 *
 * `picture` (item 097): the rune drawn as a picture letter, its upper-case
 * letter built out of a thing whose name starts with the letter's SOUND (S a
 * snake, M two mountains), so the shape carries the sound for a girl who
 * knows only letter names. Its art is `runeArt(sound)`, its brief `look`. The
 * picture word counts as a gesture word (`gestureWords` in src/rules/charge.ts):
 * when it is a bank word, an episode whose Charge uses the rune keeps it out
 * of reading. Every rune Charge can teach has one (Y and Z start no
 * chargeable word, so they have none).
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

/** A rune drawn as a picture letter: the thing it is built from, and how. */
export interface RunePicture {
  /** The thing's name, starting with the rune's sound. */
  word: string;
  /** The art brief: how the thing makes the letter's shape. */
  look: string;
}

export interface RuneSound {
  /** The sound unit: a letter, or a digraph's two letters (`sh`). Its line is `letter_<sound>_sound`. */
  sound: string;
  tier: RuneTier;
  gesture: { glyph: string; motion: GestureMotion; text: string };
  move: AbilitySpec;
  picture?: RunePicture;
}

/** A rune's picture-letter art id. */
export const runeArt = (sound: string) => `rune_${sound}`;

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
  rune('l', 1, '🎤', 'pulse', 'Sing la, la, la, it goes...', 'orbit', 0xff6ad5, { count: 4 }),
  rune('n', 1, '🕊️', 'fly', 'Arms out wide, like a bird gliding, it goes...', 'dash', 0xbfd4ff, { power: 3 }),
  rune('r', 1, '🐯', 'shake', 'The tiger growls, it goes...', 'slam', 0xffa53d, { power: 3 }),
  rune('v', 1, '🏎️', 'fly', 'The race car zooms past, it goes...', 'dash', 0xff3d3d, { power: 3 }),
  rune('z', 1, '🐝', 'weave', 'The bee buzzes about, it goes...', 'bolt', 0xffd23f, { count: 5, homing: true }),
  rune('e', 1, '🐣', 'shake', 'Tap the egg, crack it open, it goes...', 'lightning', 0xfff4b0),
  rune('i', 1, '👃', 'shake', 'Wiggle your nose like a mouse, it goes...', 'bolt', 0xc0c0d0, { count: 3, homing: true }),
  rune('o', 1, '🔦', 'blink', 'Flick the light on and off, it goes...', 'beam', 0xfff59a, { color2: 0xffffff }),
  rune('u', 1, '👆', 'climb', 'Point up, up, up, it goes...', 'shield', 0x9b5de5, { duration: 4 }),
  // Tier 2: quick sounds.
  rune('t', 2, '🎾', 'bounce', 'Watch the tennis ball go back and forth...', 'bolt', 0xd8ff3d, { count: 4, homing: true }),
  rune('p', 2, '🕯️', 'puff', 'Puff out the candle, it goes...', 'wave', 0xffe0a0, { color2: 0xffffff }),
  rune('b', 2, '⚾', 'bounce', 'Swing hard at the ball, it goes...', 'bolt', 0xffffff, { count: 3, homing: true, power: 3 }),
  rune('d', 2, '🦕', 'pulse', 'The dinosaur takes a step, it goes...', 'slam', 0x5ad17a, { power: 3 }),
  rune('c', 2, '📷', 'blink', 'The camera clicks, it goes...', 'lightning', 0xe0e8ff),
  rune('k', 2, '🚪', 'shake', 'Knock on the door, it goes...', 'rain', 0xa0703a, { count: 10 }),
  rune('g', 2, '🚿', 'weave', 'Water gurgles down the drain, it goes...', 'wave', 0x3d9bff, { color2: 0xbfefff }),
  // Item 157: it panted like a puppy, which says PUP, a bank word now.
  rune('h', 2, '😮', 'pulse', 'Pant after a race, it goes...', 'cone', 0xffffff, { color2: 0xbfefff }),
  rune('j', 2, '🍮', 'pulse', 'The Jell-O wobbles on a plate, it goes...', 'orbit', 0xffb347, { count: 3 }),
  rune('w', 2, '🌬️', 'puff', 'Blow like the wind, it goes...', 'wave', 0xd8f0ff, { color2: 0xffffff }),
  rune('y', 2, '🥄', 'pulse', 'A spoon of yogurt, so good, it goes...', 'rain', 0xfff4e0, { count: 10 }),
  // Tier 3: two letters, one sound.
  rune('sh', 3, '🤫', 'pulse', 'Finger on your mouth, it goes...', 'freeze', 0xbfefff, { duration: 2 }),
  rune('ch', 3, '🚂', 'fly', 'The train chugs along, it goes...', 'dash', 0x8a8a9a, { power: 3 }),
  rune('th', 3, '😛', 'pulse', 'Poke your tongue out, it goes...', 'beam', 0xff8fb0, { color2: 0xffffff }),
];

/**
 * Each taught rune's picture letter. The rune's own gesture is the thing where it
 * draws well (S's snake, F's fire, D's dinosaur, J's jelly as a jellyfish); short
 * vowels take a short-vowel word (Ant, not Apron). A bank word here (ANT, NEST,
 * IGLOO, OCTOPUS, UMBRELLA, VASE) is kept out of reading as a gesture word is.
 * Item 146 (hunt 11's art calls, M67): N a NEST, not a NOODLE (noodles on a fork
 * read as SPAGHETTI), A one ANT, not an ALLIGATOR (often a CROCODILE).
 */
const PICTURES: Record<string, RunePicture> = {
  m: { word: 'mountains', look: 'two snowy-topped mountains side by side make the M: the two peaks are its points and the valley between them its middle dip, a little sun peeking over' },
  s: { word: 'snake', look: 'a friendly smiling snake curls into the S: its body is the S curve, head with a little forked tongue at the top end, tail tip at the bottom end, yellow belly stripe and diamond pattern' },
  f: { word: 'fire', look: 'the F is a campfire log standing upright with two shorter logs sticking out to the right as its two arms, bright orange and yellow flames dancing along the top of the upright and each arm' },
  a: { word: 'ant', look: 'one big friendly red cartoon ant stands tall facing us and makes the A: its two long legs spread wide as the two slanted strokes meeting at its head and feelers at the top point, its two arms joined across its middle as the crossbar, six legs in all' },
  l: { word: 'lizard', look: 'an orange lizard makes the L: its body runs straight up as the tall upright, head at the top, and its long tail bends at the bottom and runs out flat to the right as the foot' },
  n: { word: 'nest', look: 'three straight brown twigs make the N: two standing upright and one running diagonally from the top of the left one down to the bottom of the right one, a round cosy bird\'s nest of woven straw sitting on top of the right twig with three little blue eggs in it' },
  r: { word: 'robot', look: 'a boxy friendly robot makes the R: its straight metal body and leg the upright, its round head with glowing eyes the bowl at the top, and one leg kicking out diagonally as the slanted leg' },
  e: { word: 'elephant', look: 'a grey elephant seen from the side makes the E: its back is the upright, and its trunk, a front leg and a back leg stick out to the right as the three arms, a big ear at the top' },
  i: { word: 'igloo', look: 'the I is a tall pillar built of white snow bricks with the brick lines drawn, a wide snow-brick cap at the top and a wide base at the bottom, a little round igloo doorway in its foot' },
  o: { word: 'octopus', look: 'a purple octopus curls its arms all the way round into a perfect ring for the O, its round friendly face with big eyes at the top of the ring, suckers along the arms' },
  u: { word: 'umbrella', look: 'an open red umbrella turned upside down: its round canopy with ribs and pointed scalloped tips curves into the U, the two tips at the top its two arms, and its long straight shaft with the curved J handle sticks straight up out of the middle of the bowl, so it is plainly an umbrella and not a bowl or a horseshoe; a few raindrops falling into it' },
  t: { word: 'table', look: 'a small round wooden table seen from the side makes the T: its flat top the crossbar, its single central leg the upright, a little cup on top' },
  p: { word: 'popsicle', look: 'a round pink popsicle on a wooden stick makes the P: the stick runs down from its left side as the upright and the round ice pop is the bowl at the top right, a drip on its side' },
  b: { word: 'butterfly', look: 'a butterfly seen side-on clings to the B: its straight body is the upright and its two round colourful wings, one above the other, are the two bumps, little antennae at the top' },
  d: { word: 'dinosaur', look: 'a friendly long-neck dinosaur makes the D: its tall straight neck the upright, its big round back with plates curving out to the right as the bowl, little legs at the bottom' },
  c: { word: 'caterpillar', look: 'a red-and-yellow striped caterpillar curls round into the C, its smiling face at the top end and its tail at the bottom end, little feet along the inside' },
  k: { word: 'kangaroo', look: 'a kangaroo stands tall as the K: its straight upright back and tail the upright stroke, its arms reaching up-right and its big foot kicking down-right as the two slanted strokes' },
  g: { word: 'grapes', look: 'a bunch of round purple grapes curves into the G, grape after grape round the letter, a green leaf and curly stem at the top end and the inward bar at the bottom end made of a short row of grapes' },
  h: { word: 'house', look: 'the H is a little house: its two side walls are the uprights, the floor of the upstairs room the crossbar, a red roof over the top, a door and windows on the walls' },
  j: { word: 'jellyfish', look: 'a pink jellyfish makes the J: its round bell head with a smile is the top, and one long tentacle runs down and hooks to the left at the bottom as the J\'s hook, shorter tentacles beside it' },
  w: { word: 'waves', look: 'two big blue ocean waves side by side make the W: the zigzag water line goes down, up, down, up, white foam curling on the three crests' },
  v: { word: 'vase', look: 'a blue china vase shaped like the V, wide at the top and coming to a point at the bottom, a bunch of bright flowers poking out of the top' },
  sh: { word: 'shark', look: 'the S is a friendly grey-blue shark curving through the water, fin up and smiling, and the H beside it is two posts of a wooden dock with a plank across, little waves at their feet; the two letters side by side' },
  ch: { word: 'cherries', look: 'the C is a curved stem with cherries hanging along it, and the H beside it is two cherry stems standing up with a leafy twig across, a pair of shiny red cherries at the top of each; the two letters side by side' },
  // Item 097: not THUMB, whose thumbs-up T (a raised digit over a fist) read as a rude finger in both candidates.
  th: { word: 'thunder', look: 'a grumbly grey storm cloud is the T\'s crossbar with a big yellow lightning bolt coming straight down from its middle as the upright, and the H beside it is two lightning bolts standing as its uprights with a small storm cloud across their middle as the crossbar; the two letters side by side, no hands or people' },
};

for (const r of RUNES) r.picture = PICTURES[r.sound];

export const RUNE_BY_SOUND: Record<string, RuneSound> =Object.fromEntries(RUNES.map((r) => [r.sound, r]));
