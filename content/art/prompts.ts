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
const FAMILY_ART = ['julia', 'ellie', 'dada_matt', 'dada_jason'].flatMap((c) => [`char_${c}_good`, `char_${c}_evil`, `face_${c}`]);
// The counter items of item 009 came back with a green-tinted glow round them.
const GLOWING_ITEMS = ['cozy_bed', 'golden_nut', 'giant_log', 'cocoa_cup', 'cuddly_cat', 'flappy_bat', 'brave_rat', 'tickle_fox', 'gold_bag', 'glitch_bug', 'bounce_cap'].map((i) => `item_${i}`);
// Tiamat (item 013) is purple and silver with a glow: no green of her own.
const TIAMAT_ART = ['char_tiamat_good', 'char_tiamat_evil', 'face_tiamat', 'item_magic_hat', 'decal_tiamat_scale', 'decal_tiamat_banner'];
export const NO_GREEN = new Set([...FAMILY_ART, ...TIAMAT_ART, 'char_julia_chef', 'face_julia_chef', 'prop_silver_sword', ...GLOWING_ITEMS,'item_bubble_bath', 'item_cleanup_van', 'char_rilla_evil', 'char_rilla_good', 'char_elsa_good', 'pic_mice', 'pic_net', 'prop_magic_circle', 'prop_ice_block']);

/**
 * Likeness references for the family (Matt, 2026-10-18): a photo in the
 * git-ignored `art-originals/refs/` (private: never committed or copied into
 * the tracked tree) and the box (left, top, width, height) that crops one
 * person out of it. `art:gen` attaches the crop to the char and face prompts of
 * that character; `--no-ref` sends the text alone. The roster looks describe
 * the same people in words, so the prompts still work without the photos.
 */
export const REFS: Record<string, { photo: string; box: [number, number, number, number]; who: string }> = {
  julia: { photo: 'julia_and_ellie.png', box: [270, 160, 420, 500], who: 'the girl with pink glasses' },
  ellie: { photo: 'julia_and_ellie.png', box: [600, 320, 560, 560], who: 'the toddler' },
  dada_matt: { photo: 'family_dada_matt_far_left.png', box: [360, 260, 300, 380], who: 'the man in front with the beard and the teal shirt (not the baby, not the man behind him)' },
  dada_jason: { photo: 'dada_jason_with_ellie.png', box: [60, 160, 600, 620], who: 'the man with glasses (not the toddler)' },
};

/** The character whose likeness reference an asset id uses, if any: `char_<c>_<good|evil|outfit>` and `face_<c>[_<outfit>]`. */
export function refFor(id: string): string | undefined {
  return Object.keys(REFS).find((c) => new RegExp(`^face_${c}(_[a-z]+)?$`).test(id) || new RegExp(`^char_${c}_[a-z]+$`).test(id));
}

/**
 * Corrections that go at the end of an id's prompt, after the brief, for
 * `art:gen` and `art:alts` alike: what an earlier image got wrong (Matt's
 * notes on the likenesses, 2026-10-18, item 009).
 */
const ELLIE_HAIR = "Her hair is pale, fine and wispy strawberry-blonde: very light blonde with only a faint peachy-pink tint, thin and soft like a toddler's. NOT golden, NOT orange, NOT ginger, NOT copper.";
const TIAMAT_BELLY = 'She is a dragon, not a person: a plain round dragon belly with smooth belly plates like the good version, no chest or bust shape at all.';
export const NOTES: Record<string, string> = {
  char_ellie_good: ELLIE_HAIR,
  char_ellie_evil: ELLIE_HAIR,
  face_ellie: ELLIE_HAIR,
  // Item 013: two of the first three of each gave her a woman's bust.
  char_tiamat_evil: TIAMAT_BELLY,
  face_tiamat: TIAMAT_BELLY,
};

/**
 * What Matt should know when he picks among an id's candidates: the `note` on
 * its row in the picker manifest `art:alts` writes (after the NOTES correction,
 * which the row quotes by itself).
 */
export const PICK_NOTES: Record<string, string> = {
  char_tiamat_good: "`current` is candidate 3, Matt's pick (item 016): wings spread open, hands clasped over her belly. 0 is item 013's first promotion (candidate 1).",
  char_tiamat_evil: "`current` is candidate 3, Matt's pick (item 016): gold collar and cuffs, one hand on her hip. 0 is item 013's first promotion (candidate 2, the plainest dragon belly).",
  face_tiamat: '`current` is candidate 2, promoted by item 013: the only one without a bust shape.',
  item_magic_hat: 'Evil Tiamat\'s counter (SCARED OF THE HAT). `current` is candidate 1, Matt\'s pick (item 016): grey clouds, rain and lightning swirling down into its golden top. 0 is item 013\'s first promotion (candidate 2). All three drew a rain storm, not her purple fire storm.',
  decal_tiamat_scale: '`current` is candidate 1, promoted by item 013.',
  decal_tiamat_banner: '`current` is candidate 1, promoted by item 013 (2 lies crumpled on the floor and reads less clearly).',
  prop_silver_sword: "Ellie's one sword move (Spinny Swords, item 016): she spins them round herself, then flings them; it shows with any Ellie image. `current` is candidate 3, Matt's pick (item 016): an icy-blue crystal blade, pink gems and grip. 0 is item 014's first promotion (candidate 2, plain silver).",
  char_ellie_good: "`current` is candidate 0, the original bubble-wand Ellie, Matt's pick (item 016); she fights with bubbles and one sword move, and the game draws her swords round her when she uses it. 1 to 3 are item 009's bubble-wand candidates; 4 to 6 (item 014) summon silver swords.",
  char_julia_chef: 'Julia in her chef form (content/battle/forms.ts): every scene after she wakes uses it when Dada Jason is the ally. `current` is candidate 3, promoted by item 012 (closest face and fringe to her other art, pink shoes like hers).',
  face_julia_chef: "New id (item 016): chef Julia's name-free face card, the picture for reading JULIA in a chef episode. `0` is the painted placeholder.",
  char_anna_evil: "`current` is the old copper-curls design, unlike good Anna and her face card (the item 009 redesign: dark ponytail, plum and magenta). Her look in content/battle/roster.ts describes `current`; a candidate drawn from it is copper-curled too.",
  room_bedroom_julia: 'Redrawn with no loose toys of its own: the first one painted a teddy and a rocket that doubled the toys the game puts on the floor.',
  decal_rilla_footprint: 'Redrawn as one giant robot-gorilla footprint: the earlier try still read as bare human feet.',
};

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
  // Redone (Matt, 2026-10-18, item 009): the first one painted its own teddy and
  // rocket, which doubled the game's toys (BEDROOMS objects in content/house/house.ts).
  room_bedroom_julia:
    "A cozy little girl's bedroom seen side-on from a slight top-down game angle, wide landscape 16:9. Star wallpaper, a window with curtains, bookshelves with books, a closed toy chest, a castle playset on a shelf, fairy lights and children's drawings pinned on the walls, all along the back wall and the edges. A wooden floor with a rug fills the lower half and is left open and uncluttered for the player to walk on. No bed and no door: the game draws those on top. No loose toys anywhere: no teddy bears or plush animals, no rockets, no drums, no balls, no robots, no rubber ducks, no blocks, no unicorns and no lamps on the floor, because the game puts its own toys there.",
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
  // Redone after the first try drew the wrong thing (2026-10-18): human footprints,
  // a circus big top, a bear trap on a card, stones the game draws itself, a short banner.
  // Redone again (item 009): the second try still read as bare human feet.
  decal_rilla_footprint:
    "One giant robot-gorilla footprint stamped into the floor, seen from above: a huge square-toed metal ape foot pressed into the ground as a deep dented imprint, with a big separate thumb-toe sticking out to the side like a gorilla's, four chunky blocky toe pads with rivet marks and bolt holes, a cracked ring of broken floorboards around it and a little puff of dust. Grey-brown and metallic, clearly a giant robot gorilla's and nothing like a person's foot: no human toes, no heel arch.",
  prop_tent:
    'A small striped two-person camping tent, green-free: an orange and blue A-frame tent with the door flap tied open, guy ropes and pegs, a little pennant flag on the top pole. Side-on.',
  prop_card_trap:
    'A single playing card lying flat on the ground seen at a slight angle, a red heart card glowing with a soft golden magic outline and little sparkles. Just the card.',
  prop_banner:
    'A very wide, short hanging cloth banner (four times wider than it is tall), cream fabric with a red and gold trim and tassels, hanging from a wooden pole by two cords. The middle is completely blank.',
  room_stones:
    'A magic garden with soft mossy ground, flowers around the edges, a stone archway and a small waterfall in the background, wide landscape 16:9. The middle of the lawn is completely empty and open: no stones, rocks or objects in the middle, because the game stands its own letter stones there.',
  item_mice:
    'Wind-up Mice: a round open tin box with three cute grey clockwork toy mice spilling out of it, each with a little silver wind-up key in its back, pink ears and curly tails, a few golden sparkles around them.',
};

const EMPTY_HANDED_FACES = new Set(['face_ellie', 'face_anna']);

const strip = (s: string) => s.replace(/,?\s*transparent background\.?/gi, '.').replace(/\.\s*\./g, '.').trim();

/** The prompt for an asset with no HAND entry, from its brief. */
function derived(a: ArtAsset): string {
  if (a.id.startsWith('pic_')) {
    const what = PICTURES[a.id.slice(4)];
    return what ? `A single clear picture of ${what}, centred, instantly recognisable to a 4-year-old. Nothing else in the picture.` : strip(a.content);
  }
  if (a.id.startsWith('face_')) {
    // These face cards leave out what the character holds (item 009); the others,
    // drawn before, show it (Dada Matt's hammer on his shoulder) and Matt kept them.
    const look = EMPTY_HANDED_FACES.has(a.id) ? strip(a.content).replace(/, (holding|waving) [^.]*\./, '.') : strip(a.content);
    return `${look} Head and shoulders only, facing the viewer, smiling.`;
  }
  if (a.id.startsWith('decal_')) {
    const look = a.content.split(': left lying')[0];
    return `${look}: a small thing left lying about a house by a mischievous villain (the villain is not shown). Mischievous, not scary.`;
  }
  if (a.kind === 'character') return `${strip(a.content)} Standing.`;
  if (a.kind === 'room' || a.kind === 'arena') return `${a.content.replace(/No text\.?/, '').trim()} Wide landscape 16:9.`;
  return strip(a.content);
}

export const ART_PROMPTS: Record<string, string> = Object.fromEntries(ART_ASSETS.map((a) => [a.id, HAND[a.id] ?? derived(a)]));
