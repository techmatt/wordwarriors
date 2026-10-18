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
  /** Where she comes in. */
  entry: { x: number; y: number };
}

/** Side rooms off the hub. Two are picked per episode for the fetch games; `attic` is the counter room. */
export const SIDE_ROOMS: SideRoomSpec[] = [
  { id: 'kitchen', name: 'Kitchen', look: 'A cartoon family kitchen: counters, a fridge with drawings, pots on hooks, a tiled floor', glyph: '🍳', palette: [0xffe0b0, 0xc89a6a], spots: [[300, 470], [640, 470], [980, 470]], entry: { x: 640, y: 650 } },
  { id: 'playroom', name: 'Playroom', look: 'A bright playroom: toy boxes, a slide, beanbags, a carpet with a road map', glyph: '🧸', palette: [0xb0e0ff, 0xff9ad5], spots: [[300, 470], [640, 470], [980, 470]], entry: { x: 640, y: 650 } },
  { id: 'garage', name: 'Garage', look: "A tidy garage: a workbench, bikes on the wall, Dada Jason's car under a sheet", glyph: '🔧', palette: [0x9aa6b8, 0x5a6a7a], spots: [[300, 470], [640, 470], [980, 470]], entry: { x: 640, y: 650 } },
  { id: 'attic', name: 'Attic', look: 'A secret attic: sloped roof beams, old trunks, a round window with moonlight, cobwebs, a treasure-hunt feeling', glyph: '🗝️', palette: [0x5a3a2a, 0xffc87a], spots: [[300, 480], [640, 480], [980, 480]], entry: { x: 640, y: 650 } },
];

export const SIDE_ROOM_BY_ID: Record<string, SideRoomSpec> = Object.fromEntries(SIDE_ROOMS.map((r) => [r.id, r]));

/** The fetch rooms (everything but the counter room). */
export const FETCH_ROOMS = SIDE_ROOMS.filter((r) => r.id !== 'attic').map((r) => r.id);
export const COUNTER_ROOM = 'attic';

/**
 * The hub: a small main room with the helper, a magic circle where she learns
 * the spell, two side-room doors, a hidden counter door (appears after the
 * retreat) and the front door (opens once both side rooms are done).
 */
export const HUB = {
  look: 'The small main room of a cosy house seen side-on: a sofa, a rug, a staircase, family pictures, a wooden floor across the lower half; three inner doors along the back wall and a big front door on the right',
  palette: [0xffe8c8, 0x8a5a3a] as [number, number],
  entry: { x: 640, y: 640 },
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
