/** Arenas: id → colours and a glyph strip for the placeholder painter, plus a look for art prompts. */
export const ARENAS: Record<string, { name: string; sky: [number, number]; ground: number; glyph: string; look: string }> = {
  meadow: { name: 'Sunny Meadow', sky: [0x8ad7ff, 0xe8f8ff], ground: 0x6ac46a, glyph: '🌼', look: 'a bright flower meadow with rolling hills' },
  volcano: { name: 'Dragon Volcano', sky: [0x3a0a1a, 0xff7b3a], ground: 0x4a2a2a, glyph: '🌋', look: 'a smoking volcano with lava rivers and dragon nests' },
  kitchen: { name: 'Giant Kitchen', sky: [0xfff1d6, 0xffd6a5], ground: 0xc8a07a, glyph: '🍳', look: 'a cartoon kitchen seen from a toy\'s height, giant pans and spoons' },
  castle: { name: 'Castle Courtyard', sky: [0x5a6aa0, 0xc8d0ff], ground: 0x8a8a9a, glyph: '🏰', look: 'a stone castle courtyard with banners and torches' },
  ice: { name: 'Crystal Ice Palace', sky: [0x9ad8ff, 0xf0faff], ground: 0xd8f0ff, glyph: '🏔️', look: 'an ice palace of glittering crystal spires and snow' },
  desert: { name: 'Golden Dunes', sky: [0xffb15a, 0xffe8b0], ground: 0xe8c890, glyph: '🐪', look: 'golden sand dunes with half-buried statues and a pyramid' },
  // Item 114: Ozymandias's, from Antarctica with a spaceship.
  iceberg: { name: 'Iceberg Launch Pad', sky: [0x0a1a4a, 0x5a8ad8], ground: 0xe8f6ff, glyph: '🚀', look: 'a wide flat snowy iceberg in a dark-blue polar sea at twilight, a starry sky with a soft pink-and-violet aurora, a tall silver rocket ship on a launch pad far off to one side, little ice cliffs and distant icebergs' },
  sea: { name: 'Serpent Sea', sky: [0x2a5aa0, 0x9ad8ff], ground: 0x2a7ab4, glyph: '🌊', look: 'a stormy sea with rocky islands and huge waves' },
  cave: { name: 'Treasure Cave', sky: [0x1a1a2a, 0x5a4a2a], ground: 0x8a6a2a, glyph: '💰', look: 'a cave piled high with gold coins and jewels, lit by lava cracks' },
  factory: { name: 'Robot Factory', sky: [0x2a2d42, 0x6a7a9a], ground: 0x4a4a5a, glyph: '⚙️', look: 'a neon robot factory with conveyor belts and sparks' },
  city: { name: 'Foggy City', sky: [0x3a4a5a, 0xa0b0c0], ground: 0x5a5a6a, glyph: '🎡', look: 'a foggy old city street at night with lamp posts and a fairground' },
  nursery: { name: 'Giant Playroom', sky: [0xffe0f0, 0xfff8e0], ground: 0xc8a07a, glyph: '🧸', look: "a toddler's playroom seen from a toy's height: towering stacks of building blocks, a huge crib, giant soft toys and a squashy play mat" },
  street: { name: 'Sunny Street', sky: [0x8ad7ff, 0xf0f8ff], ground: 0x8a8a92, glyph: '🚗', look: 'a sunny suburban street outside the house, Dada Jason\'s car parked at the kerb' },
  // Fight styles' own places (item 031, content/battle/fights.ts).
  sky_race: { name: 'Treasure Cave Sky Race', sky: [0x1a1a2a, 0x8a6a2a], ground: 0x6a4a1a, glyph: '🏁', look: 'a huge treasure cave seen side-on as a sky-race course: a wide open flying space in the middle, glittering gold coin piles and jewels along the floor, stalactites hanging from the top, glowing lava cracks, coloured lanterns strung across' },
  spell_tower: { name: 'Moonlit Spell Tower', sky: [0x1a0a3a, 0x5a3a8a], ground: 0x4a3a5a, glyph: '🌙', look: "the flat round top of a witch's stone tower at night: a big full moon, purple clouds, swirling stars, glowing rune stones around the edge of a wide flat stone floor" },
  cook_show: { name: 'Cook-Off Studio', sky: [0xfff1d6, 0xff9ad5], ground: 0xd8b088, glyph: '🍳', look: "a bright cartoon TV cooking-contest studio: coloured spotlights, bunting, a big shiny kitchen wall with shelves of pots, fruit and spices behind a wide wooden floor, an empty judges' table at the back" },
};
