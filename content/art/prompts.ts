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

import { FIGHTS, fightPropArt } from '../battle/fights.js';
import { ENDINGS, endingPropArt } from '../house/endings.js';
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
const FAMILY_ART = ['julia', 'ellie', 'dada_matt', 'dada_jason', 'dada_matt_lifter', 'dada_matt_cyber', 'dada_matt_blade', 'dada_jason_warrior', 'dada_jason_warlock'].flatMap((c) => [`char_${c}_good`, `char_${c}_evil`, `face_${c}`]);
// Item 025's counters and decals: glows and metal, no green of their own.
const ITEM_025 = ['item_juice_box', 'item_magic_pen', 'item_shiny_pot', 'item_slippy_mop', 'item_sunshine_bus', 'decal_dada_matt_lifter_dumbbell', 'decal_dada_matt_cyber_cable', 'decal_dada_matt_blade_rune', 'decal_dada_jason_warrior_shield', 'decal_dada_jason_warlock_flame', 'minion_imp', 'prop_portal', 'char_julia_knight', 'face_julia_knight'];
// The counter items of item 009 came back with a green-tinted glow round them.
const GLOWING_ITEMS = ['cozy_bed', 'golden_nut', 'giant_log', 'cocoa_cup', 'cuddly_cat', 'flappy_bat', 'brave_rat', 'tickle_fox', 'gold_bag', 'glitch_bug', 'bounce_cap'].map((i) => `item_${i}`);
// Tiamat (item 013) is purple and silver with a glow: no green of her own.
const TIAMAT_ART = ['char_tiamat_good', 'char_tiamat_evil', 'face_tiamat', 'item_magic_hat', 'decal_tiamat_scale', 'decal_tiamat_banner'];
// Scar (item 028): gold, black, cyan and orange; red and black when evil.
const SCAR_ART = ['char_scar_good', 'char_scar_evil', 'face_scar'];
// The victory scenes' props (item 027): a cake, a boat, a fort; asked for with no green.
const ENDING_PROPS = ENDINGS.flatMap((e) => e.props.map((p) => endingPropArt(p.id)));
// The fight styles' props (item 031): a finish banner, a trophy, a cooking station.
const FIGHT_PROPS = FIGHTS.flatMap((f) => (f.props ?? []).map((p) => fightPropArt(p.id)));
export const NO_GREEN = new Set([...FAMILY_ART, ...TIAMAT_ART, ...ITEM_025, 'char_julia_chef', 'face_julia_chef', 'prop_silver_sword', ...GLOWING_ITEMS,'item_bubble_bath', 'item_cleanup_van', 'char_rilla_evil', 'char_rilla_good', 'char_elsa_good', 'pic_mice', 'pic_net', 'prop_magic_circle', 'prop_ice_block', 'prop_word_machine', 'prop_machine_tile', ...ENDING_PROPS, ...SCAR_ART, ...FIGHT_PROPS]);

/**
 * Likeness references for the family (Matt, 2026-10-18): a photo in the
 * git-ignored `art-originals/refs/` (private: never committed or copied into
 * the tracked tree) and the box (left, top, width, height) that crops one
 * person out of it. `art:gen` attaches the crop to the char and face prompts of
 * that character; `--no-ref` sends the text alone. The roster looks describe
 * the same people in words, so the prompts still work without the photos.
 */
export const REFS: Record<string, { photo: string; box: [number, number, number, number]; who: string; style?: boolean }> = {
  // Item 028: Matt's picture of a gold mech, a style reference (`style`) for an
  // original design, not a likeness: the prompt says not to copy it.
  scar: { photo: 'scar_reference.png', box: [0, 0, 512, 512], who: 'a chunky gold-and-black armoured mech with a cyan visor, a glowing orange chest core and a blaster arm', style: true },
  julia: { photo: 'julia_and_ellie.png', box: [270, 160, 420, 500], who: 'the girl with pink glasses' },
  ellie: { photo: 'julia_and_ellie.png', box: [600, 320, 560, 560], who: 'the toddler' },
  dada_matt: { photo: 'family_dada_matt_far_left.png', box: [360, 260, 300, 380], who: 'the man in front with the beard and the teal shirt (not the baby, not the man behind him)' },
  dada_jason: { photo: 'dada_jason_with_ellie.png', box: [60, 160, 600, 620], who: 'the man with glasses (not the toddler)' },
};

/** The character whose likeness reference an asset id uses, if any: `char_<c>_<good|evil|outfit>` and `face_<c>[_<outfit>]`. */
export function refFor(id: string): string | undefined {
  // `[a-z_]+`: a dad's form is `char_dada_matt_lifter_good` (item 025).
  return Object.keys(REFS).find((c) => new RegExp(`^face_${c}(_[a-z]+)*$`).test(id) || new RegExp(`^char_${c}_[a-z_]+$`).test(id));
}

/**
 * Corrections that go at the end of an id's prompt, after the brief, for
 * `art:gen` and `art:alts` alike: what an earlier image got wrong (Matt's
 * notes on the likenesses, 2026-10-18, item 009).
 */
const ELLIE_HAIR = "Her hair is pale, fine and wispy strawberry-blonde: very light blonde with only a faint peachy-pink tint, thin and soft like a toddler's. NOT golden, NOT orange, NOT ginger, NOT copper.";
const LIFTER = 'He wears a T-shirt WITH SLEEVES, not a singlet or a tank top, and holds one small ordinary dumbbell, NOT a barbell, nothing lifted over his head. Strong but a little less muscly than a bodybuilder.';
const TIAMAT_BELLY = 'She is a dragon, not a person: a plain round dragon belly with smooth belly plates like the good version, no chest or bust shape at all.';
export const NOTES: Record<string, string> = {
  char_ellie_good: ELLIE_HAIR,
  char_ellie_evil: ELLIE_HAIR,
  face_ellie: ELLIE_HAIR,
  // Item 032 (Matt): item 025's lifter was too buff, sleeveless, with a giant barbell overhead.
  char_dada_matt_lifter_good: LIFTER,
  char_dada_matt_lifter_evil: LIFTER,
  face_dada_matt_lifter: LIFTER,
  // Item 013: two of the first three of each gave her a woman's bust.
  char_tiamat_evil: TIAMAT_BELLY,
  face_tiamat: TIAMAT_BELLY,
  // Item 028: drawn from a gold style reference, so the evil one says its colours twice.
  char_scar_good: 'He is small and stocky, with a big head and short legs, but still clearly taller than he is wide: a little robot, not a tall mech.',
  char_scar_evil: 'His armour is black and crimson, NOT gold. He is small and chunky, with a big head and short legs: a little robot, not a tall mech.',
};

/**
 * What Matt should know when he picks among an id's candidates: the `note` on
 * its row in the picker manifest `art:alts` writes (after the NOTES correction,
 * which the row quotes by itself).
 */
export const PICK_NOTES: Record<string, string> = {
  arena_sky_race: "Evil Smaug's sky race (item 031): the game sweeps stalactites, lanterns and coin piles across it so it reads as a fast flight. `current` is candidate 2, promoted by item 031: the open sky in the middle reads most like flying. `0` is the painted placeholder.",
  arena_spell_tower: "The spell-beam clash (Evil Bavmorda, evil warlock Dada Jason; item 031): the beams meet over the middle of the floor. `current` is candidate 1, Matt's pick (item 034): glowing rune stones round a cracked, moonlit flagstone floor. 2 was item 031's promotion; `0` is the painted placeholder.",
  arena_cook_show: "The cook-off (chef Dada Jason as ally, item 031): the game stands two cooking stations on the floor. `current` is candidate 2, promoted by item 031: the least busy wall behind the stations. `0` is the painted placeholder.",
  prop_fight_finish_flag: 'The sky race\'s finish line (item 031), swept in at the end of each race. `current` is candidate 1, Matt\'s pick (item 034): the slimmer gold posts with jewelled tops. 2 was item 031\'s promotion; `0` is the painted placeholder.',
  prop_fight_trophy: 'Over the winner of a race or a cook-off (item 031). `current` is candidate 3, Matt\'s pick (item 034): the ornate cup with a gold filigree crest round its ruby. 1 was item 031\'s promotion; `0` is the painted placeholder.',
  prop_fight_cook_station: 'Each side\'s station in the cook-off (item 031); the dish is stacked on its counter top. `current` is candidate 2, promoted by item 031: the clearest counter top. `0` is the painted placeholder.',
  char_scar_good: "Scar's redesign (items 028/030): a tiny gold mech, a little shorter than Julia. `current` is candidate 2, promoted by item 030 and kept by Matt (item 034): the biggest head and shortest legs (the smallest-reading), and a smiling visor. `0` is the old design.",
  char_scar_evil: "`current` is candidate 1, Matt's pick (item 034): a round black helmet with smoking exhaust stacks, a scowling red visor, blaster thrust forward and fist clenched. 3 was item 030's promotion; `0` is the old design.",
  face_scar: "`current` is candidate 2, Matt's pick (item 034): a laughing visor with his smiling mouth showing beneath it, blue jets behind. 4 was item 030's promotion; `0` is the old design.",
  room_place_robot_workshop: "Scar's own quest place (item 030; he trained in the hacker den before). `current` is candidate 2, promoted by item 030: the plainest wall behind the middle, where the game draws the doors and the portal. `0` is the painted placeholder.",
  room_side_parts_bay: '`current` is candidate 3, promoted by item 030: the claw and the conveyor read most robot. `0` is the painted placeholder.',
  room_side_rocket_pad: '`current` is candidate 1, promoted by item 030: the clearest launch rings and floor. `0` is the painted placeholder.',
  pic_zap: "Move word ZAP (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 1, Matt's pick (item 020). 0 is candidate 2, item 018's promotion.",
  pic_pow: "Move word POW (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 1, Matt's pick (item 020). 0 is candidate 2, item 018's promotion: the most compact glove and flash.",
  pic_bam: 'Move word BAM (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 3, promoted by item 018: the clearest impact and cracks. 0 is the painted placeholder.',
  pic_zip: 'Move word ZIP (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 1, promoted by item 018. 0 is the painted placeholder.',
  pic_hop: 'Move word HOP (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018: the dotted jump arc shows. 0 is the painted placeholder.',
  pic_pop: 'Move word POP (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018: still reads as a balloon. 0 is the painted placeholder.',
  pic_hug: 'Move word HUG (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 1, promoted by item 018: two different bears read as two. 0 is the painted placeholder.',
  pic_big: 'Move word BIG (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018. 0 is the painted placeholder.',
  pic_hot: 'Move word HOT (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 3, promoted by item 018. 0 is the painted placeholder.',
  pic_ice: 'Move word ICE (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018: the cleanest cube. 0 is the painted placeholder.',
  pic_dig: 'Move word DIG (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018. 0 is the painted placeholder.',
  pic_run: 'Move word RUN (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018. 0 is the painted placeholder.',
  pic_mud: 'Move word MUD (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018. 0 is the painted placeholder.',
  pic_wet: 'Move word WET (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 3, promoted by item 018: the fullest splash. 0 is the painted placeholder.',
  pic_fog: 'Move word FOG (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 1, promoted by item 018: the fullest cloud. 0 is the painted placeholder.',
  pic_top: 'Move word TOP (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018: 1 has a green band keyed half-clear. 0 is the painted placeholder.',
  pic_tug: 'Move word TUG (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018: the tightest rope; all three are long and thin. 0 is the painted placeholder.',
  pic_fix: 'Move word FIX (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018. 0 is the painted placeholder.',
  pic_pan: 'Move word PAN (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 1, promoted by item 018. 0 is the painted placeholder.',
  pic_ram: 'Move word RAM (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 1, promoted by item 018: charging head down. 0 is the painted placeholder.',
  char_tiamat_good: "`current` is candidate 3, Matt's pick (item 016): wings spread open, hands clasped over her belly. 0 is item 013's first promotion (candidate 1).",
  char_tiamat_evil: "`current` is candidate 3, Matt's pick (item 016): gold collar and cuffs, one hand on her hip. 0 is item 013's first promotion (candidate 2, the plainest dragon belly).",
  face_tiamat: '`current` is candidate 2, promoted by item 013: the only one without a bust shape.',
  item_magic_hat: 'Evil Tiamat\'s counter (SCARED OF THE HAT). `current` is candidate 1, Matt\'s pick (item 016): grey clouds, rain and lightning swirling down into its golden top. 0 is item 013\'s first promotion (candidate 2). All three drew a rain storm, not her purple fire storm.',
  decal_tiamat_scale: '`current` is candidate 1, promoted by item 013.',
  decal_tiamat_banner: '`current` is candidate 1, promoted by item 013 (2 lies crumpled on the floor and reads less clearly).',
  prop_silver_sword: "Ellie's one sword move (Spinny Swords, item 016): she spins them round herself, then flings them; it shows with any Ellie image. `current` is candidate 3, Matt's pick (item 016): an icy-blue crystal blade, pink gems and grip. 0 is item 014's first promotion (candidate 2, plain silver).",
  char_ellie_good: "`current` is candidate 0, the original bubble-wand Ellie, Matt's pick (item 016); she fights with bubbles and one sword move, and the game draws her swords round her when she uses it. 1 to 3 are item 009's bubble-wand candidates; 4 to 6 (item 014) summon silver swords.",
  char_julia_chef: 'Julia in her chef form (content/battle/forms.ts): every scene after she wakes uses it when Dada Jason is the ally. `current` is candidate 3, promoted by item 012 (closest face and fringe to her other art, pink shoes like hers).',
  face_julia_chef: "New id (item 016): chef Julia's name-free face card, the picture for reading JULIA in a chef episode. `current` is candidate 2, promoted by item 016 (hat, fringe and smile closest to char_julia_chef); 1 and 3 are as good, with a taller hat. `0` is the painted placeholder.",
  char_anna_evil: "`current` is the old copper-curls design, unlike good Anna and her face card (the item 009 redesign: dark ponytail, plum and magenta). Her look in content/battle/roster.ts describes `current`; a candidate drawn from it is copper-curled too.",
  room_bedroom_julia: 'Redrawn with no loose toys of its own: the first one painted a teddy and a rocket that doubled the toys the game puts on the floor.',
  decal_rilla_footprint: 'Redrawn as one giant robot-gorilla footprint: the earlier try still read as bare human feet.',
  prop_word_machine: "The word machine (item 026): the game puts the picture in its round window and draws its own letter panel over the blank lower panel. `current` is candidate 3, Matt's pick (item 032): a round glass dome over a cream panel, with a crank on the side; `WINDOW` / `PANEL` in src/scenes/WordMachine.ts are fitted to it (fractions of the image), so a different pick needs them refitted. 2 is item 026's promotion; 0 is the painted placeholder.",
  room_end_fort: "`current` is candidate 3, Matt's pick (item 032): a fairy-lit living room, a green sofa, a moon window, a big white rug across an open middle where the game draws the pillow fort. `0` is the art item 027 left in the game.",
  prop_machine_tile: "The word machine's letter tiles, a letter painted on each by the game. `current` is candidate 3, promoted by item 026: the flattest blank top for a letter (1 is a cube seen corner-on). 0 is the painted placeholder.",
  ...pickedBy025(),
  ...pickedBy032(),
};

/**
 * Matt's picks from item 025's sheet (`art_alts_025`), promoted by item 032:
 * the candidate now in the game, what it shows, and item 025's own promotion
 * (a candidate still, so the picker offers it back).
 */
function pickedBy032(): Record<string, string> {
  const picks: Record<string, [number, number, string]> = {
    char_dada_jason_warlock_good: [1, 2, 'starry purple robes, a crystal staff, purple fire in one hand, a grinning imp on his shoulder'],
    char_dada_jason_warrior_evil: [3, 2, 'a horned crown helmet, a spiked round shield, a jagged axe, a tattered red cape, grinning'],
    char_dada_jason_warrior_good: [3, 2, 'gold-trimmed silver plate, a red cape, a sun shield, a double-headed axe held high'],
    char_dada_matt_blade_good: [6, 5, 'bare-armed rune armour, the sword held low, a blue magic swirl raised'],
    char_dada_matt_cyber_evil: [2, 1, 'a red visor, a spike-shouldered jacket, a red code tablet in his palm, two red drones'],
    char_dada_matt_cyber_good: [3, 1, 'typing on a floating cyan keyboard, a smiling drone at his shoulder'],
    decal_dada_jason_warlock_flame: [2, 1, 'one cheeky purple flame with a face, small flames round it'],
    decal_dada_jason_warrior_shield: [1, 2, 'two dented black shields, a snapped axe, a spilled coin pouch'],
    decal_dada_matt_cyber_cable: [1, 2, 'a tangle of red-glowing cables and plugs'],
    room_place_hacker_den: [2, 1, 'a wide rainy neon-skyline window, beanbags, a shiny floor'],
    room_place_ice_castle: [2, 1, 'crystal pillars round a tiered frozen fountain'],
    room_place_moon_tower: [2, 1, 'a huge round window full of purple moon, a cauldron each side'],
    room_side_bazaar_tent: [2, 1, 'the tent opens onto a palm oasis lake'],
    room_side_egg_nest: [2, 1, 'a golden cave of spotted eggs in straw nests, amber crystals'],
    room_side_potion_room: [2, 1, 'a green bubbling cauldron, a crescent-moon window, a toadstool stool'],
    room_side_treetop_lookout: [2, 1, 'a round plank deck with rope rails, a telescope, a star flag'],
  };
  const lifter: Record<string, [number, string]> = {
    char_dada_matt_lifter_good: [5, 'the dumbbell held low at his side, red sneakers'],
    char_dada_matt_lifter_evil: [5, 'the dumbbell curled up by his shoulder in purple sparks'],
    face_dada_matt_lifter: [6, 'the most T-shirt sleeve and the smallest dumbbell'],
  };
  return {
    ...Object.fromEntries(Object.entries(picks).map(([id, [n, was, what]]) => [id, `\`current\` is candidate ${n}, Matt's pick (item 032): ${what}. ${was} is item 025's promotion; \`0\` is the painted placeholder.`])),
    // Matt's redesign (item 032): less buff, a T-shirt with sleeves, a modest dumbbell, no barbell.
    ...Object.fromEntries(Object.entries(lifter).map(([id, [n, what]]) => [id, `Weightlifter Dada Matt redrawn (item 032): a little less buff, a T-shirt with sleeves, a dumbbell of modest size. \`current\` is candidate ${n}, Matt's pick (items 032/034): ${what}. 1 to 3 are item 025's barbell design; \`0\` is the painted placeholder.`])),
  };
}

/**
 * Item 025's new ids (the dads' forms, knight Julia, the quest places, the
 * forms' counters and decals, the imp, the portal): which candidate it
 * promoted, and why when it was close. `0` is the painted placeholder.
 */
function pickedBy025(): Record<string, string> {
  const why: Record<string, [number, string?]> = {
    char_dada_matt_lifter_good: [1, 'the fullest barbell pose'], char_dada_matt_lifter_evil: [2], face_dada_matt_lifter: [2],
    char_dada_matt_cyber_good: [1], char_dada_matt_cyber_evil: [1], face_dada_matt_cyber: [2],
    char_dada_matt_blade_good: [5, 'run twice, 6 candidates; the clearest blade and arcane swirl'], char_dada_matt_blade_evil: [1], face_dada_matt_blade: [3],
    char_dada_jason_warrior_good: [2], char_dada_jason_warrior_evil: [2], face_dada_jason_warrior: [2],
    char_dada_jason_warlock_good: [2], char_dada_jason_warlock_evil: [2], face_dada_jason_warlock: [2, 'the biggest laugh'],
    char_julia_knight: [1], face_julia_knight: [2],
    item_juice_box: [1], item_magic_pen: [1], item_shiny_pot: [1], item_slippy_mop: [1], item_sunshine_bus: [2],
    decal_dada_matt_lifter_dumbbell: [1], decal_dada_matt_cyber_cable: [2], decal_dada_matt_blade_rune: [2], decal_dada_jason_warrior_shield: [2], decal_dada_jason_warlock_flame: [1],
    minion_imp: [1], prop_portal: [2, 'the taller arch reads as a doorway'],
    room_place_forest_gym: [1], room_side_boulder_yard: [2], room_side_climb_rocks: [2], room_side_waterfall_cave: [2],
    room_place_hacker_den: [1], room_side_server_room: [1], room_side_drone_hangar: [2], room_side_mainframe_core: [1],
    room_place_treehouse: [1, 'its deck is the larger walking floor'], room_side_lumber_loft: [1], room_side_tool_hut: [1], room_side_treetop_lookout: [1],
    room_place_rune_dojo: [1], room_side_sword_yard: [1], room_side_spell_library: [1], room_side_crystal_vault: [2],
    room_place_secret_kitchen: [1], room_side_pantry: [1], room_side_bakery: [2], room_side_sweet_cellar: [1],
    room_place_knight_camp: [1], room_side_armoury: [1], room_side_practice_ring: [1], room_side_tower_room: [2],
    room_place_moon_tower: [1], room_side_potion_room: [1], room_side_imp_nursery: [1], room_side_star_observatory: [2],
    room_place_bubble_castle: [1], room_side_bubble_baths: [1], room_side_toy_cloud: [2], room_side_rainbow_room: [1],
    room_place_dragon_mountain: [1], room_side_egg_nest: [1], room_side_flight_cliff: [1], room_side_secret_hideout: [1, 'the secret room every tier-two place shares'],
    room_place_ice_castle: [1], room_side_snow_garden: [1], room_side_skating_pond: [1],
    room_place_desert_oasis: [1], room_side_bazaar_tent: [1], room_side_sand_dunes: [1],
    room_place_sea_grotto: [1], room_side_coral_garden: [1], room_side_shipwreck: [1],
  };
  return Object.fromEntries(Object.entries(why).map(([id, [n, note]]) => [id, `New id (item 025). \`current\` is candidate ${n}, promoted by item 025${note ? `: ${note}` : ''}. \`0\` is the painted placeholder.`]));
}

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
  // Move words (item 018): the picture is what the move does, for the victory recap.
  zap: 'a zap: one bright yellow zig-zag lightning bolt crackling with little white sparks',
  pow: 'a pow: a big red cartoon boxing glove punching forward into a jagged yellow star-shaped impact flash, with no letters in the flash',
  bam: 'a bam: a big wooden cartoon mallet smashing down onto the ground, a jagged star-shaped impact and little cracks under it, with no letters',
  zip: 'a zip: a small bright blue comet zooming sideways very fast, long white speed lines streaming behind it',
  hop: 'a hop: a white bunny rabbit in mid-hop high in the air, a curved dotted arc under it showing the jump',
  pop: 'a pop: a red balloon bursting with a star-shaped bang, rubber bits and confetti flying out',
  hug: 'a hug: two cute teddy bears hugging each other tight, eyes closed and smiling, a little pink heart above them',
  big: 'big: a huge grey elephant standing beside a tiny mouse, so the elephant looks enormous',
  hot: 'hot: a red chilli pepper with little orange flames curling off it and a drop of sweat',
  ice: 'ice: one shiny pale-blue ice cube with frosty edges and a tiny sparkle',
  dig: 'a dig: a small red spade digging into a heap of brown dirt, a few clods flying',
  run: 'a run: a pair of bright running trainers in mid-stride, speed lines and little dust puffs behind them',
  mud: 'mud: one big brown splat of mud with drips and a few splashes flying off',
  wet: 'wet: one big blue water splash with round droplets flying out',
  fog: 'fog: a big soft grey cloud of fog drifting low, wispy curls at its edges',
  top: 'a top: a colourful striped spinning top toy spinning on its point, curved swirl marks around it',
  tug: 'a tug: two little cartoon hands pulling hard on a thick rope in a tug of war, the rope pulled tight with a knot in the middle',
  fix: 'a fix: a silver spanner and a sticking plaster crossed over each other, with sparkles',
  pan: 'a pan: a black frying pan with a long handle, a fried egg sizzling in it',
  ram: 'a ram: a white ram (a woolly sheep with big curly horns) charging forward, side-on',
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
  // Item 033: the home warm-up's entry hall. Nine pictures with their words stand on the floor.
  room_entry:
    'The front entry hall of a cosy family house, seen side-on from a slight top-down game angle, wide landscape 16:9. A coat rack with coats and a striped scarf and a little wooden bench at the far left, a mirror, a potted plant and a shoe mat with wellington boots along the back wall, warm wallpaper and a skirting board. A wooden plank floor with a long runner rug fills the lower half and is left open and uncluttered: the game puts nine things there. NO door anywhere: the right end of the back wall is a plain wall, because the game draws its own front door there. No loose objects on the floor, no text.',
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
