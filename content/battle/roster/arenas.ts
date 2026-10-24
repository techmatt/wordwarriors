/**
 * An arena's ambience in battle (`BattleScene.ambience`, item 134): one stream of
 * white particles, tinted, falling from the top or rising from the bottom behind
 * the fighters. Unset fields take the defaults: sideways drift -25..25, rise
 * 30..90 or fall 40..120 px/s, a 9 s life, one every 140 ms, fading from 0.8,
 * shrinking 0.7 → 0.1 (a ring growing 0.12 → 0.2, smoke 0.4 → 1.2), added light.
 */
export interface Ambience {
  /** The particle, a TEX key (src/fx/textures.ts). */
  tex: 'spark' | 'smoke' | 'ring' | 'pixel' | 'star' | 'square' | 'bubble' | 'block' | 'leaf';
  tint: number[];
  /** Rises from below the screen; else falls from above it. */
  up: boolean;
  /** Blows in from the left edge, anywhere up its height (still rising or falling by `up`): a breeze. */
  fromLeft?: boolean;
  /** Sideways speed, px/s. */
  speedX?: [number, number];
  /** Up or down speed, px/s, both positive whichever way it goes. */
  speedY?: [number, number];
  /** One particle every this many ms. */
  frequency?: number;
  lifespan?: number;
  /** Scale over its life (`start`/`end`), or one fixed scale each picked between `min` and `max`. */
  scale?: { start: number; end: number } | { min: number; max: number };
  alpha?: { start: number; end: number };
  /** Normal paint instead of added light: added light vanishes on a pale sky. */
  paint?: boolean;
  /** Turns as it goes, degrees a frame, from a random angle. */
  spin?: number;
}

/** Sunny meadow sparkles: the fallback for an arena key with no entry. */
const SPARKLES: Ambience = { tex: 'spark', tint: [0xffffff, 0xffd23f, 0xff9ad5], up: false };

/**
 * Arenas: id → colours and a glyph strip for the placeholder painter, a look for
 * art prompts, and the battle's ambience (every arena names its own).
 */
export const ARENAS: Record<string, { name: string; sky: [number, number]; ground: number; glyph: string; look: string; ambience: Ambience }> = {
  meadow: { name: 'Sunny Meadow', sky: [0x8ad7ff, 0xe8f8ff], ground: 0x6ac46a, glyph: '🌼', look: 'a bright flower meadow with rolling hills', ambience: SPARKLES },
  volcano: { name: 'Dragon Volcano', sky: [0x3a0a1a, 0xff7b3a], ground: 0x4a2a2a, glyph: '🌋', look: 'a smoking volcano with lava rivers and dragon nests', ambience: { tex: 'spark', tint: [0xff7b00, 0xffd23f, 0xff3d00], up: true } },
  kitchen: { name: 'Giant Kitchen', sky: [0xfff1d6, 0xffd6a5], ground: 0xc8a07a, glyph: '🍳', look: 'a cartoon kitchen seen from a toy\'s height, giant pans and spoons', ambience: { tex: 'smoke', tint: [0xffffff, 0xfff1d6], up: true } },
  castle: { name: 'Castle Courtyard', sky: [0x5a6aa0, 0xc8d0ff], ground: 0x8a8a9a, glyph: '🏰', look: 'a stone castle courtyard with banners and torches', ambience: { tex: 'spark', tint: [0xffd23f, 0xff9a3c], up: true } },
  ice: { name: 'Crystal Ice Palace', sky: [0x9ad8ff, 0xf0faff], ground: 0xd8f0ff, glyph: '🏔️', look: 'an ice palace of glittering crystal spires and snow', ambience: { tex: 'spark', tint: [0xffffff, 0xdff4ff], up: false } },
  desert: { name: 'Golden Dunes', sky: [0xffb15a, 0xffe8b0], ground: 0xe8c890, glyph: '🐪', look: 'golden sand dunes with half-buried statues and a pyramid', ambience: { tex: 'pixel', tint: [0xe8c890, 0xffe8b0], up: false, speedX: [120, 260], frequency: 40 } },
  // Item 114: Ozymandias's, from Antarctica with a spaceship; snow falling.
  iceberg: { name: 'Iceberg Launch Pad', sky: [0x0a1a4a, 0x5a8ad8], ground: 0xe8f6ff, glyph: '🚀', look: 'a wide flat snowy iceberg in a dark-blue polar sea at twilight, a starry sky with a soft pink-and-violet aurora, a tall silver rocket ship on a launch pad far off to one side, little ice cliffs and distant icebergs', ambience: { tex: 'spark', tint: [0xffffff, 0xdff4ff, 0xbfe8ff], up: false } },
  sea: { name: 'Serpent Sea', sky: [0x2a5aa0, 0x9ad8ff], ground: 0x2a7ab4, glyph: '🌊', look: 'a stormy sea with rocky islands and huge waves', ambience: { tex: 'ring', tint: [0x9ad8ff, 0xffffff], up: true } },
  cave: { name: 'Treasure Cave', sky: [0x1a1a2a, 0x5a4a2a], ground: 0x8a6a2a, glyph: '💰', look: 'a cave piled high with gold coins and jewels, lit by lava cracks', ambience: { tex: 'spark', tint: [0xffd23f, 0xff7b00], up: true } },
  factory: { name: 'Robot Factory', sky: [0x2a2d42, 0x6a7a9a], ground: 0x4a4a5a, glyph: '⚙️', look: 'a neon robot factory with conveyor belts and sparks', ambience: { tex: 'pixel', tint: [0x00f5d4, 0xffcc33], up: false } },
  city: { name: 'Foggy City', sky: [0x3a4a5a, 0xa0b0c0], ground: 0x5a5a6a, glyph: '🎡', look: 'a foggy old city street at night with lamp posts and a fairground', ambience: { tex: 'smoke', tint: [0xa0b0c0, 0xffffff], up: false } },
  // Matt's picks from item 134's candidates (item 136): the nursery's toy blocks tumbling down, the street's leaves on a breeze.
  nursery: { name: 'Giant Playroom', sky: [0xffe0f0, 0xfff8e0], ground: 0xc8a07a, glyph: '🧸', look: "a toddler's playroom seen from a toy's height: towering stacks of building blocks, a huge crib, giant soft toys and a squashy play mat", ambience: { tex: 'block', tint: [0xff4a4a, 0xffd23f, 0x3a8aff, 0x3ac46a, 0xff9a3c], up: false, speedY: [60, 120], frequency: 320, scale: { min: 0.9, max: 1.4 }, alpha: { start: 1, end: 0.5 }, paint: true, spin: 2 } },
  street: { name: 'Sunny Street', sky: [0x8ad7ff, 0xf0f8ff], ground: 0x8a8a92, glyph: '🚗', look: 'a sunny suburban street outside the house, Dada Jason\'s car parked at the kerb', ambience: { tex: 'leaf', tint: [0x6ac46a, 0x3a9a4a, 0xffb13a, 0xe8742a, 0xffd23f], up: false, fromLeft: true, speedX: [90, 200], speedY: [10, 50], frequency: 220, lifespan: 14000, scale: { min: 1.1, max: 1.7 }, alpha: { start: 1, end: 0.6 }, paint: true, spin: 3 } },
  // Fight styles' own places (item 031, content/battle/fights.ts).
  sky_race: { name: 'Treasure Cave Sky Race', sky: [0x1a1a2a, 0x8a6a2a], ground: 0x6a4a1a, glyph: '🏁', look: 'a huge treasure cave seen side-on as a sky-race course: a wide open flying space in the middle, glittering gold coin piles and jewels along the floor, stalactites hanging from the top, glowing lava cracks, coloured lanterns strung across', ambience: { tex: 'spark', tint: [0xffd23f, 0xff7b00, 0xffffff], up: true } },
  spell_tower: { name: 'Moonlit Spell Tower', sky: [0x1a0a3a, 0x5a3a8a], ground: 0x4a3a5a, glyph: '🌙', look: "the flat round top of a witch's stone tower at night: a big full moon, purple clouds, swirling stars, glowing rune stones around the edge of a wide flat stone floor", ambience: { tex: 'spark', tint: [0xb04aff, 0x80ffdb, 0xffffff], up: true } },
  cook_show: { name: 'Cook-Off Studio', sky: [0xfff1d6, 0xff9ad5], ground: 0xd8b088, glyph: '🍳', look: "a bright cartoon TV cooking-contest studio: coloured spotlights, bunting, a big shiny kitchen wall with shelves of pots, fruit and spices behind a wide wooden floor, an empty judges' table at the back", ambience: { tex: 'spark', tint: [0xffffff, 0xff9ad5, 0xffd23f], up: false } },
};
