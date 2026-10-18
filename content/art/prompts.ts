/**
 * Image-generation prompts for real art, keyed by asset id (content/art/assets.ts).
 *
 * `npm run art:gen -- <ids…>` sends STYLE + the asset's prompt to Codex's
 * built-in image tool. Sprites are generated on flat #00FF00 and keyed to
 * transparency; rooms and arenas are full-bleed. The style block is Matt's
 * (2026-10-18), word for word for sprites; backgrounds swap its last sentence.
 *
 * Every asset has a prompt: by default it is derived from the asset's brief
 * (the same text as docs/art.md), so changing a look in the roster or the house
 * changes the prompt too. HAND holds the ones written out where the brief alone
 * draws the wrong thing (a word that has two meanings, a room the game draws on).
 */

import { ART_ASSETS, type ArtAsset } from './assets.js';

export const STYLE =
  "Bright, bold children's game art for a 4-year-old: friendly cartoon style, thick clean dark outlines, flat cel shading, saturated cheerful colors, simple readable shapes, storybook warmth. No text, letters or numbers anywhere in the image.";

export const SPRITE_STYLE = `${STYLE} Single subject centered, full body, on a flat pure #00FF00 green background (sprites only).`;

export const BACKGROUND_STYLE = `${STYLE} A full-bleed background painting filling the whole frame edge to edge, no border, no characters.`;

/**
 * Sprites with no green of their own. Keying treats every green tint in them as
 * the screen showing through (a cage's faint back bars), not just the edges.
 * Leave out anything meant to have green in it (a leaf, a dragon).
 */
export const NO_GREEN = new Set(['char_rilla_evil', 'char_rilla_good', 'char_elsa_good', 'pic_mice', 'pic_net', 'prop_magic_circle', 'prop_ice_block']);

/** Word pictures: one meaning each, and unlike their look-alikes (content/phonics/sentences.ts LOOKALIKES). */
const PICTURES: Record<string, string> = {
  cat: 'a cat: a cute orange tabby cat sitting, tail curled, whiskers',
  dog: 'a dog: a friendly brown puppy with floppy ears sitting, tongue out',
  sun: 'the sun: a big round yellow sun with a smiling face and rays',
  fox: 'a fox: a red-orange fox with a bushy white-tipped tail, sitting',
  bug: 'a bug: a cute round ladybird beetle, red with black spots, six little legs',
  pig: 'a pig: a chubby pink pig with a curly tail, standing side-on',
  hat: 'a hat: a tall black top hat with a red band, nothing else',
  bed: "a bed: a child's bed with a puffy blue duvet and a white pillow, side-on",
  cup: 'a cup: a single red mug with a handle, steam curling up',
  map: 'a map: a treasure map on old parchment, partly unrolled, a dotted path and a red X, no writing',
  fan: 'a fan: an electric desk fan with a round cage and blades on a stand',
  web: 'a web: a round spider web with a tiny friendly spider in the middle',
  bus: 'a bus: a long yellow school bus, side-on',
  hen: 'a hen: a plump brown hen with a red comb, standing side-on',
  box: 'a box: a closed brown cardboard box with tape across the top',
  pen: 'a pen: a single blue ballpoint pen with a clip, lying diagonally',
  van: 'a van: a small boxy red delivery van, side-on',
  bat: 'a bat: a cute purple cartoon bat (the animal) with wings spread wide',
  bag: 'a bag: a pink handbag with a curved handle and a clasp',
  can: 'a can: a single tin can of food with a plain coloured paper wrapper, no writing',
  nut: 'a nut: a single brown acorn-style hazelnut in its shell',
  tub: 'a tub: a white bathtub on little feet, full of bubbles',
  cap: 'a cap: a blue baseball cap with a curved peak, side-on',
  pin: 'a pin: a single red push-pin, the kind for a notice board',
  jet: 'a jet: a white jet aeroplane flying, side-on, swept-back wings',
  log: 'a log: a single cut wooden log lying down, rings showing on the end',
  mop: 'a mop: a floor mop with a long wooden handle and a floppy white mop head',
  pot: 'a pot: a big silver cooking pot with two handles and a lid',
  rat: 'a rat: a grey rat with a long pink tail, side-on',
};

const HAND: Record<string, string> = {
  char_rilla_evil:
    'EvilRilla, the villain: a giant, menacing-but-silly gorilla robot, chrome and red armour plates, huge rocket fists, glowing red eyes, a bandolier of banana peels across the chest. Mischievous grin rather than frightening. Standing, facing the viewer.',
  char_rilla_good:
    'Rilla, the good version: the same giant gorilla robot, friendly and gentle, pastel blue armour plates, soft glowing eyes and a big smile, arms open wide for a hug. Standing, facing the viewer.',
  char_elsa_good:
    // Four wordings with pale hair and an icy-blue snowflake gown were refused by
    // the image tool's safety system (2026-10-18), most likely as too near the film
    // character. Matt's call the same day: keep the pale hair, white-and-gold gown.
    'A cheerful winter queen of original design: a young woman with rosy cheeks and freckles, long pale silver hair, a flowing white-and-gold gown embroidered with golden snowflakes, a little golden crown, a fluffy white fur-trimmed cape, conjuring golden-white sparkles. Standing, facing the viewer.',
  room_bedroom_julia:
    "A cozy, cluttered little girl's bedroom seen side-on from a slight top-down game angle, wide landscape 16:9. Star wallpaper, a window, a toy chest, a dragon plushie, a rocket-shaped lamp, a castle playset and children's drawings pinned on the walls, all along the back wall and the edges. A wooden floor with a rug fills the lower half and is left open and uncluttered for the player to walk on. No bed and no door: the game draws those on top.",
  room_hub:
    'The small cosy main room of a family house, seen side-on from a slight top-down game angle, wide landscape 16:9. A sofa and a staircase at the far left, a bookshelf, a lamp and family picture frames (simple shapes, no faces) on warm wallpaper. A wooden floor with a big round rug fills the lower half, left open for the player to walk on. NO doors anywhere: the back wall between the sofa and the right edge is a plain wall with only a skirting board, because the game draws its own doors there.',
  room_side_kitchen:
    'A cheerful cartoon family kitchen seen side-on from a slight top-down game angle, wide landscape 16:9. Counters and cupboards, a fridge covered in children\'s crayon drawings, a window with curtains, along the back wall. A chequered tiled floor fills the lower half, empty and open. No food, pots, cups or objects on the floor or counter fronts: the game puts things there.',
  room_side_playroom:
    'A bright playroom seen side-on from a slight top-down game angle, wide landscape 16:9. Toy shelves, a little slide in a corner, beanbags at the edges, bunting along the back wall. A soft carpet with a toy road map printed on it fills the lower half, empty and open for walking. Keep the middle of the room clear: the game puts things there.',
  room_side_garage:
    "A tidy family garage seen side-on from a slight top-down game angle, wide landscape 16:9. A workbench with tools on a pegboard, two bikes hanging on the wall, and a car shape under a big grey sheet at the far right. A smooth grey concrete floor fills the lower half, empty and open. Keep the middle clear: the game puts things there.",
  room_side_attic:
    'A secret attic seen side-on from a slight top-down game angle, wide landscape 16:9. Sloping wooden roof beams, a round window with silver moonlight, old trunks and a rocking horse at the edges, a few cobwebs in the corners, warm lantern light, a treasure-hunt feeling, cosy not spooky. A wooden plank floor fills the lower half, empty and open. Keep the middle clear: the game puts things there.',
  room_title:
    'A heroic sunrise over a fairytale castle on a hill, a friendly dragon silhouette flying across the sky, wide landscape 16:9. The top half is open bright sky (a big logo goes there), the castle and green hills fill the lower half.',
  room_victory:
    'A victory celebration, wide landscape 16:9: colourful fireworks bursting over a fairytale castle at dusk, confetti falling, a cheering green lawn across the lower half with an empty three-step winners podium in the middle.',
  obj_blocks:
    // The first one had a green block, which the keying ate (2026-10-18).
    "A tower of chunky wooden toy blocks in red, blue, yellow and orange (no green blocks): a toy in a child's bedroom, side-on.",
  item_mice:
    'Wind-up Mice: a round open tin box with three cute grey clockwork toy mice spilling out of it, each with a little silver wind-up key in its back, pink ears and curly tails, a few golden sparkles around them.',
};

const strip = (s: string) => s.replace(/,?\s*transparent background\.?/gi, '.').replace(/\.\s*\./g, '.').trim();

/** The prompt for an asset with no HAND entry, from its brief. */
function derived(a: ArtAsset): string {
  if (a.id.startsWith('pic_')) {
    const what = PICTURES[a.id.slice(4)];
    return what ? `A single clear picture of ${what}, centred, instantly recognisable to a 4-year-old. Nothing else in the picture.` : strip(a.content);
  }
  if (a.id.startsWith('face_')) return `${strip(a.content)} Head and shoulders only, facing the viewer, smiling.`;
  if (a.id.startsWith('decal_')) {
    const look = a.content.split(': left lying')[0];
    return `${look}: a small thing left lying about a house by a mischievous villain (the villain is not shown). Mischievous, not scary.`;
  }
  if (a.kind === 'character') return `${strip(a.content)} Standing.`;
  if (a.kind === 'room' || a.kind === 'arena') return `${a.content.replace(/No text\.?/, '').trim()} Wide landscape 16:9.`;
  return strip(a.content);
}

export const ART_PROMPTS: Record<string, string> = Object.fromEntries(ART_ASSETS.map((a) => [a.id, HAND[a.id] ?? derived(a)]));
