/**
 * The house, as data: bedrooms, the hub, and the side rooms.
 *
 * An episode starts in a bedroom (one now; more are more entries here),
 * walks into the small main house (the hub), and fetches things from side
 * rooms through the hub's doors. The villain's mood (`CharacterSpec.house`)
 * is laid over every room at run time, so no room art is villain-specific.
 *
 * Art ids derived here: `room_bedroom_<id>`, `obj_<object id>`, `room_hub`,
 * `room_side_<id>`. Positions are design pixels (1280×720), feet of the thing.
 */

export type Reaction = 'wiggle' | 'pop' | 'alive' | 'bounce' | 'glow' | 'squeak';
export type ReactionSound = 'boing' | 'zap' | 'summon' | 'pew' | 'oink' | 'shout' | 'poof' | 'key' | 'whoosh';

export interface BedroomObject {
  id: string;
  /** Placeholder emoji. */
  glyph: string;
  /** Art brief. */
  look: string;
  x: number;
  y: number;
  /** Display box. */
  w: number;
  h: number;
  /** What pressing green next to it does. No reading in the bedroom. */
  reaction: Reaction;
  sound: ReactionSound;
}

export interface BedroomSpec {
  id: string;
  look: string;
  palette: [number, number];
  /** Where she wakes up (the bed is drawn there). */
  bed: { x: number; y: number };
  /** The way out to the hub; sparkles if she has not found it after a while. */
  door: { x: number; y: number };
  /** Where Dada Matt stands to give the news. */
  waker: { x: number; y: number };
  objects: BedroomObject[];
}

export const BEDROOMS: BedroomSpec[] = [
  {
    id: 'julia',
    look: "A four-year-old's cosy, cluttered bedroom seen side-on: star wallpaper, a window, a rug, toy shelves, a wooden floor across the lower half",
    palette: [0x6a4a9a, 0xffd8f0],
    bed: { x: 230, y: 520 },
    door: { x: 1150, y: 430 },
    waker: { x: 1030, y: 470 },
    objects: [
      { id: 'teddy', glyph: '🧸', look: 'a floppy teddy bear', x: 420, y: 450, w: 90, h: 90, reaction: 'alive', sound: 'boing' },
      { id: 'drum', glyph: '🥁', look: 'a toy drum with sticks', x: 560, y: 600, w: 90, h: 90, reaction: 'bounce', sound: 'shout' },
      { id: 'rocket', glyph: '🚀', look: 'a toy rocket on a launch pad', x: 700, y: 440, w: 90, h: 110, reaction: 'pop', sound: 'whoosh' },
      { id: 'lamp', glyph: '💡', look: 'a night-light shaped like a bulb', x: 330, y: 650, w: 70, h: 80, reaction: 'glow', sound: 'zap' },
      { id: 'duck', glyph: '🦆', look: 'a rubber duck', x: 840, y: 620, w: 70, h: 70, reaction: 'squeak', sound: 'oink' },
      { id: 'robot', glyph: '🤖', look: 'a wind-up toy robot', x: 900, y: 460, w: 90, h: 100, reaction: 'alive', sound: 'pew' },
      { id: 'ball', glyph: '⚽', look: 'a bouncy ball', x: 650, y: 680, w: 60, h: 60, reaction: 'bounce', sound: 'boing' },
      { id: 'unicorn', glyph: '🦄', look: 'a plush unicorn', x: 480, y: 690, w: 80, h: 80, reaction: 'wiggle', sound: 'summon' },
      { id: 'blocks', glyph: '🧱', look: 'a tower of toy blocks', x: 1010, y: 650, w: 80, h: 90, reaction: 'pop', sound: 'poof' },
    ],
  },
];

export interface SideRoomSpec {
  id: string;
  name: string;
  look: string;
  glyph: string;
  palette: [number, number];
  /** Three places the answer objects stand. */
  spots: [number, number][];
  /** Where she comes in: above the dialogue box along the bottom (item 024), so it never hides her. */
  entry: { x: number; y: number };
}

/** Side rooms off the hub. Two are picked per episode for the fetch games; `attic` is the counter room. */
export const SIDE_ROOMS: SideRoomSpec[] = [
  { id: 'kitchen', name: 'Kitchen', look: 'A cartoon family kitchen: counters, a fridge with drawings, pots on hooks, a tiled floor', glyph: '🍳', palette: [0xffe0b0, 0xc89a6a], spots: [[300, 470], [640, 470], [980, 470]], entry: { x: 640, y: 580 } },
  { id: 'playroom', name: 'Playroom', look: 'A bright playroom: toy boxes, a slide, beanbags, a carpet with a road map', glyph: '🧸', palette: [0xb0e0ff, 0xff9ad5], spots: [[300, 470], [640, 470], [980, 470]], entry: { x: 640, y: 580 } },
  { id: 'garage', name: 'Garage', look: "A tidy garage: a workbench, bikes on the wall, Dada Jason's car under a sheet", glyph: '🔧', palette: [0x9aa6b8, 0x5a6a7a], spots: [[300, 470], [640, 470], [980, 470]], entry: { x: 640, y: 580 } },
  { id: 'attic', name: 'Attic', look: 'A secret attic: sloped roof beams, old trunks, a round window with moonlight, cobwebs, a treasure-hunt feeling', glyph: '🗝️', palette: [0x5a3a2a, 0xffc87a], spots: [[300, 480], [640, 480], [980, 480]], entry: { x: 640, y: 580 } },
];

/** The home's fetch rooms (everything in the house but the counter room). */
export const FETCH_ROOMS = SIDE_ROOMS.filter((r) => r.id !== 'attic').map((r) => r.id);
export const COUNTER_ROOM = 'attic';

/**
 * Quest places (item 025): where an ally takes her to train instead of the
 * house (content/house/quests.ts says who goes where). A place is a hub of its
 * own (`room_place_<id>`, laid out like the house's hub: the helper, the magic
 * circle, two doors, a secret door and the way out) and its side rooms
 * (`room_side_<id>`): two fetch rooms and the secret room for the counter
 * sentence. `home` is the house itself, for an ally with no quest place.
 */
export interface PlaceSpec {
  id: string;
  /** Short name, for logs and the grown-ups page. */
  name: string;
  /** The journey map's stop icon and the secret door's plaque. */
  glyph: string;
  /** The hub's art brief. */
  look: string;
  palette: [number, number];
  /** The two fetch rooms (doors a and b), as side rooms. */
  rooms: SideRoomSpec[];
  /** The secret room behind the secret door, where the counter sentence is. */
  secret: SideRoomSpec;
  /**
   * Where the villain's floor decals lie in this hub, `[x, y, w, h]`, when its
   * art's floor is not the house hub's (the treehouse deck ends higher, with
   * treetops below it). Default: the hub's walking floor.
   */
  moodFloor?: [number, number, number, number];
  /** Open sky where the house has a back wall: the villain's mess all lies on the floor (item 030). */
  outdoor?: boolean;
}

const SPOTS: [number, number][] = [[300, 470], [640, 470], [980, 470]];
const ENTRY = { x: 640, y: 580 };
function room(id: string, name: string, glyph: string, palette: [number, number], look: string): SideRoomSpec {
  return { id, name, look, glyph, palette, spots: SPOTS, entry: ENTRY };
}

/**
 * Secret rooms shared by the places drawn after the first eight (art budget,
 * item 025): any place may use it as its secret room.
 */
const HIDEOUT = room('secret_hideout', 'Secret Hideout', '💎', [0x2a2a4a, 0x9ad8ff], 'A secret hideout: a cosy hidden cave with glowing blue and pink crystals, a little lantern, an old treasure chest, a treasure-hunt feeling');

export const PLACES: PlaceSpec[] = [
  {
    id: 'treehouse', name: 'Treehouse Workshop', glyph: '🌳', palette: [0x8ad7a0, 0xa0683a],
    outdoor: true,
    look: "Dada Matt's secret treehouse workshop high in a giant oak tree, seen side-on: a wide wooden deck floor across the lower half, rope railings, half-built wooden towers, tool racks, leafy branches and sunbeams all around",
    moodFloor: [80, 445, 1120, 105],
    rooms: [
      room('lumber_loft', 'Lumber Loft', '🌲', [0xc89a6a, 0x6a4a2a], 'The lumber loft in the treehouse: stacks of planks, a big saw bench, a pulley crane with a rope, sawdust on the floorboards, leaves at the windows'),
      room('tool_hut', 'Tool Hut', '🔧', [0xa0683a, 0xffd8a0], 'The tool hut up in the branches: pegboards of hammers and spanners, a long workbench, jars of nails and screws, a round window full of leaves'),
    ],
    secret: room('treetop_lookout', 'Treetop Lookout', '🔭', [0x2a3a6a, 0xffd23f], 'The secret treetop lookout above the leaves at night: a round wooden platform, a brass telescope, a little flag, the moon and stars, a treasure-hunt feeling'),
  },
  {
    id: 'forest_gym', name: 'Forest Gym', glyph: '🏋️', palette: [0x6ac46a, 0xc89a6a],
    outdoor: true,
    look: "Dada Matt's secret gym in the forest, seen side-on: a sunny clearing with a grassy floor across the lower half, log benches, round stone weights, tree-trunk pull-up bars and a rope climb hanging from a big branch, tall trees all around",
    rooms: [
      room('boulder_yard', 'Boulder Yard', '⛰️', [0x8a8a7a, 0x6ac46a], 'The boulder yard in the forest: round rocks of every size to lift, a stack of log barbells, a little stream with stepping stones, ferns'),
      room('climb_rocks', 'Climbing Rocks', '🧗', [0x9a7a5a, 0x6ac46a], 'The climbing rocks in the forest: a friendly mossy cliff with bright coloured climbing holds, ropes and a squashy crash mat, ferns and flowers all round'),
    ],
    secret: room('waterfall_cave', 'Waterfall Cave', '💧', [0x2a5a7a, 0x9ad8ff], 'A secret cave behind a waterfall: a sparkling curtain of falling water, glowing crystals in the rock, a golden trophy on a stone, a treasure-hunt feeling'),
  },
  {
    id: 'hacker_den', name: 'Hacker Den', glyph: '💻', palette: [0x1a1a3a, 0x3ae0ff],
    look: "Dada Matt's secret hacker den in a neon city, seen side-on: a cosy loft with glowing screens of abstract shapes, tidy cables, beanbags, a dark floor across the lower half, a big window on a rainy neon skyline, cyan and magenta lights (no letters or numbers on any screen)",
    rooms: [
      room('server_room', 'Server Room', '🖥️', [0x1a2a4a, 0x3ae0ff], 'The server room: tall blinking server racks, cool blue light, neat cable bundles, a shiny floor (no letters or numbers anywhere)'),
      room('drone_hangar', 'Drone Hangar', '🛸', [0x2a2d42, 0xff4ad8], 'The drone hangar: round landing pads with painted circles, little drones on charging docks, robot tool arms, a big hangar door with neon light (no letters or numbers anywhere)'),
    ],
    secret: room('mainframe_core', 'Mainframe Core', '💠', [0x0a0a2a, 0x3ae0ff], 'The secret mainframe core: a huge glowing crystal computer core in the middle of a round chamber, rings of cyan and magenta light, a treasure-hunt feeling (no letters or numbers anywhere)'),
  },
  {
    id: 'rune_dojo', name: 'Rune Dojo', glyph: '🗡️', palette: [0x2a4aa0, 0xd8f0ff],
    outdoor: true,
    look: "Dada Matt's rune dojo on a mountain top, seen side-on: a polished wooden training floor across the lower half, sword racks, glowing blue rune stones, paper lanterns, snowy peaks and clouds behind",
    rooms: [
      room('sword_yard', 'Sword Yard', '⚔️', [0xe8c890, 0x2a4aa0], 'The sword yard of the mountain dojo: straw training dummies, wooden practice swords on racks, a sand circle, blue banners with rune shapes, peaks behind'),
      room('spell_library', 'Spell Library', '📚', [0x3a2a6a, 0x7ab8ff], 'The spell library of the mountain dojo: tall shelves of spell books, floating candles, a big crystal ball on a stand, a ceiling painted with stars'),
    ],
    secret: room('crystal_vault', 'Crystal Vault', '💎', [0x1a2a5a, 0x7ab8ff], 'The secret crystal vault deep in the mountain: glowing blue crystals, a stone pedestal, a round rune door, a treasure-hunt feeling'),
  },
  {
    id: 'secret_kitchen', name: 'Secret Kitchen', glyph: '👨‍🍳', palette: [0xfff1d6, 0xe63946],
    look: "Dada Jason's secret kitchen hidden under the city, seen side-on: a huge cheerful restaurant kitchen with shiny copper pots, a giant pizza oven, hanging herbs, a checkered floor across the lower half, steam and twinkly lights",
    rooms: [
      room('pantry', 'Pantry', '🧀', [0xffd8a0, 0xc89a6a], 'The giant pantry of the secret kitchen: towering shelves of jars, flour sacks, cheese wheels, strings of garlic, a rolling ladder'),
      room('bakery', 'Bakery', '🥐', [0xffe0b0, 0xff8c42], 'The bakery corner of the secret kitchen: ovens glowing warm, racks of bread and cakes, a giant mixer, flour dust in the air'),
    ],
    secret: room('sweet_cellar', 'Sweet Cellar', '🍫', [0x5a3a2a, 0xff9ad5], 'The secret dessert cellar: a chocolate fountain, ice-cream barrels, giant candy jars, fairy lights, a treasure-hunt feeling'),
  },
  {
    id: 'knight_camp', name: "Knights' Camp", glyph: '🏰', palette: [0x6ac46a, 0xe63946],
    outdoor: true,
    look: "Dada Jason's knights' training camp outside a castle, seen side-on: striped tents, a practice field of trampled grass across the lower half, weapon racks, bright banners, a castle on the hill behind",
    rooms: [
      room('armoury', 'Armoury', '🛡️', [0x8a8a9a, 0xe63946], 'The armoury tent of the knights camp: shiny suits of armour on stands, round shields on the walls, a forge glowing in the corner, a straw floor'),
      room('practice_ring', 'Practice Ring', '🎯', [0xc8a07a, 0xffd23f], 'The practice ring of the knights camp: a wooden fence ring, round straw targets, a wooden horse on wheels, flags flapping'),
    ],
    secret: room('tower_room', 'Tower Room', '🗝️', [0x4a4a5a, 0xffc87a], 'The secret room at the top of the castle tower: a round stone room, a great round window, an old chest, a sword stuck in a stone, torches, a treasure-hunt feeling'),
  },
  {
    id: 'moon_tower', name: 'Purple Moon Tower', glyph: '🌙', palette: [0x3a1a5a, 0xb04aff],
    look: "Dada Jason's purple-moon tower, seen side-on: a friendly wizard tower room with a huge round window full of a giant purple moon, bubbling cauldrons, stacks of spell books, candles, a stone floor across the lower half; cosy and magical, not scary",
    rooms: [
      room('potion_room', 'Potion Room', '🧪', [0x2a1a4a, 0xff9ad5], 'The potion room of the purple-moon tower: shelves of glowing bottles, a bubbling cauldron, drying herbs, a big mushroom stool; cosy, not scary'),
      room('imp_nursery', 'Imp Nursery', '😈', [0x4a2a6a, 0xffd23f], 'The imp playroom of the purple-moon tower: tiny hammocks, little toy broomsticks, a heap of cushions, purple bunting, a rocking chair; cosy, not scary'),
    ],
    secret: room('star_observatory', 'Star Observatory', '🔭', [0x0a0a2a, 0xb04aff], 'The secret observatory at the very top of the tower: a big brass telescope, a domed roof open to the stars, star charts, a treasure-hunt feeling'),
  },
  {
    id: 'bubble_castle', name: 'Bubble Castle', glyph: '💭', palette: [0xd8f0ff, 0xff9ad5],
    outdoor: true,
    look: "Ellie's bubble castle in the clouds, seen side-on: a soft fluffy cloud floor across the lower half, pastel towers, giant floating rainbow bubbles, rainbow bridges and a sparkly fountain",
    rooms: [
      room('bubble_baths', 'Bubble Baths', '🛁', [0xbfefff, 0xff9ad5], 'The bubble baths of the cloud castle: big shell-shaped bathtubs overflowing with rainbow bubbles, yellow rubber ducks, a bubble slide'),
      room('toy_cloud', 'Toy Cloud', '🧸', [0xfff0f8, 0x9ad8ff], 'The toy cloud of the cloud castle: soft clouds piled with giant soft toys, a cloud trampoline, kites in a pastel sky'),
    ],
    secret: room('rainbow_room', 'Rainbow Room', '🌈', [0x9ad8ff, 0xffd23f], 'The secret rainbow room of the cloud castle: a rainbow arching across, glittering stars, a crystal treasure chest, a treasure-hunt feeling'),
  },
  {
    id: 'dragon_mountain', name: 'Dragon Mountain', glyph: '🐉', palette: [0xffb15a, 0x6a4a3a],
    outdoor: true,
    look: 'A dragon mountain, seen side-on: a sunny wide ledge high on a mountain with warm rock across the lower half, big straw dragon nests with golden eggs, clouds below and a far-off smoking volcano',
    rooms: [
      room('egg_nest', 'Egg Nest', '🥚', [0xe8c890, 0xff7b3a], 'The nest cave of the dragon mountain: soft straw nests with big spotted dragon eggs, warm glowing rocks, a sunny cave mouth'),
      room('flight_cliff', 'Flight Cliff', '☁️', [0x8ad7ff, 0xc89a6a], 'The flying cliff of the dragon mountain: a high rocky ledge with wind streamers, clouds below, a rope swing on a dead tree'),
    ],
    secret: HIDEOUT,
  },
  {
    id: 'ice_castle', name: 'Ice Castle', glyph: '❄️', palette: [0xd8f0ff, 0x7cc7ff],
    look: 'A sparkly ice castle hall, seen side-on: crystal pillars, a frozen fountain, falling snowflakes, a shiny ice floor dusted with snow across the lower half',
    rooms: [
      room('snow_garden', 'Snow Garden', '⛄', [0xf0faff, 0x7cc7ff], 'The snow garden of the ice castle: friendly snowmen, ice sculptures of animals, frosty trees, soft snow underfoot'),
      room('skating_pond', 'Skating Pond', '⛸️', [0xbfefff, 0x5a8ac8], 'The skating pond of the ice castle: a frozen pond, little wooden sledges, snowy fir trees, twinkling lights'),
    ],
    secret: HIDEOUT,
  },
  {
    id: 'desert_oasis', name: 'Desert Oasis', glyph: '🌴', palette: [0xffe8b0, 0x1fb5a8],
    outdoor: true,
    look: 'A desert oasis, seen side-on: palm trees, a sparkling blue pool, colourful striped tents, warm sand across the lower half, dunes and a pyramid far away',
    rooms: [
      room('bazaar_tent', 'Bazaar Tent', '🏮', [0xc83a5a, 0xffc857], 'The bazaar tent of the oasis: piles of rugs and cushions, hanging lanterns, baskets of fruit, a striped canvas roof'),
      room('sand_dunes', 'Sand Dunes', '🐪', [0xffb15a, 0xffe8b0], 'The sand dunes by the oasis: rolling golden dunes, a flying carpet resting on the sand, a friendly half-buried statue head'),
    ],
    secret: HIDEOUT,
  },
  {
    id: 'sea_grotto', name: 'Sea Grotto', glyph: '🐚', palette: [0x2a7ab4, 0x9ad8ff],
    outdoor: true,
    look: 'An underwater grotto, seen side-on: bright coral, swaying sea plants, rising bubbles, a sandy floor across the lower half, sunbeams through the water, little friendly fish',
    rooms: [
      room('coral_garden', 'Coral Garden', '🐠', [0xff9ad5, 0x2a7ab4], 'The coral garden under the sea: towers of pink and orange coral, sea anemones, shells on the sand, bubbles'),
      room('shipwreck', 'Shipwreck', '⚓', [0x6a4a2a, 0x2a7ab4], 'A friendly sunken ship under the sea: a tilted wooden deck, a big ship wheel, barrels and a little treasure chest, fish swimming through'),
    ],
    secret: HIDEOUT,
  },
  {
    // Item 030: Scar's own, when he joined the active cast.
    id: 'robot_workshop', name: 'Robot Workshop', glyph: '🤖', palette: [0x2a2d42, 0xffc233],
    look: "Scar's robot workshop, seen side-on: a bright, tidy workshop with a shiny metal floor across the lower half, a small gold charging pod glowing orange, robot arms on the walls, shelves of gears and springs, warm yellow lights and a big round window on a starry sky (no letters or numbers anywhere)",
    rooms: [
      room('parts_bay', 'Parts Bay', '⚙️', [0x5a6a7a, 0xffc233], 'The parts bay of the robot workshop: bins of colourful gears, springs and bolts, a little conveyor belt, a workbench with tools, a shiny metal floor (no letters or numbers anywhere)'),
      room('rocket_pad', 'Rocket Pad', '🚀', [0x1a2a4a, 0xff9a3c], 'The rocket test pad of the robot workshop: a round launch pad with painted rings, scorch marks, little practice rockets on stands, a big open roof hatch with blue sky (no letters or numbers anywhere)'),
    ],
    secret: HIDEOUT,
  },
];

export const PLACE_BY_ID: Record<string, PlaceSpec> = Object.fromEntries(PLACES.map((p) => [p.id, p]));
/** The house itself, for a quest with no place of its own. */
export const HOME = 'home';

/** Every side room: the house's, then each place's (a shared secret room once). */
export const ALL_SIDE_ROOMS: SideRoomSpec[] = [...new Map([...SIDE_ROOMS, ...PLACES.flatMap((p) => [...p.rooms, p.secret])].map((r) => [r.id, r])).values()];

export const SIDE_ROOM_BY_ID: Record<string, SideRoomSpec> = Object.fromEntries(ALL_SIDE_ROOMS.map((r) => [r.id, r]));

/** The hub's art: the house's `room_hub`, or a place's own. */
export const hubArt = (place: string) => (place === HOME ? 'room_hub' : `room_place_${place}`);

/**
 * The hub: a small main room with the helper, a magic circle where she learns
 * the spell, two side-room doors, a hidden counter door (appears after the
 * retreat) and the front door (opens once both side rooms are done).
 */
export const HUB = {
  look: 'The small main room of a cosy house seen side-on: a sofa, a rug, a staircase, family pictures, a wooden floor across the lower half; three inner doors along the back wall and a big front door on the right',
  palette: [0xffe8c8, 0x8a5a3a] as [number, number],
  // Where she lands from the bedroom: right of the circle, clear of the
  // caption ribbon, so "stand in the magic circle" is a short walk.
  entry: { x: 900, y: 560 },
  // Between doors a and b, clear of both, of where she lands back from either
  // (door x, y + 90), and of the magic circle.
  helper: { x: 385, y: 520 },
  circle: { x: 640, y: 560 },
  doors: {
    a: { x: 250, y: 400 },
    b: { x: 520, y: 400 },
    counter: { x: 820, y: 400 },
    front: { x: 1130, y: 430 },
  },
} as const;
