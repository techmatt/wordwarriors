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
import { BANK_BY_WORD } from '../phonics/bank.js';
import { RUNES, runeArt } from '../phonics/runes.js';
import { ART_ASSETS, type ArtAsset } from './assets.js';

const STYLE =
  "Bright, bold children's game art for a 4-year-old: friendly cartoon style, thick clean dark outlines, flat cel shading, saturated cheerful colors, simple readable shapes, storybook warmth. No text, letters or numbers anywhere in the image.";

export const SPRITE_STYLE = `${STYLE} Single subject centered, full body, on a flat pure #00FF00 green background (sprites only).`;

/** Charge's picture letters (item 097, `rune_<sound>`): the one letter the brief names is the picture, so STYLE's no-letters rule gives way for it alone. */
const LETTER_STYLE = `${STYLE.replace('No text, letters or numbers anywhere in the image.', 'The capital letter the description names is the only letter in the image: no other text, letters or numbers.')} Single subject centered, on a flat pure #00FF00 green background (sprites only).`;

/** The style block an id's prompt starts with (not a background's). */
export const spriteStyle = (id: string) => (id.startsWith('rune_') ? LETTER_STYLE : SPRITE_STYLE);

export const BACKGROUND_STYLE =`${STYLE} A full-bleed background painting filling the whole frame edge to edge, no border, no characters.`;

// Item 046: Dada Jason's good forms and their face cards wear forest green, which
// the no-green keying (NO_GREEN, below) would fade to see-through grey-teal; his
// evil forms stay in.
const GREEN_JASON = ['dada_jason', 'dada_jason_warrior', 'dada_jason_warlock'].flatMap((c) => [`char_${c}_good`, `face_${c}`]);
const FAMILY_ART = ['julia', 'ellie', 'dada_matt', 'dada_jason', 'dada_matt_lifter', 'dada_matt_cyber', 'dada_matt_blade', 'dada_jason_warrior', 'dada_jason_warlock'].flatMap((c) => [`char_${c}_good`, `char_${c}_evil`, `face_${c}`]).filter((id) => !GREEN_JASON.includes(id));
// Item 025's counters and decals: glows and metal, no green of their own.
const COUNTER_ITEMS_AND_DECALS = ['item_juice_box', 'item_magic_pen', 'item_shiny_pot', 'item_slippy_mop', 'item_sunshine_bus', 'decal_dada_matt_lifter_dumbbell', 'decal_dada_matt_cyber_cable', 'decal_dada_matt_blade_rune', 'decal_dada_jason_warrior_shield', 'decal_dada_jason_warlock_flame', 'minion_imp', 'prop_portal', 'char_julia_knight', 'face_julia_knight'];
// The counter items of item 009 came back with a green-tinted glow round them.
const GLOWING_ITEMS = ['cozy_bed', 'golden_nut', 'giant_log', 'cocoa_cup', 'cuddly_cat', 'flappy_bat', 'tickle_fox', 'gold_bag', 'glitch_bug', 'bounce_cap'].map((i) => `item_${i}`);
// Tiamat (item 013) is purple and silver with a glow: no green of her own.
const TIAMAT_ART = ['char_tiamat_good', 'char_tiamat_evil', 'face_tiamat', 'item_magic_hat', 'decal_tiamat_scale', 'decal_tiamat_banner'];
// Scar (item 028): gold, black, cyan and orange; red and black when evil.
const SCAR_ART = ['char_scar_good', 'char_scar_evil', 'face_scar'];
// The victory scenes' props (item 027): a cake, a boat, a fort; asked for with no green.
const ENDING_PROPS = ENDINGS.flatMap((e) => e.props.map((p) => endingPropArt(p.id)));
// The fight styles' props (item 031): a finish banner, a trophy, a cooking station.
const FIGHT_PROPS = FIGHTS.flatMap((f) => (f.props ?? []).map((p) => fightPropArt(p.id)));
// The word bank's pictures with no green of their own. Left out for their green:
// frog, twig, pod, plum, fig, slug; grass, elf, bush; gate, stump, swish and chomp
// (grass or leaves, chomp's dragon); pond (lily pads), goblin, cave (its path),
// castle (its hill) and dragon; hex (item 182's redraw: a green frog).
const NO_GREEN_PICTURES = [
  'jam', 'yak', 'vat', 'leg', 'peg', 'wig', 'bib', 'six', 'fin', 'kit', 'lip', 'cog', 'rod', 'gum', 'bun', 'hut', 'sub', 'nap', 'wag', 'jab', 'red', 'jig', 'mix', 'jog', 'bop', 'dot', 'hum', 'yum', 'drum', 'crab', 'flag', 'sled', 'nest', 'tent', 'desk', 'belt', 'vest', 'gift', 'lamp', 'hand', 'mask', 'raft', 'plug', 'ant', 'milk', 'jump', 'spin', 'swim', 'flip', 'stomp', 'slam', 'grab', 'clap', 'bump', 'skip', 'twist', 'melt', 'lift', 'plop', 'flop', 'trap', 'blast', 'drip', 'ship', 'fish', 'duck', 'sock', 'moth', 'shed', 'chick', 'chop', 'kick', 'rush',
  'vet', 'chest', 'bin', 'rock', 'clock', 'stick', 'brush', 'truck', 'bath', 'plant', 'crib', 'key', 'yoyo',
  'mat', 'man', 'lid', 'lock',
  'egg', 'bell', 'doll', 'tap', 'glass', 'sink', 'king', 'ring', 'wing', 'shell', 'chips', 'thumb', 'lamb', 'quest', 'quilt', 'queen', 'goat', 'jeep', 'sheep', 'three', 'cheese', 'kite', 'bike', 'vase', 'cake', 'ten',
  'ham', 'hay', 'sack', 'dress', 'block', 'bench', 'skunk', 'dash', 'smash', 'crash', 'splash',
  'mom', 'dad', 'cow',
  'pup', 'cub', 'cot', 'kid',
  'frost', 'sand', 'fang', 'helmet', 'cape', 'flame', 'smoke', 'sword', 'shield', 'bow', 'crown', 'wizard', 'robot',
  'teddy', 'rocket', 'ball', 'unicorn',
].map((w) => `pic_${w}`);
// Julia's outfits beside the allies, Seraphina's pink dragon, and Ozymandias's
// penguins, snow bot, fish bucket and cards: no green of their own.
const NO_GREEN_OUTFITS_AND_MINIONS = ['keeper', 'snow', 'explorer', 'astronaut', 'puzzler', 'gorilla']
  .flatMap((o) => [`char_julia_${o}`, `face_julia_${o}`])
  .concat('minion_pink_dragon', 'minion_penguin', 'minion_penguin_trooper', 'minion_snow_bot', 'item_fish_bucket', 'char_ozymandias_good', 'char_ozymandias_evil', 'face_ozymandias', 'decal_ozymandias_penguin', 'decal_ozymandias_snowpile');

/**
 * Sprites with no green of their own. Keying treats every green tint in them as
 * the screen showing through (a cage's faint back bars), not just the edges.
 * Leave out anything meant to have green in it (a leaf, a dragon).
 */
const NO_GREEN = new Set(['item_calm_bell', ...NO_GREEN_OUTFITS_AND_MINIONS, ...NO_GREEN_PICTURES, ...FAMILY_ART, ...TIAMAT_ART, ...COUNTER_ITEMS_AND_DECALS, 'char_julia_chef', 'face_julia_chef', 'prop_silver_sword', ...GLOWING_ITEMS, 'item_bubble_bath', 'item_cleanup_van', 'char_rilla_evil', 'char_rilla_good', 'face_rilla', 'char_elsa_good', 'pic_mice', 'pic_net', 'prop_magic_circle', 'prop_ice_block', 'prop_bubble', 'prop_medal', 'prop_dragon_scale', 'prop_word_machine', 'prop_machine_tile', 'prop_rune_altar', 'prop_rune_stone', ...ENDING_PROPS, ...SCAR_ART, ...FIGHT_PROPS]);

/**
 * Sprites in dark green of their own (item 049): keying takes out only the
 * bright, light screen green caught in them (between whisk wires, a lime glow)
 * and leaves the dark green. Dada Jason's good forms and face cards.
 */
const LIGHT_GREEN = new Set(GREEN_JASON);

/** How `keyGreen` (tools/art/chroma.ts) cuts an image: not at all, every green tint, or only light green. */
export type KeyMode = 'keep' | 'noGreen' | 'lightGreen';

/** How `keyGreen` cuts an id, for `art:gen`, `art:alts` and `art:pick` alike. */
export function keyMode(id: string): KeyMode {
  return NO_GREEN.has(id) ? 'noGreen' : LIGHT_GREEN.has(id) ? 'lightGreen' : 'keep';
}

/**
 * Likeness references for the family (Matt, 2026-10-18): a photo in the
 * git-ignored `art-originals/refs/` (private: never committed or copied into
 * the tracked tree) and the box (left, top, width, height) that crops one
 * person out of it. `art:gen` attaches the crop to the char and face prompts of
 * that character; `--no-ref` sends the text alone. The roster looks describe
 * the same people in words, so the prompts still work without the photos.
 */
export const REFS: Record<string, { photo: string; box: [number, number, number, number]; who: string; style?: boolean; toy?: boolean; ids?: string[] }> = {
  // Item 028: Matt's picture of a gold mech, a style reference (`style`) for an
  // original design, not a likeness: the prompt says not to copy it.
  scar: { photo: 'scar_reference.png', box: [0, 0, 512, 512], who: 'a chunky gold-and-black armoured mech with a cyan visor, a glowing orange chest core and a blaster arm', style: true },
  // Item 110: Bluerilla, Rilla's good side, is Julia's plush gorilla (`toy`: a
  // likeness of a soft toy, not a person). Only the good image (`ids`): EvilRilla
  // and the face card keep their own looks.
  rilla: { photo: 'bluerilla_reference.png', box: [280, 70, 840, 890], who: "Julia's plush toy gorilla", toy: true, ids: ['char_rilla_good'] },
  julia: { photo: 'julia_and_ellie.png', box: [270, 160, 420, 500], who: 'the girl with pink glasses' },
  ellie: { photo: 'julia_and_ellie.png', box: [600, 320, 560, 560], who: 'the toddler' },
  dada_matt: { photo: 'family_dada_matt_far_left.png', box: [360, 260, 300, 380], who: 'the man in front with the beard and the teal shirt (not the baby, not the man behind him)' },
  dada_jason: { photo: 'dada_jason_with_ellie.png', box: [60, 160, 600, 620], who: 'the man with glasses (not the toddler)' },
};

/** The character whose likeness reference an asset id uses, if any: `char_<c>_<good|evil|outfit>` and `face_<c>[_<outfit>]`. */
export function refFor(id: string): string | undefined {
  // `[a-z_]+`: a dad's form is `char_dada_matt_lifter_good` (item 025).
  return Object.keys(REFS).find((c) => (REFS[c]!.ids ? REFS[c]!.ids!.includes(id) : new RegExp(`^face_${c}(_[a-z]+)*$`).test(id) || new RegExp(`^char_${c}_[a-z_]+$`).test(id)));
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
  // Item 178's new words, promoted by item 182 (HELMET still the painted placeholder, stored).
  pic_frost: "New word FROST (item 178, level 2, short O, a final blend). `current` is candidate 1, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: she may say ice, snow or window.",
  pic_pond: "New word POND (item 178, level 2, short O, a final blend). `current` is candidate 1, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: she may say water, lake or puddle.",
  pic_sand: "New word SAND (item 178, level 2, a final blend). `current` is candidate 1, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: a spade in it may read as dig or beach.",
  pic_fang: "New word FANG (item 178, level 3, NG). `current` is candidate 1, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: the hardest new picture: she may say teeth, tooth or snake.",
  pic_helmet: "New word HELMET (item 178, two short-vowel syllables, level 2). `current` is candidate 4, promoted by item 187: Matt's pick in art_alts_183 (brief 183_helmet_bike, now its PICTURES line), a red-and-yellow kid's bicycle helmet; HELMET, stored by item 182 while it had no picture, is live again. `0` is the painted placeholder. Watch: she may say hat.",
  pic_goblin: "New word GOBLIN (item 178, two short-vowel syllables, level 2, short O first). `current` is candidate 1, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: she may say elf or monster.",
  pic_cape: "New word CAPE (item 178, silent E, long A). `current` is candidate 1, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: a cape with nobody in it may read as a flag or a blanket.",
  pic_cave: "New word CAVE (item 178, silent E, long A). `current` is candidate 3, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: she may say hole, rock or mountain.",
  pic_flame: "New word FLAME (item 178, silent E, long A). `current` is candidate 1, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: she will likely say fire.",
  pic_smoke: "New word SMOKE (item 178, silent E, long O). `current` is candidate 2, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: she may say cloud or chimney.",
  pic_sword: "New word SWORD (item 178, untaught: a silent W and the new OR sound). Ellie's Spinny Swords keep it out of her episodes. `current` is candidate 2, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder.",
  pic_shield: "New word SHIELD (item 178, untaught: IE says long E). `current` is candidate 1, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder.",
  pic_bow: "New word BOW (item 178, a bow and arrow; its OW is long O, not COW's). `current` is candidate 1, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: she may say arrow.",
  pic_dragon: "New word DRAGON (item 178, untaught: its O a schwa). `current` is candidate 1, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: should not look like Smaug or Tiamat, or she says their name.",
  pic_crown: "New word CROWN (item 178, untaught: COW's OW). `current` is candidate 2, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: she may say king or princess.",
  pic_castle: "New word CASTLE (item 178, untaught: a silent T, the L carrying \"ul\"). `current` is candidate 3, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: she may say house or palace.",
  pic_wizard: "New word WIZARD (item 178, in ROBOT's place while the bedroom's toys were kept out of play, until item 184; untaught: AR says ER). `current` is candidate 3, promoted by item 182 (Matt's pick in art_alts_178). `0` is the painted placeholder. Watch: she may say witch or Santa.",
  pic_teddy: "New word TEDDY (item 188). `current` is candidate 1, promoted by item 189 (Matt's pick in art_alts_188): a golden teddy sitting face-on with a red bow, unlike the bedroom's brown walking bear (obj_teddy). `0` is the painted placeholder. Watch: she may say bear; not HUG's two hugging teddies or CUB's bear cub.",
  pic_rocket: "New word ROCKET (item 188). `current` is candidate 2, promoted by item 189 (Matt's pick in art_alts_188): a silver-and-purple rocket standing still, no flames, unlike the bedroom's cream-red-blue rocket on its pad (obj_rocket) and BLAST's launch. `0` is the painted placeholder. Watch: she may say spaceship.",
  pic_ball: "New word BALL (item 188; untaught ALL). `current` is candidate 3 of art_alts_189 (brief 189_ball_soccer), promoted by item 190. Matt passed on art_alts_188's red star ball; item 189's redraw (art_alts_189, brief 189_ball_soccer) is a plain black-and-white soccer ball, like its ⚽ glyph and unlike the bedroom's rainbow beach ball (obj_ball). `0` is the painted placeholder. Watch: it should read as 'ball', not 'football' or 'soccer'.",
  pic_unicorn: "New word UNICORN (item 188; long U, untaught OR). `current` is candidate 2, promoted by item 189 (Matt's pick in art_alts_188): a lilac cartoon unicorn prancing, unlike the bedroom's white rainbow plush (obj_unicorn). `0` is the painted placeholder. Watch: she may say horse or pony.",
  pic_robot: "New word ROBOT (item 184, Matt: a toy shown in the bedroom never keeps its word out of play; long O, then BOT's short O). `current` is candidate 3, Matt's pick in art_alts_183 (brief 183_robot_friendly, now its PICTURES prompt): a white-and-orange robot waving, not the bedroom's blue wind-up toy (obj_robot). Watch: she may say toy.",
  // Item 167 promoted item 166's round (Hunt 12's M80) onto a minion of Evil Elsa's own, so the Snow Buddy keeps its art.
  minion_snow_golem: "The Snow Buddy, the minion good Elsa's Snow Buddies summon: it smiles. Evil Elsa's Grumpy Snowmen were this minion too until item 167 gave them their own, `minion_snow_grump` (M80); a grumpy look belongs there, not here.",
  minion_snow_grump: "The Grumpy Snowman, the minion Evil Elsa's Grumpy Snowmen summon (item 167). `current` is item 166's candidate 4 (brief 166_snowman_decal, now its `look`), Matt's pick: drawn with `--ref=art-originals/decal_anna_snowman.png` to match her grumpy house decal, so a redraw wants the same `--ref`.",
  arena_sky_race: "Evil Smaug's sky race (item 031): the game sweeps stalactites, lanterns and coin piles across it so it reads as a fast flight. `current` is candidate 2, promoted by item 031: the open sky in the middle reads most like flying. `0` is the painted placeholder.",
  arena_spell_tower: "The spell-beam clash (Evil Bavmorda, evil warlock Dada Jason; item 031): the beams meet over the middle of the floor. `current` is candidate 1, Matt's pick (item 034): glowing rune stones round a cracked, moonlit flagstone floor. 2 was item 031's promotion; `0` is the painted placeholder.",
  arena_cook_show: "The cook-off (chef Dada Jason as ally, item 031): the game stands two cooking stations on the floor. `current` is candidate 2, promoted by item 031: the least busy wall behind the stations. `0` is the painted placeholder.",
  prop_fight_finish_flag: 'The sky race\'s finish line (item 031), swept in at the end of each race. `current` is candidate 1, Matt\'s pick (item 034): the slimmer gold posts with jewelled tops. 2 was item 031\'s promotion; `0` is the painted placeholder.',
  prop_fight_stone: 'The Smaug story fight\'s stone (M33, item 120): she hides behind it from his fire breath and the fire rain, so it must read as a boulder at once, not a moon. `current` is the painted placeholder.',
  prop_fight_ledge: 'The Smaug story fight\'s ledge (M33, item 120): she climbs up on it out of his tail smash; she stands on its top, so it wants a flat top. `current` is the painted placeholder.',
  prop_fight_hoard: 'The Smaug story fight\'s hoard (M33, item 120): she sneaks to it and grabs while Dad keeps the dragon busy. `current` is the painted placeholder.',
  fx_story_fire: "The Smaug story fight's fire splash (item 124): it pops up behind Smaug, 640×480 under the camera's punch-in, as he breathes fire at her (she hides behind the stone), and again in part 2 for his fire from the sky. It wants to read as fire at a glance. `current` is the painted placeholder.",
  fx_story_tail: "The Smaug story fight's tail splash (item 124): it pops up behind Smaug as his tail smashes down and she climbs up on the ledge out of its way (then his tail is stuck). It wants to read as a slam into the ground. `current` is the painted placeholder.",
  fx_story_spin: "The Smaug story fight's spin splash (item 124): it pops up behind Dad as he spins to keep the dragon busy while she sneaks to the hoard. It wants to read as a whirlwind round him, and is drawn behind him, so its middle may stay open. `current` is the painted placeholder.",
  fx_story_dive: "The Smaug story fight's dive splash (item 124): Smaug flies up and dives, and it bursts 720×540 where he lands. In part 1 it lands on the heroes and sends them home; in the part 2 finale (\"I'll bury you all in gold!\") the counter-item stops it. It wants to read as a gold burst. `current` is the painted placeholder.",
  prop_fight_trophy:'Over the winner of a race or a cook-off (item 031). `current` is candidate 3, Matt\'s pick (item 034): the ornate cup with a gold filigree crest round its ruby. 1 was item 031\'s promotion; `0` is the painted placeholder.',
  prop_fight_cook_station: 'Each side\'s station in the cook-off (item 031); the dish is stacked on its counter top. `current` is candidate 2, promoted by item 031: the clearest counter top. `0` is the painted placeholder.',
  face_rilla: "Bluerilla's face card (item 113), drawn with his promoted full body attached (`art:alts --ref=art-originals/char_rilla_good.png`) so face and fur match it. `current` is candidate 2, Matt's pick (item 115); `0` is the old pastel-blue robot's. Only the good side shows a face card (`Portrait`: none for an evil speaker), so EvilRilla needs none of his own.",
  char_scar_good: "Scar's redesign (items 028/030): a tiny gold mech, a little shorter than Julia. `current` is candidate 2, promoted by item 030 and kept by Matt (item 034): the biggest head and shortest legs (the smallest-reading), and a smiling visor. `0` is the old design.",
  char_scar_evil: "`current` is candidate 1, Matt's pick (item 034): a round black helmet with smoking exhaust stacks, a scowling red visor, blaster thrust forward and fist clenched. 3 was item 030's promotion; `0` is the old design.",
  face_scar: "`current` is candidate 2, Matt's pick (item 034): a laughing visor with his smiling mouth showing beneath it, blue jets behind. 4 was item 030's promotion; `0` is the old design.",
  room_place_robot_workshop: "Scar's own quest place (item 030; he trained in the hacker den before). `current` is candidate 2, promoted by item 030: the plainest wall behind the middle, where the game draws the doors and the portal. `0` is the painted placeholder.",
  room_side_parts_bay: '`current` is candidate 3, promoted by item 030: the claw and the conveyor read most robot. `0` is the painted placeholder.',
  room_side_rocket_pad: '`current` is candidate 1, promoted by item 030: the clearest launch rings and floor. `0` is the painted placeholder.',
  pic_zap: "Move word ZAP (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 1, Matt's pick (item 020). 0 is candidate 2, item 018's promotion.",
  pic_pow: "Move word POW (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 1, Matt's pick (item 020). 0 is candidate 2, item 018's promotion: the most compact glove and flash.",
  pic_bam: 'Move word BAM (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 3, promoted by item 018: the clearest impact and cracks. 0 is the painted placeholder.',
  pic_zip: "ZIP, live again (item 178). `current` is candidate 1, promoted by item 182: Matt's pick of the redraw from brief 178_zip_redraw, now its PICTURES line. `0` is the painted placeholder.",
  pic_hop: 'Move word HOP (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018: the dotted jump arc shows. 0 is the painted placeholder.',
  pic_pop: 'Move word POP (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018: still reads as a balloon. 0 is the painted placeholder.',
  pic_mug: 'New word MUG (item 035, the -UG family): the word machine, the rooms and the entry hall. A big mug, so it never reads as CUP. `current` is candidate 3, promoted by item 187: Matt\'s pick in art_alts_183 (brief 183_mug_dad, now its PICTURES line), a big orange coffee mug in a grown-up\'s hand; item 035\'s cocoa mug read as a cup. `0` is the painted placeholder.',
  pic_rug: 'New word RUG (item 035, the -UG family): the word machine, the rooms and the entry hall. `current` is candidate 1, promoted by item 035: the biggest, the tassels clearest. `0` is the painted placeholder.',
  pic_jug: "JUG, live again (item 178). `current` is candidate 1, promoted by item 182: Matt's pick of the redraw from brief 178_jug_redraw, now its PICTURES line. `0` is the painted placeholder.",
  pic_cup: 'CUP redrawn as a teacup on a saucer (item 035): its old picture was a mug, which MUG now is. `current` is candidate 3, picked by Matt (item 037). 2 was the promotion of item 035, the plainest teacup. `0` is the old red mug.',
  pic_hug: 'Move word HUG (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 1, promoted by item 018: two different bears read as two. 0 is the painted placeholder.',
  pic_big: 'Move word BIG (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018. 0 is the painted placeholder.',
  pic_hot: 'Move word HOT (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 3, promoted by item 018. 0 is the painted placeholder.',
  pic_ice: 'Move word ICE (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018: the cleanest cube. 0 is the painted placeholder.',
  pic_dig: 'Move word DIG (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018. 0 is the painted placeholder.',
  pic_run: 'Move word RUN (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018. 0 is the painted placeholder.',
  pic_mud: 'Move word MUD (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018. 0 is the painted placeholder.',
  pic_wet: "WET, live again (item 178). `current` is candidate 2, promoted by item 182: Matt's pick of the redraw from brief 178_wet_redraw, now its PICTURES line. `0` is the painted placeholder.",
  pic_fog: 'Move word FOG (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 3, promoted by item 187: Matt\'s pick in art_alts_183 (brief 183_fog_fade, now its PICTURES line), a park path fading into fog; item 018\'s fog alone read as a cloud. `0` is the painted placeholder.',
  pic_top: 'Move word TOP (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018: 1 has a green band keyed half-clear. 0 is the painted placeholder.',
  pic_tug: 'Move word TUG (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018: the tightest rope; all three are long and thin. 0 is the painted placeholder.',
  pic_fix: 'Move word FIX (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2, promoted by item 018. 0 is the painted placeholder.',
  pic_pan: "Move word PAN (item 018): the picture beside it in the victory recap and the fan of pictures on its super. `current` is candidate 2 of item 070's round, Matt's pick (item 073): an empty pan, so it never reads as EGG. 0 is the painted placeholder.",
  pic_mat: "`current` is candidate 3 of item 070's round, Matt's pick (item 073): jigsaw foam tiles, so it never reads as RUG. `0` is the old striped mat with tassels.",
  pic_rock: "`current` is candidate 4 of item 070's round, Matt's pick (item 073): bold, outlined and orange-brown, apart from the bridge room's grey boulders. Its `0` is not a usable image.",
  pic_ram: "RAM, live again (item 178). `current` is candidate 1, promoted by item 182: Matt's pick of the redraw from brief 178_ram_redraw, now its PICTURES line. `0` is the painted placeholder.",
  char_tiamat_good: "`current` is candidate 3, Matt's pick (item 016): wings spread open, hands clasped over her belly. 0 is item 013's first promotion (candidate 1).",
  char_tiamat_evil: "`current` is candidate 3, Matt's pick (item 016): gold collar and cuffs, one hand on her hip. 0 is item 013's first promotion (candidate 2, the plainest dragon belly).",
  face_tiamat: '`current` is candidate 2, promoted by item 013: the only one without a bust shape.',
  item_magic_hat: 'Evil Tiamat\'s counter (SCARED OF THE HAT). `current` is candidate 1, Matt\'s pick (item 016): grey clouds, rain and lightning swirling down into its golden top. 0 is item 013\'s first promotion (candidate 2). All three drew a rain storm, not her purple fire storm.',
  decal_tiamat_scale: '`current` is candidate 1, promoted by item 013.',
  decal_tiamat_banner: '`current` is candidate 1, promoted by item 013 (2 lies crumpled on the floor and reads less clearly).',
  prop_silver_sword: "Ellie's one sword move (Spinny Swords, item 016): she spins them round herself, then flings them; it shows with any Ellie image. `current` is candidate 3, Matt's pick (item 016): an icy-blue crystal blade, pink gems and grip. 0 is item 014's first promotion (candidate 2, plain silver).",
  char_ellie_good: "`current` is candidate 0, the original bubble-wand Ellie, Matt's pick (item 016); she fights with bubbles and one sword move, and the game draws her swords round her when she uses it. 1 to 3 are item 009's bubble-wand candidates; 4 to 6 (item 014) summon silver swords.",
  char_julia_chef: 'Julia in her chef outfit (content/battle/outfits.ts): every scene after she wakes uses it when Dada Jason is the ally. `current` is candidate 3, promoted by item 012 (closest face and fringe to her other art, pink shoes like hers).',
  face_julia_chef: "New id (item 016): chef Julia's name-free face card, the picture for reading JULIA in a chef episode. `current` is candidate 2, promoted by item 016 (hat, fringe and smile closest to char_julia_chef); 1 and 3 are as good, with a taller hat. `0` is the painted placeholder.",
  face_anna: "Good Anna's face card redrawn to match her promoted copper-curls full body (item 113; drawn with it attached, `art:alts --ref=art-originals/char_anna_good.png`). `current` is candidate 1, Matt's pick (item 115); before it, item 009's dark-ponytail card; `0` the oldest original, from before item 009.",
  room_bedroom_julia: 'Redrawn with no loose toys of its own: the first one painted a teddy and a rocket that doubled the toys the game puts on the floor.',
  decal_rilla_footprint: 'Redrawn as one giant robot-gorilla footprint: the earlier try still read as bare human feet.',
  prop_word_machine: "The word machine (item 026): the game puts the picture in its round window and draws its own letter panel over the blank lower panel. `current` is candidate 3, Matt's pick (item 032): a round glass dome over a cream panel, with a crank on the side; `WINDOW` / `PANEL` in src/scenes/WordMachine.ts are fitted to it (fractions of the image), so a different pick needs them refitted. 2 is item 026's promotion; 0 is the painted placeholder.",
  room_end_fort: "`current` is candidate 3, Matt's pick (item 032): a fairy-lit living room, a green sofa, a moon window, a big white rug across an open middle where the game draws the pillow fort. `0` is the art item 027 left in the game.",
  prop_machine_tile: "The word machine's letter tiles, a letter painted on each by the game. `current` is candidate 3, promoted by item 026: the flattest blank top for a letter (1 is a cube seen corner-on). 0 is the painted placeholder.",
  ...pickedBy025(),
  ...pickedBy032(),
  // Item 043: Matt's 040 pick, and the cyber Dada Matt redesign (brief 041_cyber_gauntlet_engineer).
  pic_key: "New word KEY (item 043, a long-vowel word for K: level 1, the hint sounds K then long E since item 048; rooms, warm-up, battle item). `current` is candidate 1, promoted by item 043: the boldest teeth; all three are nearly the same gold key. `0` is the painted placeholder.",
  pic_yoyo: "New word YOYO (item 043, a long-vowel word for Y, printed YOYO: level 1, the hint sounds Y, long O, twice since item 048; rooms, warm-up, battle item). `current` is candidate 3, Matt's pick (item 049). 1 was item 043's: the biggest yo-yo, its string clearest. `0` is the painted placeholder. Watch: kept apart from TOP (both spinning toys).",
  pic_chest: "Item 040's word CHEST. `current` is candidate 3, Matt's pick (item 043). `0` is the painted placeholder.",
  char_dada_matt_cyber_good: "Cyber Dada Matt redrawn as a gauntlet engineer (item 041's brief round). `current` is candidate 10, Matt's pick (item 043, brief 041_cyber_gauntlet_engineer): the cyan power gauntlet projecting hologram tools, goggles up. 1 to 3 are item 025's hacker design; `0` is the painted placeholder.",
  char_dada_matt_cyber_evil: "Evil cyber Dada Matt in the same gauntlet-engineer look (item 043): the same build and gauntlet, glowing red. `current` is candidate 5, promoted by item 043: red gauntlet and hologram tools, goggles up, no green (4 has a teal shirt). 1 to 3 are item 025's hacker design (2 was Matt's item 032 pick); `0` is the painted placeholder.",
  // Item 046: Matt's picks from item 044's palette round (art_alts_045_palettes) and item 043's round (art_alts_044); each brief is now the look.
  char_dada_jason_good: "Chef Dada Jason in forest green (item 044's palette round). `current` is candidate 2, Matt's pick (item 046, brief 045_jason_chef_trim): white chef's whites trimmed in forest green. 1 is the forest-green jacket; `0` is the red-neckerchief chef. Cut light-green-only (`LIGHT_GREEN`, item 049).",
  char_dada_jason_warrior_good: "Warrior Dada Jason in forest green (item 044's palette round). `current` is candidate 5, Matt's pick (item 046, brief 045_jason_warrior_trim): silver plate over a forest-green tunic, a green cape. 4 is forest-green armour; 3 was Matt's item 032 pick (red cape); `0` is the painted placeholder. Cut light-green-only (`LIGHT_GREEN`, item 049).",
  char_dada_jason_warlock_good: "Warlock Dada Jason in forest green (item 044's palette round). `current` is candidate 4, Matt's pick (item 046, brief 045_jason_warlock_green): forest-green robes, gold stars, an amber crystal and golden flames. 5 is purple robes with green trim; 1 was Matt's item 032 pick (purple); `0` is the painted placeholder. Cut light-green-only (`LIGHT_GREEN`, item 049).",
  char_dada_matt_good: "Builder Dada Matt in blue (item 044's palette round). `current` is candidate 4, Matt's pick (item 046, brief 045_matt_builder_blue): deep-blue-and-steel armour. 5 is steel with blue trim; `0` (the orange armour it replaced) and 1 to 3 are the orange design.",
  char_dada_matt_lifter_good: "Weightlifter Dada Matt in blue (item 044's palette round). `current` is candidate 7, Matt's pick (item 046, brief 045_matt_lifter_blue): a royal-blue tee with a gold star, blue sneakers. 8 is a white tee with blue bands; 5 was Matt's item 032 pick (red tee); 1 to 3 are item 025's barbell design; `0` is the painted placeholder.",
  char_dada_jason_evil: "Evil chef Dada Jason redrawn without the moustache (item 043's round). `current` is candidate 1, Matt's pick (item 046, brief 044_evilchef_ladle): black-and-purple chef, a ladle of glowing purple sauce, his own goatee. 2 to 10 are the other props (whisk, rolling pin, cupcakes, cauldron); `0` is the moustached chef it replaced.",
  face_dada_matt_cyber: "Cyber Dada Matt's face card in the gauntlet-engineer look (item 043's round). `current` is candidate 4, Matt's pick (item 046, brief 044_cyberface_wrench, now its HAND prompt): the gauntlet raised with a hologram wrench, goggles up. 1 to 3 are item 025's hacker design.",
  // Item 046's face round (art_alts_046_faces): the five recoloured forms' cards redrawn from their new looks.
  face_dada_jason: "Chef Dada Jason's face card in forest-green trim (item 046). `current` is candidate 1, Matt's pick (item 049); the light-green keying clears the screen 046 saw through its lens. 2 was item 046's: the whisk away from his face. `0` is the red-neckerchief card. Cut light-green-only (`LIGHT_GREEN`, item 049).",
  face_dada_jason_warrior: "Warrior Dada Jason's face card, silver over forest green (item 046). `current` is candidate 5, Matt's pick (item 049); its lens over the screen keys clear with the light-green keying. 4 was item 046's: the most green tunic under the plate, like the full body. 2 is item 025's red-cape card; `0` is the painted placeholder. Cut light-green-only (`LIGHT_GREEN`, item 049).",
  face_dada_jason_warlock: "Warlock Dada Jason's face card in forest-green robes (item 046). `current` is candidate 5, promoted by item 046 and Matt's pick (item 049): the staff on his right as in the full body, the flame over his robe rather than the screen. 4 is as good; 2 is item 025's purple card; `0` is the painted placeholder. Cut light-green-only (`LIGHT_GREEN`, item 049).",
  face_dada_matt: "Builder Dada Matt's face card in blue armour (item 046). `current` is candidate 4, promoted by item 046: the grey hammer with gold studs, as in the full body. 1 to 3 are the orange design.",
  face_dada_matt_lifter: "Weightlifter Dada Matt's face card in the royal-blue tee (item 046). `current` is candidate 7, promoted by item 046: the gold star centred, as in the full body. 6 was Matt's item 032/034 pick (red tee); 1 to 3 are item 025's design; `0` is the painted placeholder.",
  // Item 037: the word bank's new words (picked by a review pass; Matt's picker is art_alts_037_words).
  pic_ant: "New word ANT (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: a friendly red ant whose six legs and segmented body show most clearly. The cut is clean. All three are good. `0` is the painted placeholder.",
  pic_belt: "New word BELT (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: a coiled belt with its buckle, keeper loop and a full row of holes. It is the clearest belt shape and the cut is clean. `0` is the painted placeholder.",
  pic_bib: "New word BIB (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: classic baby bib with polka dots and a bow tie; the neck opening is cleaner than in 1, and the dots are more even than in 3. `0` is the painted placeholder.",
  pic_blast: "New word BLAST (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 2, promoted by item 037: rocket blasting off, with the biggest and most fiery flame and smoke, so it reads most as a launch. `0` is the painted placeholder. Watch: She will probably say ROCKET first; BLAST rests on the flame.",
  pic_bop: "BOP, live again (item 178). `current` is candidate 1, promoted by item 182: Matt's pick of the redraw from brief 178_bop_redraw, now its PICTURES line. `0` is the painted placeholder.",
  pic_bump: "New word BUMP (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 3, promoted by item 037: two kids in bumper cars meeting at a star, a clear and happy action; 1 and 2 are empty cars. `0` is the painted placeholder. Watch: Could be called CRASH or CARS.",
  pic_bun: "New word BUN (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 1, promoted by item 037: classic round sesame bun with a visible base split; reads instantly as a bread bun. `0` is the painted placeholder. Watch: Could be named 'bread' or 'burger bun'; acceptable.",
  pic_chick: "New word CHICK (item 037, level 3, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: yellow chick hatching from an egg, nothing like a duck or a hen; the eggshell says baby bird, wings spread, clean cut. `0` is the painted placeholder.",
  pic_chop: "New word CHOP (item 037, level 3, a move word: the victory recap and the fan on its super). `current` is candidate 2, promoted by item 037: axe biting into the log mid-split with chips flying; the clearest chop. `0` is the painted placeholder.",
  pic_clap: "New word CLAP (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 1, promoted by item 037: the classic clapping-hands emoji with motion bursts; the most instantly read as clapping. `0` is the painted placeholder. Watch: Candidate 2 looks clasped, like a high five. Candidate 3 has the hands apart, like praying or a cheer.",
  pic_cog: "New word COG (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: bold outline and crisp teeth; the three are near-identical. `0` is the painted placeholder. Watch: Most children would say 'gear', not 'cog'.",
  pic_crab: "New word CRAB (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: classic red cartoon crab, claws up, clean outline; all three are fine. `0` is the painted placeholder.",
  pic_desk: "DESK, live again (item 178). `current` is candidate 1, promoted by item 182: Matt's pick of the redraw from brief 178_desk_redraw, now its PICTURES line. `0` is the painted placeholder.",
  pic_dot: "DOT (item 037's move word; item 157 makes it a picture to read too, `both`: the Shape-Shifter's DOG-DOT-POT). `current` is item 166's candidate 6 (brief 166_dot_marker, now its prompt), Matt's pick, promoted by item 167: a flat dark-blue marker dot on a white card with the pen beside it, no shine or shadow. It replaced item 160's shiny blue dot, which read as a ball standing on the sand (Hunt 12, M79), and that replaced item 037's polka-dot cloth, which read as 'dots', 'spots' or a blanket. `0` is the painted placeholder. Watch: she may say 'pen'.",
  pic_drip: "New word DRIP (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 3, promoted by item 037: drop has left the tap and is falling, so it shows the action; no distracting face (2) and clean edges. `0` is the painted placeholder. Watch: Could be named TAP. Keep it visually distinct from the PLOP splash.",
  pic_drum: "New word DRUM (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: clear red toy drum with crossed sticks and the cleanest proportions and outline. `0` is the painted placeholder.",
  pic_duck: "New word DUCK (item 037, level 3, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: friendly white duck in a clear walking pose, flat duck bill and webbed feet. `0` is the painted placeholder. Watch: With its long neck, a white duck could be read as a goose; a classic yellow or mallard duck would be safer.",
  pic_fig: "New word FIG (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: whole fig beside a cut half; the seeded red inside shows it is a fig and not a plum; clean cut. `0` is the painted placeholder. Watch: Figs are unfamiliar to most 4-year-olds. The whole purple fruit could be taken for a plum, and only the cut half rules that out.",
  pic_fin: "New word FIN (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: tallest, most clearly a shark fin cutting through the water; clean outline. `0` is the painted placeholder. Watch: May be named 'shark' rather than 'fin'.",
  pic_fish: "New word FISH (item 037, level 3, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: clear goldfish with a big friendly face and a neat silhouette; all three are near-identical and clean. `0` is the painted placeholder.",
  pic_flag: "New word FLAG (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 1, promoted by item 037: a plain red flag on a pole, the largest flag of the three, with no text. All three are clean and almost identical. `0` is the painted placeholder.",
  pic_flip: "New word FLIP (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 3, promoted by item 037: pancake in the air over the pan, with a dotted arc and arrowhead that show it turning over and landing back; the clearest flipping action. `0` is the painted placeholder. Watch: She may say PANCAKE before FLIP, because the action depends on the dotted arc.",
  pic_flop: "FLOP, live again (item 178). `current` is candidate 2, promoted by item 182: Matt's pick of the redraw from brief 178_flop_redraw, now its PICTURES line. `0` is the painted placeholder.",
  pic_frog: "New word FROG (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: a classic cute green frog, sitting square to the viewer. It is unmistakable and the cut is clean. All three are near-identical. `0` is the painted placeholder. Watch: A green fringe is hard to see against a green subject, so check it in the game.",
  pic_gift: "New word GIFT (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: star wrapping paper and a bow make it clearly a present, not a plain BOX. Candidates 1 and 2 have plain blue sides and lean more toward 'box'. `0` is the painted placeholder.",
  pic_grab: "New word GRAB (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 2, promoted by item 037: claw clearly closed around the teddy; clean cut, nothing stray. `0` is the painted placeholder. Watch: All three are a claw-machine teddy, so a 4-year-old may say TEDDY or CLAW before GRAB. A hand grabbing something would read better as the action.",
  pic_gum: "New word GUM (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: the bubble swells from her lips and covers her face, which is the clearest bubble-gum pose. All three are clean. `0` is the painted placeholder. Watch: In all three the pink bubble could be called BALLOON or BUBBLE. GUM is never shown as a piece of gum.",
  pic_hand: "New word HAND (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: open palm, five clear fingers, clean wrist cut. `0` is the painted placeholder. Watch: An open palm can be read as HIGH FIVE or FIVE, but HAND is the most likely name.",
  pic_hex: "HEX, live again (item 178). `current` is candidate 1, promoted by item 182: Matt's pick of the redraw from brief 178_hex_redraw, now its PICTURES line. `0` is the painted placeholder.",
  pic_hum: "New word HUM (item 037, level 1, a move word: the victory recap and the fan on its super). `current` is candidate 2, promoted by item 037: eyes shut, mouth closed and smiling, with notes: reads as humming, not singing; clean. `0` is the painted placeholder. Watch: May still be named SING; no open-mouth/closed-mouth cue beyond the smile.",
  pic_hut: "New word HUT (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: a round mud hut with a thatched roof and a clear doorway: a classic hut, nothing like a shed or a tent. The cut is clean. Candidate 1 is near-identical. `0` is the painted placeholder. Watch: The hut candidates are in run 1 (scratch\\art_alts_037_words_1\\pic_hut-*.png), not run 3 as the task says. Run 3 has no hut files.",
  pic_jab: "New word JAB (item 037, level 1, a move word: the victory recap and the fan on its super). `current` is candidate 3, promoted by item 187: Matt's pick in art_alts_183 (brief 183_jab_mitt, now its PICTURES line), a kid jabbing a coach's target mitt; item 037's lone glove read as a punch. `0` is the painted placeholder. Watch: she may say PUNCH or BOXING.",
  pic_jam: "New word JAM (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: the spoon holds a dollop of jam, so it reads as jam you eat, not just a jar of strawberries. All three are clean cuts with no text. `0` is the painted placeholder.",
  pic_jig: "New word JIG (item 037, level 1, a move word: the victory recap and the fan on its super). `current` is candidate 2, promoted by item 037: buckled dancing shoes in mid-kick with music notes and motion lines show a lively dance; shoes and notes are bigger and clearer than in 1. `0` is the painted placeholder. Watch: All three are a pair of dancing shoes with notes. She will say DANCE or SHOES, not JIG. JIG is hard to show as an action without a dancing figure.",
  pic_jog: "New word JOG (item 037, level 1, a move word: the victory recap and the fan on its super). `current` is candidate 1, promoted by item 037: a runner in a headband and wristbands with dust puffs, the most 'jogger' kit of the three. It is the largest figure and the cut is clean. `0` is the painted placeholder. Watch: All three look the same, and a 4-year-old will say RUN. Nothing in any candidate tells JOG apart from RUN.",
  pic_jump: "New word JUMP (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 2, promoted by item 037: kangaroo mid-leap over a dark dashed arc that reads clearly; in 1 and 3 the arc is faint white dashes that may vanish or look like a broken cut. `0` is the painted placeholder. Watch: She may say KANGAROO instead of JUMP; the arc is the only thing showing the action.",
  pic_kick: "New word KICK (item 037, level 3, a move word: the victory recap and the fan on its super). `current` is candidate 2, promoted by item 037: clear gap and speed lines show the ball flying off the shoe; it reads as the action of kicking. `0` is the painted placeholder. Watch: She may say BALL or SOCCER, but the foot striking the ball is the focus. Candidate 1 is a close second.",
  pic_kit: "New word KIT (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: open red toolbox with a hammer, wrench and screwdriver; the most compact and clean of the three. `0` is the painted placeholder. Watch: All three are toolboxes. She is likely to say TOOLS or TOOLBOX, and could say BOX, a clash this game names.",
  pic_lamp: "New word LAMP (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: the bulb glows visibly under the shade, so it reads as a lamp that is on. It is a clean, simple table-lamp shape. `0` is the painted placeholder.",
  pic_leg: "New word LEG (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 1, promoted by item 037: shows the most bare leg (knee and thigh) compared with the sock and shoe. `0` is the painted placeholder. Watch: All three are dominated by a striped sock and red shoe, so SOCK or SHOE are likely answers. The sock also looks like the SOCK picture.",
  pic_lift: "LIFT, live again (item 178). `current` is candidate 1, promoted by item 182: Matt's pick of the redraw from brief 178_lift_redraw, now its PICTURES line. `0` is the painted placeholder.",
  pic_lip: "New word LIP (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 1, promoted by item 037: glossy red lips, slightly parted with teeth showing, so they read as a mouth part; clean cut. `0` is the painted placeholder. Watch: She may say LIPS (plural) or MOUTH.",
  pic_mask: "New word MASK (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: simplest masquerade eye mask, least ornament clutter, eye holes clear. `0` is the painted placeholder.",
  pic_melt: "New word MELT (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 3, promoted by item 037: most dripping: a falling drop and a puddle make melting the main idea. `0` is the painted placeholder. Watch: Likely named ICE CREAM first; the melting is shown but the object dominates.",
  pic_milk: "New word MILK (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: cow-print carton plus a full glass, crisp outline, no text on the carton; the glass reads clearly as milk. `0` is the painted placeholder.",
  pic_mix: "New word MIX (item 037, level 1, a move word: the victory recap and the fan on its super). `current` is candidate 2, promoted by item 037: a whisk in a bowl of batter with splashes, so the action is clear. The cut is clean. The three are almost identical, and 2 shows the swirl in the batter best. `0` is the painted placeholder.",
  pic_moth: "New word MOTH (item 037, level 3, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: most drab, furry and moth-like, with no butterfly-style eyespots; the feathery antennae are a strong moth cue. `0` is the painted placeholder. Watch: A 4-year-old may still say BUTTERFLY. Candidates 1 and 2 have eyespot wing patterns that push them further toward BUTTERFLY.",
  pic_nap: "New word NAP (item 037, level 1, a move word: the victory recap and the fan on its super). `current` is candidate 1, promoted by item 037: a cat curled up on a cushion, eyes shut, wearing a nightcap. It reads as a cosy nap. The cushion is plain and the cut is clean. `0` is the painted placeholder. Watch: She may say SLEEP or CAT rather than NAP. Any of the three has this risk.",
  pic_nest: "New word NEST (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: classic twig nest with three blue eggs, clean outline; all three are near-identical, 3 is the crispest. `0` is the painted placeholder.",
  pic_peg: "New word PEG (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 1, promoted by item 037: cleanest, most coherent clothes peg; spring reads correctly and it has no odd geometry. `0` is the painted placeholder. Watch: Children often say 'clip' or 'clothespin', so PEG is not an instant name.",
  pic_plop: "New word PLOP (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 2, promoted by item 037: drop over the biggest splash crown in a puddle; clean cut. `0` is the painted placeholder. Watch: A drop falling into water is very close to DRIP (and SPLASH). It may not be told apart from the DRIP picture.",
  pic_plug: "New word PLUG (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: clean US-style two-prong plug with its cord; the familiar wall-plug shape, and no artifacts. `0` is the painted placeholder. Watch: Candidates 1 and 2 are European round-pin plugs, which are less familiar if she is in the US. All three are close otherwise.",
  pic_plum: "New word PLUM (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: purple with the plum's side cleft, stem and leaf; cleaner edge than 1; 3 has no cleft and reads more like an apple. `0` is the painted placeholder. Watch: Purple fruit can still be named GRAPE or FIG by a 4-year-old.",
  pic_pod: "New word POD (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: open pea pod with peas clearly visible, and the boldest, most centred cut. `0` is the painted placeholder. Watch: She may say PEAS rather than POD.",
  pic_raft: "New word RAFT (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: the five lashed logs are the biggest and nearest, and the sail is smaller than in 3. The water and the cut are clean. `0` is the painted placeholder. Watch: The sail may still make her say BOAT, or confuse it with SHIP. A raft with no sail, or a paddle, would be less ambiguous.",
  pic_red: "New word RED (item 037, level 1, a move word: the victory recap and the fan on its super). `current` is candidate 3, promoted by item 037: bold, simple red splat with fewer stray droplets, so less clutter and the colour dominates. `0` is the painted placeholder. Watch: Abstract: might be named 'splat' or 'paint' rather than 'red'.",
  pic_rod: "New word ROD (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: fishing rod with reel and hook; its line is the most visible of the three, and the blue and orange stand out. `0` is the painted placeholder. Watch: She may say FISHING ROD or FISHING POLE; it is still the right idea.",
  pic_rush: "New word RUSH (item 037, level 3, a move word: the victory recap and the fan on its super). `current` is candidate 3, promoted by item 187: Matt's pick in art_alts_183 (brief 183_rush_bus, now its PICTURES line), a kid rushing for a closing school bus; item 037's gust of wind read as WIND or BLOW. `0` is the painted placeholder. Watch: she may say RUN.",
  pic_shed: "New word SHED (item 037, level 3, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: a small wooden garden shed with a plank door and hinges, cleanly cut; 1 and 3 are just as good. `0` is the painted placeholder. Watch: Any of the three could still be named HUT or HOUSE; the plank door and hinges are what make it read as a shed.",
  pic_ship: "New word SHIP (item 037, level 3, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: the simplest sailing ship, fewest ropes. `0` is the painted placeholder.",
  pic_six: "Word SIX (item 037). Redrawn by item 059 as a big decorated numeral 6 (blue, polka dots and stars): the die of item 037 read as DICE, not SIX. `0` is the painted placeholder.",
  pic_ten: "New word TEN (item 059, level 1, a picture to read): a big decorated numeral 10, a purple 1 and an orange 0 with rainbow stripes. `0` is the painted placeholder.",
  pic_skip: "SKIP, live again (item 178). `current` is candidate 1, promoted by item 182: Matt's pick of the redraw from brief 178_skip_redraw, now its PICTURES line. `0` is the painted placeholder.",
  pic_slam: "New word SLAM (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 2, promoted by item 037: fist hitting the ground with rocks flying, so it reads as a smash rather than a glowing magic circle. `0` is the painted placeholder. Watch: Could be named PUNCH or SMASH.",
  pic_sled: "New word SLED (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: the three-quarter view shows both curled runners and the slats on snow. Side-on views 1 and 3 look a bit more like a bench. `0` is the painted placeholder. Watch: She may say SLEIGH, but SLED is the more likely word for a child.",
  pic_slug: "New word SLUG (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 1, promoted by item 037: whole body visible, eye stalks and slime trail say slug rather than snail (no shell). `0` is the painted placeholder.",
  pic_snap: "SNAP, live again (item 178). `current` is candidate 1, promoted by item 182: Matt's pick of the redraw from brief 178_snap_redraw, now its PICTURES line. `0` is the painted placeholder.",
  pic_sock: "New word SOCK (item 037, level 3, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: classic striped sock, crisp closed outline; all three are near-identical and fine. `0` is the painted placeholder.",
  pic_spin: "New word SPIN (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 1, promoted by item 037: swirl rings wrap the whole body, so the turning motion reads most clearly. `0` is the painted placeholder. Watch: Ballerina may be named DANCE before SPIN.",
  pic_stomp: "New word STOMP (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 2, promoted by item 037: monster foot slamming down with dust puffs and cracked ground, whole leg inside the frame (3 is cropped at the top). `0` is the painted placeholder. Watch: Could be named FOOT or CLAW; the impact effects carry the action.",
  pic_sub: "New word SUB (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: yellow submarine with a periscope, portholes and a propeller; it is the simplest and boldest shape. Note that the sub pictures are in run folder 2, not run 1 as the task said. `0` is the painted placeholder.",
  pic_swim: "New word SWIM (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 1, promoted by item 037: boy in goggles kicking and stroking through splashing water; strongest action, clean cut (all three near-identical). `0` is the painted placeholder.",
  pic_tent: "New word TENT (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: most frontal and symmetric pup tent, open flaps and pegs; no confusion with HUT or SHED. `0` is the painted placeholder.",
  pic_trap: "New word TRAP (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 2, promoted by item 037: spring-door cage trap with the clearest snap motion lines on the door. `0` is the painted placeholder. Watch: Weak across all three: a 4-year-old will most likely say CAGE; nothing inside or about to be caught makes it read as TRAP.",
  pic_twig: "New word TWIG (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: slimmest and smallest stick with two leaves, reads as a twig rather than a thick branch or STICK. `0` is the painted placeholder.",
  pic_twist: "New word TWIST (item 037, level 2, a move word: the victory recap and the fan on its super). `current` is candidate 3, promoted by item 037: tightest spiral coils and the most swirl; it reads as twisting more than the others do. `0` is the painted placeholder. Watch: All three are purple tornadoes, so a 4-year-old will most likely say TORNADO or TWISTER, not TWIST. A twisting action (a person twisting, or a twisted wrung cloth) would be better. Consider redrawing.",
  pic_vat: "New word VAT (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 2, promoted by item 037: wide, open tub of bubbling purple potion, the least like a plain barrel of the three; clean cut. `0` is the painted placeholder. Watch: Weak: VAT is not a word she is likely to know, and the picture reads as a barrel or tub. She will need to be told the word.",
  pic_vest: "New word VEST (item 037, level 2, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 1, promoted by item 037: clear sleeveless hi-vis vest, clean cut; the three barely differ. `0` is the painted placeholder.",
  pic_wag: "New word WAG (item 037, level 1, a move word: the victory recap and the fan on its super). `current` is candidate 3, promoted by item 037: the tail is the focal point, high and centred with motion lines on both sides, and the dog looks back happily. `0` is the painted placeholder.",
  pic_wig: "New word WIG (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 3, promoted by item 037: fullest, most head-shaped pink curly wig with a clean cut; all three are near-identical. `0` is the painted placeholder. Watch: A 4-year-old may say 'hair' or 'clown hair' rather than 'wig'; no head or stand to show it is worn.",
  pic_yak: "New word YAK (item 037, level 1, a picture to read: rooms, warm-up, word machine, battle item). `current` is candidate 1, promoted by item 037: shaggy brown yak with big horns and a friendly face, clean edges; all three are nearly the same. `0` is the painted placeholder. Watch: She may not know the word YAK and may call it a cow or a buffalo; the shaggy coat helps.",
  prop_medal: "M68 (hunt 11), item 145: lifter Dada Matt's workout move, in place of the 🏋️ card (a weightlifter flying into her). The word is written across the medal's face. `current` is candidate 1, Matt's pick (item 146); `0` is the painted placeholder.",
  prop_dragon_scale: "M68 (hunt 11), item 145: Seraphina's pink dragon's trick, in place of the green 🐉 card (her own pet flying into her). The word is written across the scale. `current` is candidate 2, Matt's pick (item 146); `0` is the painted placeholder (the egg is her hatching story's, so not this one's).",
  pic_yum: "New word YUM (item 037, level 1, a move word: the victory recap and the fan on its super). `current` is candidate 3, promoted by item 037: a big kid's face licking his lips next to a cupcake. The face is the main subject, which pushes the answer toward YUM rather than CUPCAKE. `0` is the painted placeholder. Watch: She may still name the cupcake. Candidate 2 (emoji face) is a close second.",
  // Item 157: the Shape-Shifter's new links (and DOT, a thing too now), drawn by art:alts; Matt's picks promoted by item 160.
  pic_pup: "New word PUP (item 157, level 1, a picture to read: the Shape-Shifter's PUP-CUP link, rooms, warm-up, battle item). `current` is candidate 1, promoted by item 160: a sitting brown-and-white puppy, floppy ears, red collar, tongue out; DOG's picture is a look-alike, so the two are never shown together. `0` is the painted placeholder. Watch: she may say 'puppy' (fine) or 'dog'.",
  pic_cub: "New word CUB (item 157, level 1, a picture to read: TUB-CUB-CUP). `current` is candidate 3, promoted by item 160: a real sitting brown bear cub waving one paw, no stitching, no bow. `0` is the painted placeholder. Watch: she may say 'bear' or 'baby bear'.",
  pic_cot: "New word COT (item 157, level 1, a picture to read: CAT-COT-POT). `current` is item 166's candidate 5 (brief 166_cot_tent, now its prompt), Matt's pick, promoted by item 167: a green camp cot on X legs on a patch of grass, a small orange tent behind and a rolled sleeping bag on it. It replaced item 160's blue cot with a pillow, which Hunt 12 (M79) said she will call BED. `0` is the painted placeholder. Watch: a US child may not know COT, and she may say TENT.",
  pic_kid: "New word KID (item 157, level 1, a picture to read: LIP-LID-KID). `current` is candidate 2, promoted by item 160: a waving boy of about six in an orange t-shirt and blue shorts, full body. A standing person: SHAPED_PICTURES fits it to its own shape. `0` is the painted placeholder. Watch: she may say 'boy'.",
  // Item 182: redraws promoted from item 178's round for ids with no note before.
  pic_queen: "QUEEN, live again (item 178). `current` is candidate 2, promoted by item 182: Matt's pick of the redraw from brief 178_queen_redraw, now its PICTURES line. `0` is the picture it had before item 182.",
  pic_gate: "GATE, live again (item 178). `current` is candidate 1, promoted by item 182: Matt's pick of the redraw from brief 178_gate_redraw, now its PICTURES line. `0` is the picture it had before item 182.",
  pic_jeep: "JEEP, live again (item 178). `current` is candidate 1, promoted by item 182: Matt's pick of the redraw from brief 178_jeep_redraw, now its PICTURES line. `0` is the picture it had before item 182.",
  pic_dash: "DASH, live again (item 178). `current` is candidate 1, promoted by item 182: Matt's pick of the redraw from brief 178_dash_redraw, now its PICTURES line. `0` is the picture it had before item 182.",
  pic_swish: "SWISH, live again (item 178). `current` is candidate 1, promoted by item 182: Matt's pick of the redraw from brief 178_swish_redraw, now its PICTURES line. `0` is the picture it had before item 182.",
  pic_jet: "JET, live again (item 178). `current` is candidate 2, promoted by item 182: Matt's pick of the redraw from brief 178_jet_redraw, now its PICTURES line. `0` is the picture it had before item 182.",
};

// Item 097: Charge's picture letters, one row per rune.
for (const r of RUNES) {
  if (!r.picture) continue;
  const bank = BANK_BY_WORD[r.picture.word] ? ' A bank word: an episode whose Charge uses this rune keeps it out of reading.' : '';
  PICK_NOTES[runeArt(r.sound)] = `The ${r.sound.toUpperCase()} rune (item 097) as a picture letter: ${r.picture.word.toUpperCase()}, for its sound.${bank} The game shows it on the rune stone (item 103).`;
}

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
  cup: 'a cup: a small white teacup with a dainty handle on a matching saucer, steam curling up; a teacup, not a mug',
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
  // Item 182: Matt's pick from item 178's round (brief 178_jet_redraw).
  jet: 'a jet: one small sleek grey fighter jet zooming across the sky, pointed nose, swept-back wings, two tail fins and a long bright orange flame from its jet engine at the back, white speed lines; a fast jet, not a big airliner with windows',
  log: 'a log: a single cut wooden log lying down, rings showing on the end',
  mop: 'a mop: a floor mop with a long wooden handle and a floppy white mop head',
  pot: 'a pot: a big silver cooking pot with two handles and a lid',
  rat: 'a rat: a grey rat with a long pink tail, side-on',
  // Item 035: the -UG family. MUG is a big tall mug, unlike CUP's teacup on a saucer.
  // Item 187: Matt's pick 3 from item 183's round (brief 183_mug_dad): the cocoa mug read as a cup.
  mug: "a mug: one huge chunky round-bellied mug of hot coffee held by a grown-up's big hand through its big thick handle, steam curling up; thick heavy sides and a big round handle, plainly a big mug, not a teacup, no saucer, no writing on it",
  rug: 'a rug: a colourful striped rectangular rug with tassel fringes on both short ends, lying flat on the floor seen from a little above',
  // Item 182: Matt's pick from item 178's round (brief 178_jug_redraw).
  jug: 'a jug: one big round brown pottery jug with a fat belly, a narrow neck, a little spout and a big loop handle on the side, empty, standing alone; clearly a jug, not a glass, not a cup, no milk showing',
  // Move words (item 018): the picture is what the move does, for the victory recap.
  zap: 'a zap: one bright yellow zig-zag lightning bolt crackling with little white sparks',
  pow: 'a pow: a big red cartoon boxing glove punching forward into a jagged yellow star-shaped impact flash, with no letters in the flash',
  bam: 'a bam: a big wooden cartoon mallet smashing down onto the ground, a jagged star-shaped impact and little cracks under it, with no letters',
  // Item 182: Matt's pick from item 178's round (brief 178_zip_redraw).
  zip: 'a zip: one big shiny zipper on a blue jacket being zipped up, the metal pull tab halfway, the teeth closed below it and open above it, a curved arrow showing it zipping up; clearly a zipper, close up',
  hop: 'a hop: a white bunny rabbit in mid-hop high in the air, a curved dotted arc under it showing the jump',
  pop: 'a pop: a red balloon bursting with a star-shaped bang, rubber bits and confetti flying out',
  hug: 'a hug: two cute teddy bears hugging each other tight, eyes closed and smiling, a little pink heart above them',
  big: 'big: a huge grey elephant standing beside a tiny mouse, so the elephant looks enormous',
  hot: 'hot: a red chilli pepper with little orange flames curling off it and a drop of sweat',
  ice: 'ice: one shiny pale-blue ice cube with frosty edges and a tiny sparkle',
  dig: 'a dig: a small red spade digging into a heap of brown dirt, a few clods flying',
  run: 'a run: a pair of bright running trainers in mid-stride, speed lines and little dust puffs behind them',
  mud: 'mud: one big brown splat of mud with drips and a few splashes flying off',
  // Item 182: Matt's pick from item 178's round (brief 178_wet_redraw).
  wet: 'wet: one dripping wet cartoon puppy standing in the rain, its fur flattened and dripping, water droplets falling off its ears and tail, a little puddle under it, looking sorry for itself; clearly soaking wet, not a splash',
  // Item 187: Matt's pick 3 from item 183's round (brief 183_fog_fade): fog drawn alone read as a cloud.
  fog: 'fog: one quiet park path disappearing into thick grey fog: the nearest lamp post and bench are sharp and bright, the trees behind them fade to pale grey shapes, and the far trees vanish completely into the fog; low, thick and everywhere on the ground, no sky and no clouds; plainly a foggy day',
  top: 'a top: a colourful striped spinning top toy spinning on its point, curved swirl marks around it',
  tug: 'a tug: two little cartoon hands pulling hard on a thick rope in a tug of war, the rope pulled tight with a knot in the middle',
  fix: 'a fix: a silver spanner and a sticking plaster crossed over each other, with sparkles',
  // Item 073 (069's M9): Matt's pick from 070's brief round, empty so it never reads as EGG.
  pan: 'a pan: one empty black frying pan with a long straight handle, seen from above at a slant so the whole round inside of the pan and the full handle both show, a shiny silver rim and a little shine on the black inside; completely empty, no food, no egg, no steam; clearly a frying pan, not a pot, a plate, a bowl or a tennis racket; the pan large',
  // Item 182: Matt's pick from item 178's round (brief 178_ram_redraw).
  ram: 'a ram: one big strong cartoon ram with huge curly brown horns curled round each side of its head, charging forward head down, dust clouds flying behind its hooves; the big curly horns and the charge are the point, not a fluffy sheep',
  // Item 037: the word bank's new words (content/phonics/bank.ts).
  jam: 'jam: a small glass jar of bright red strawberry jam with a red gingham cloth over the lid, a spoon beside it, no label',
  yak: 'a yak: a big shaggy brown yak with long hair down to its hooves and two curved horns, standing side-on',
  vat: "a vat: a huge round wooden vat with iron bands, like a giant barrel tub, full to the brim with bubbling purple liquid",
  leg: "a leg: one cartoon child's leg from the knee down, bent a little, a striped sock and a red shoe, nothing else",
  peg: 'a peg: a single wooden clothes peg with a little metal spring, lying diagonally',
  wig: 'a wig: a big fluffy curly pink party wig on its own, no head and no stand inside it',
  bib: "a bib: a baby's white bib with a pink trim and ties, a few blue polka dots, no picture or writing on it",
  fig: 'a fig: one purple fig cut in half showing its bright pink seedy inside, the other half whole beside it; a fig, not a plum',
  // Item 059: number words are decorated numerals; a die read as DICE.
  six: 'six: a big bold number 6, decorated: bright blue and covered in colourful polka dots and little stars, standing alone; the numeral alone, no dice, no dots to count, no letters',
  fin: "a fin: a grey shark's fin poking up out of blue water, little ripples round it, nothing else of the shark showing",
  kit: 'a kit: an open red toolbox with a spanner, a hammer and a screwdriver sticking out of it, no label',
  lip: 'a lip: a pair of smiling shiny red cartoon lips, nothing else of the face',
  cog: 'a cog: one shiny silver gear wheel with chunky square teeth and a hole in the middle',
  rod: 'a rod: a fishing rod with a reel, the line curving down to a little hook, no fish',
  pod: 'a pod: one green pea pod split open, a row of round green peas inside',
  gum: 'gum: a girl blowing a huge round pink bubble-gum bubble, the bubble bigger than her head',
  bun: 'a bun: one round soft golden-brown bread bun with a shiny top and a sprinkle of sesame seeds',
  hut: 'a hut: a small round hut with mud walls, a pointed straw roof and a dark doorway',
  sub: 'a sub: a yellow submarine underwater with a periscope and round portholes, little bubbles rising; a submarine, not a ship',
  nap: 'a nap: a sleepy kitten curled up asleep on a cushion, eyes closed, wearing a tiny nightcap, no Z letters',
  wag: "a wag: a happy dog's tail wagging fast, curved motion lines on each side of it, the dog's back end smiling",
  // Item 187: Matt's pick 3 from item 183's round (brief 183_jab_mitt): a glove alone read as a punch.
  jab: "a jab: one cartoon kid in a red boxing glove throwing one quick short straight jab into a padded target mitt held up by a coach's hand at the edge of the picture, a little pop of stars at the mitt, the other glove guarding the chin; quick, small and straight",
  red: 'red: one big splat of bright red paint with a few round drips, nothing else',
  // Item 182: Matt's pick from item 178's round (brief 178_hex_redraw).
  hex: "a hex: one cartoon witch's wand pointing and casting a curly purple magic spell, a glowing purple swirl of stars and sparkles shooting from its tip onto a little grumpy frog; the purple magic spell is the point",
  jig: 'a jig: a pair of happy dancing feet in shiny buckled shoes kicking up, music notes floating round them',
  mix: 'a mix: a big mixing bowl of yellow cake batter with a whisk swirling in it, a few splashes flying',
  jog: 'a jog: a smiling jogger in a red sweatband and running clothes jogging along, side-on, little dust puffs behind',
  // Item 182: Matt's pick from item 178's round (brief 178_bop_redraw).
  bop: 'a bop: one cartoon kid gently bopping a giggling friend on the head with a big soft squeaky toy hammer, little stars and a squeak line at the bop, both laughing; a playful bop, not a hit that hurts',
  // Item 167: Matt's pick 6 from item 166's round (brief 166_dot_marker); item 160's shiny blue dot (brief 157_dot_single) read as a ball (M79), the polka dots before it as 'dots' or a cloth.
  dot: 'a dot: one big round dot drawn with a fat felt-tip marker on a white card seen straight from above, the dot solid flat dark blue with slightly soft marker edges, a perfect filled circle with no shine, no highlight, no shading and no shadow; the open blue marker pen lies beside the card, its tip touching the edge of the dot; completely flat, a mark on paper, not a ball, not a button, not a planet; one dot alone, no pattern',
  hum: 'a hum: a smiling face with its mouth closed, music notes floating out beside it',
  yum: 'yum: a pink-iced cupcake with a cherry on top beside a happy face licking its lips',
  frog: 'a frog: a bright green frog sitting with big round eyes and a wide smile, front feet together',
  drum: 'a drum: a red toy drum with gold zig-zag cords round the side and two drumsticks crossed on top',
  crab: 'a crab: a red crab with two big claws raised, little eyes on stalks, side-on legs',
  flag: 'a flag: a plain bright red flag waving on a tall pole, no symbols or writing on it',
  sled: 'a sled: a red wooden sled with curved metal runners on a little patch of white snow, side-on',
  nest: "a nest: a round brown bird's nest of woven twigs with three small pale-blue eggs in it",
  tent: 'a tent: a bright orange triangular camping tent with its door flaps tied open, guy ropes pegged out',
  // Item 182: Matt's pick from item 178's round (brief 178_desk_redraw).
  desk: "a desk: a child's school desk with a chair tucked under it, a sloping wooden top with an open book, a pencil and a crayon box on it, and a small cubby under the top for books; clearly a school desk to sit and draw at, not a dinner table, not a bench",
  belt: 'a belt: a brown leather belt with a shiny gold buckle, loosely coiled',
  vest: 'a vest: a bright orange safety vest with two shiny silver stripes across it, no writing',
  plum: 'a plum: one round dark purple plum with a short stalk and one green leaf; a plum, not a fig',
  gift: 'a gift: a wrapped present in shiny blue paper with a big red ribbon bow on top; a wrapped gift, not a plain box',
  lamp: 'a lamp: a table lamp with a round base and a cream fabric shade, glowing warm yellow',
  hand: 'a hand: one open cartoon hand, palm facing the viewer, five fingers spread',
  mask: 'a mask: a sparkly purple eye mask with eye holes and pink feathers at one side, no face behind it',
  raft: 'a raft: a little raft of logs tied together with rope, a small white sail on a stick, floating on blue water',
  plug: 'a plug: a white electric plug with two metal prongs and a curly cable, no socket',
  slug: 'a slug: a cute brown slug with two eye stalks and a little smile, a shiny silver trail behind it; a slug, no shell',
  twig: 'a twig: one small thin brown twig with two little green leaves on it',
  ant: 'an ant: one cute red ant with six thin legs, two feelers and three round body parts, side-on',
  milk: 'milk: a milk carton with black-and-white cow spots, a glass of white milk beside it, no writing on the carton',
  jump: 'a jump: a brown kangaroo mid-jump high in the air, a dotted arc under it showing the jump',
  spin: 'a spin: a ballerina in a pink tutu spinning on one toe, swirl lines round her',
  swim: 'a swim: a child swimming in blue water with goggles on, arms reaching forward, splashes flying',
  flip: 'a flip: a pancake flipping high in the air above a frying pan, a curved dotted arc showing its flip',
  stomp: 'a stomp: a big purple cartoon dinosaur foot stomping down, cracks spreading in the ground and dust puffs',
  slam: 'a slam: a cartoon fist slamming down onto the ground, a round shockwave ring bursting out from it',
  grab: 'a grab: a silver claw-machine claw grabbing a brown teddy bear and lifting it, no machine round it',
  clap: 'a clap: two hands clapping together, curved motion lines and little stars between them',
  bump: 'a bump: a red bumper car and a blue bumper car bumping into each other, a little star where they meet',
  // Item 182: Matt's pick from item 178's round (brief 178_snap_redraw).
  snap: 'a snap: one cartoon hand snapping its fingers, thumb and middle finger just snapped together, a little star-shaped burst and two short sound lines at the fingertips; clearly a finger snap, close up, no animals',
  // Item 182: Matt's pick from item 178's round (brief 178_skip_redraw).
  skip: 'a skip: one happy cartoon girl skipping along a path, one knee up high and the other foot hopping, arms swinging, a dotted bouncy line behind showing her skip, no rope; clearly skipping along, not jumping rope',
  twist: 'a twist: a twisty purple tornado spinning, swirl lines round it',
  melt: 'a melt: a pink strawberry ice-cream cone melting, drips running down the cone and a little puddle',
  // Item 182: Matt's pick from item 178's round (brief 178_lift_redraw).
  lift: 'a lift: one strong cartoon kid lifting a big heavy box high over their head with both arms, knees bent, little sweat drops and wobbly effort lines; clearly lifting something heavy, no machines',
  plop: 'a plop: one blue water drop plopping into a puddle, a ring of ripples and a little splash',
  // Item 182: Matt's pick from item 178's round (brief 178_flop_redraw).
  flop: 'a flop: one cartoon kid in pyjamas flopping backwards onto a big soft fluffy bed with arms wide, pillows bouncing up, a little poof of feathers; the flop onto the bed is the point',
  trap: 'a trap: a little wire cage trap with its door snapping shut, motion lines at the door, empty inside',
  blast: 'a blast: a red-and-white rocket blasting off with big orange flames and smoke clouds under it',
  drip: 'a drip: a silver tap with one big blue water drop falling from it',
  ship: 'a ship: a wooden sailing ship with big white sails on blue waves, side-on; a ship, not a submarine',
  fish: 'a fish: a bright orange goldfish with a flowing tail swimming side-on, a few little bubbles',
  duck: 'a duck: a white farm duck with an orange beak and orange feet, swimming side-on; a grown duck, not a chick',
  sock: 'a sock: one long red-and-white striped sock, side-on',
  moth: 'a moth: a fuzzy grey-brown moth with a furry body, feathery antennae and soft dusty wings spread; a moth, not a butterfly',
  shed: 'a shed: a small wooden garden shed with a sloping roof, a door and a little window; a shed, not a hut',
  chick: 'a chick: a fluffy yellow baby chick hatching from a cracked white egg, tiny beak open',
  chop: 'a chop: an axe chopping a log in two, the halves flying apart, wood chips flying',
  kick: 'a kick: a foot in a trainer kicking a black-and-white football, motion lines behind the ball, no grass',
  // Item 187: Matt's pick 3 from item 183's round (brief 183_rush_bus): wind with leaves read as running or blowing.
  rush: 'a rush: one cartoon kid rushing towards a yellow school bus whose doors are just closing, backpack bouncing, lunchbox flying, hair streaming back, speed lines and dust clouds behind; a big hurry',
  // Item 040: familiar words for a four-year-old.
  vet: 'a vet: a smiling animal doctor in a blue tunic with a stethoscope, gently holding a little puppy with a bandaged paw',
  chest: 'a chest: a wooden pirate treasure chest with gold bands, its lid open, gold coins and a few jewels spilling out',
  bin: 'a bin: a green wheelie rubbish bin with its lid shut, side-on, a banana peel peeking out',
  // Item 073 (069's M9): Matt's pick from 070's brief round, bold and orange so it stands apart from the bridge room's grey boulders.
  rock: 'a rock: one chunky lumpy rock in warm orange-brown with flat cracked faces, darker cracks and speckles, a thick black outline all round and a bright white highlight on top, sitting on its own with a soft shadow under it, a little smaller and much bolder than a boulder; clearly one rock you could pick up with two hands, not a potato, a loaf of bread or a mountain; no grass, no pebbles, no other stones',
  clock: 'a clock: a round red alarm clock with two bells on top, a white face and black hands',
  stick: 'a stick: one long brown wooden stick from a tree, a little bent, with a small leaf on it, lying side-on',
  brush: 'a brush: a pink hairbrush with a round head of soft bristles and a long handle, side-on',
  truck: 'a truck: a big red truck with a long flat back and big black wheels, side-on',
  plant: 'a plant: a green leafy plant in a round orange flowerpot',
  crib: "a crib: a baby's white wooden crib with bars, a soft blue blanket and a little teddy inside, side-on",
  bath: 'a bath: a white bathtub full of foamy bubbles, a yellow rubber duck on top, side-on',
  // Item 043: the K and Y pictures (long-vowel words).
  key: 'a key: one big shiny gold door key with a round loop handle and simple teeth, lying side-on; a key alone, no lock, no keyring',
  yoyo: 'a yo-yo: one bright red toy yo-yo hanging from its white string, the string looped round a finger at the top, a few motion lines',
  // Item 054: the Stretchy Bridge's pictures beside MAP, LIP and LOG.
  // Item 073 (069's M9): Matt's pick from 070's brief round, jigsaw foam tiles so it never reads as RUG.
  mat: "a mat: a children's foam play mat made of six thick interlocking jigsaw-edged foam squares in bright red, blue, yellow and orange, fitted together into one flat rectangle on the floor, seen from slightly above, the jigsaw edges clearly showing and the foam visibly thick; no tassels or fringe, no stripes, no letters, numbers or pictures on it; clearly a play mat, not a rug, a carpet or a puzzle on a table",
  man: 'a man: one friendly grown-up man standing and waving, short brown hair, a blue jumper and jeans, smiling, full body; an ordinary man, not a dad from the family, not a superhero',
  lid: 'a lid: one round shiny silver saucepan lid with a black knob handle on top, tilted so the knob shows; a lid alone, no pot, no pan',
  lock: 'a lock: one big shiny gold padlock, closed, with a keyhole on its front and a curved silver shackle on top; a lock alone, no key, no door',
  // Item 056: the coverage audit's words.
  egg: "an egg: one whole white hen's egg, smooth and oval, standing upright; not cracked, not a nest",
  bell: 'a bell: one shiny gold hand bell with a wooden handle, ringing, little motion lines; a bell alone',
  doll: 'a doll: a soft rag doll girl with yarn hair and a dress, sitting; a toy, not a real child',
  // Item 187: Matt's pick 3 from item 183's round (brief 183_tap_kitchen); a hand on the handle, a running stream, so it is not DRIP's single drop.
  tap: 'a tap: one big shiny silver tap with a curved spout and a round handle, a hand turning the handle, a stream of water pouring out of the spout; only the tap, its handle and the water, no sink, no basin, no bucket, no can',
  elf: 'an elf: a cheerful little Christmas elf in green with a pointy hat with a bell and pointy ears, standing',
  // A loose tuft keyed badly (item 056: screen green caught between the blades): a solid block of turf.
  grass: 'grass: a small square block of lawn turf seen side-on, a thick slab of brown soil with a dense carpet of short dark green grass on top, no gaps between the blades; no flowers, not a plant in a pot',
  glass: 'a glass: one clear drinking glass of water, see-through, a little shine; a glass, not a cup or a mug',
  sink: 'a sink: a white kitchen sink basin with a silver tap above it, seen from the front; no dishes',
  king: 'a king: a smiling cartoon king with a gold crown, a red cape and a white fur collar, standing',
  ring: 'a ring: one gold finger ring with a big sparkly blue gem on top',
  wing: 'a wing: one big white feathery bird wing, spread open, alone; no bird, not an angel',
  shell: 'a shell: one pink and cream spiral seashell, the kind found on a beach',
  // Item 062: chips are American chips, a bag of potato chips; never fries.
  chips: 'chips: an open crinkly snack bag of thin round golden potato chips, a few wavy chips spilling out in front; American potato chips, NOT french fries, no fries carton',
  bush: 'a bush: one round leafy green garden bush, alone; not a tree, no flowers',
  thumb: 'a thumb: a cartoon hand giving a big thumbs up, the thumb clearly up',
  lamb: 'a lamb: a fluffy white baby sheep, small and woolly, standing side-on; a baby, not a big sheep',
  quest: 'a quest: a brave little explorer with a backpack setting off along a winding path to a far castle',
  quilt: 'a quilt: a colourful patchwork quilt of bright squares, folded over the end of a bed',
  // Item 182: Matt's pick from item 178's round (brief 178_queen_redraw).
  queen: 'a queen: one grown-up cartoon queen, older and grand, with grey hair in a bun, a big gold crown with jewels, a long red velvet robe with a white fluffy fur collar, holding a gold sceptre, sitting on a gold throne; clearly a queen, not a young princess',
  goat: 'a goat: a white goat with little horns and a small beard, standing side-on',
  // Item 182: Matt's pick from item 178's round (brief 178_jeep_redraw).
  jeep: 'a jeep: one open-top safari jeep with no roof and no doors, a big round spare tyre on the back, a roll bar, chunky knobbly wheels, bumping over a dirt track with a little cloud of dust, side-on; clearly a jeep, not a car, not a truck',
  sheep: 'a sheep: a big fluffy white woolly sheep with a black face, standing side-on',
  three: 'three: a big bright red number 3 made of shiny balloons, nothing else; the numeral alone, no letters',
  ten: 'ten: a big bold number 10, decorated: a bright purple 1 and an orange 0 with rainbow stripes and little sparkles, side by side; the numeral alone, no letters',
  cheese: 'cheese: one yellow wedge of cheese full of round holes',
  kite: 'a kite: a diamond-shaped red and yellow kite flying, a long tail of bows',
  bike: "a bike: a child's red bicycle with two wheels, side-on",
  vase: 'a vase: a blue china vase with a bunch of bright flowers in it',
  cake: 'a cake: a round pink birthday cake with white icing and candles lit on top',
  // Item 058: the untaught-sounds words (first sounds Z A I O U X).
  // Item 070: redrawn from the placeholders (069's M9), each so a 4-year-old names it at a glance.
  zoo: 'a zoo: a big arched zoo entrance gate with tall iron bars, and a lion, a giraffe with its long neck and an elephant with its trunk raised all peeking over the fence behind it, a few trees; clearly a place full of wild animals, not a farm, a circus or a single animal; no writing or sign text on the gate',
  zebra: 'a zebra: one cute cartoon zebra standing side-on, bold black and white stripes all over its body and legs, a short black-and-white striped mane standing up; clearly a zebra, not a horse or a donkey',
  apple: 'an apple: one big shiny bright red apple, round with the dip at the top, a short brown stem and one leaf, a little white shine on its skin; clearly an apple, not a cherry, a tomato or a ball',
  igloo: 'an igloo: a round white snow-dome house built of rows of big snow bricks with the brick lines clearly drawn, a little tunnel doorway sticking out at the front with a dark round opening, sitting on snowy ground with a little snow around its base, seen from the front a little to one side; clearly a snow house you can crawl into, not an ice cube, a block of ice, a tent or a dome cake; no people',
  octopus: 'an octopus: one cute cartoon purple octopus with a big round head, big friendly eyes, a smile and eight wavy curling arms with suckers spread out around it, seen from the front; clearly an octopus, not a squid or a jellyfish, no water around it',
  umbrella: 'an umbrella: one open bright red umbrella seen from the side a little below, its canopy wide with pointed scalloped edges and a tip on top, a long straight shaft and a curved J-shaped handle at the bottom, a few raindrops bouncing off the top; clearly an umbrella, not a tent or a mushroom',
  xray: "an x-ray: a doctor's x-ray of a hand, a black rectangular film with the white bones of a whole hand and its five fingers glowing on it, clipped to a bright lit-up light box on legs; clearly a picture of bones you see at the doctor's, not a skeleton, a glove or a hand itself; no writing",
  // Item 121: familiar things from her life (Stardew Valley's farm, dragons, Dad's bedtime stories, home and school).
  ham: 'a ham: one whole cooked glazed ham, shiny pink-and-brown with a criss-cross pattern on top and a white bone sticking out of one end, on a wooden board; cooked food, not a pig, not a leg',
  hay: 'hay: one big rectangular bale of golden yellow hay tied with two strings, a few loose straws poking out, sitting on the ground; a bale of hay, not loose grass, not a lawn',
  tree: 'a tree: one whole leafy green tree with a thick brown trunk and a round green crown, standing alone on a little patch of grass, roots just showing; a tree, not a bush, not a potted plant, not a stump',
  // Item 182: Matt's pick from item 178's round (brief 178_gate_redraw).
  gate: 'a gate: one wooden farm gate swinging half open on big black metal hinges, a metal latch on its free end, a dirt path going through the opening into a field, a short stretch of fence on each side; the open gate you walk through is the point, not the fence',
  stump: 'a stump: one short cut tree stump, flat top showing pale rings, brown bark sides and a few roots spreading into the ground, standing upright; a stump left in the ground, not a log lying down, not a whole tree',
  sack: 'a sack: one plump brown cloth sack made of rough woven burlap, tied shut at the top with a rope, sitting upright; a cloth sack, not a handbag or a paper bag, no writing on it',
  dress: "a dress: one girl's bright pink party dress with short puffy sleeves and a wide twirly skirt, on its own, no person wearing it; clearly a dress, not a shirt or a skirt alone",
  block: 'a block: one big wooden toy building block, a bright red cube with a little star painted on each side, sitting on the floor; a toy block, not a box or a present, no letters or numbers on it',
  bench: 'a bench: one long wooden park bench with a backrest and black iron legs, side-on a little from the front, nobody on it; a bench, not a desk, a table or a chair',
  skunk: 'a skunk: one cute cartoon skunk, black with a bold white stripe down its back and a big fluffy black-and-white tail raised, standing side-on; clearly a skunk, not a cat or a squirrel',
  chomp: "a chomp: a cartoon green dragon's head side-on, its big jaws snapping shut on a big crunchy apple, crumbs flying and little action lines; the biting is the point",
  // Item 182: Matt's pick from item 178's round (brief 178_dash_redraw).
  dash: 'a dash: one cheetah with spots streaking across the picture at top speed, stretched out long in mid-stride, long speed lines and dust clouds streaming out behind; the speed is the point; no people',
  // Item 182: Matt's pick from item 178's round (brief 178_swish_redraw).
  swish: "a swish: one long fluffy horse's tail swishing through the air in a big curved sweep, with curved motion lines following it and two little flies being swished away, only the back of the horse showing; the swishing tail is the point; no people, no tools",
  smash: 'a smash: a big cartoon hammer smashing down onto a pile of rocks, pieces flying out and a burst of stars at the hit',
  crash: 'a crash: a tall wobbly stack of plates crashing to the floor, plates tumbling through the air and pieces bursting out with a big burst of dust; clearly falling and crashing',
  splash: 'a splash: a cartoon kid in rain boots jumping into a big puddle, a huge splash of water spraying up all around; the splash is the point',  // Item 126: a mom and a dad as a four-year-old knows them (with their little one), and a cow.
  mom: "a mom: one friendly cartoon mom kneeling to give her little girl a big warm hug, both smiling, the mom in a red top and blue jeans with long brown hair, the girl small in a yellow dress; clearly a mommy and her child, not a teacher, a princess or two girls the same size; no green",
  dad: "a dad: one friendly cartoon dad carrying his little boy up on his shoulders, both laughing, the dad in a blue shirt and jeans with short dark hair and a short beard, the boy small in an orange shirt, holding on to his dad's head; clearly a daddy and his child, not one man alone, not a king; no green",
  cow: 'a cow: one cartoon dairy cow standing side-on, white with big black patches, a pink nose, two small horns, a swishing tail and a little bell on a collar, standing on plain ground; clearly a cow, not a goat, a dog or a horse; no grass',
  // Item 157: the Shape-Shifter's links.
  pup: 'a pup: one cute cartoon puppy sitting, small and round with big floppy ears, big paws, a waggy tail and a little red collar, tongue out happily; clearly a baby dog, chubby and much smaller than a grown dog, not a fox, not a cat; no grass',
  cub: 'a cub: one cute cartoon brown bear cub sitting, small and round with fuzzy brown fur, little round ears and a pale muzzle, waving one paw; clearly a baby bear, not a teddy bear toy (no stitching, no bow), not a dog; no grass',
  // Item 167: Matt's pick 5 from item 166's round (brief 166_cot_tent); item 160's blue cot with a pillow read as BED (M79).
  cot: 'a cot: one folding camp cot standing outdoors on a little patch of green grass, a taut green canvas sling on a light metal frame with big crossed X-shaped folding legs clearly visible, seen from the side a little from the front, with a small orange camping tent behind it at one side and a rolled-up sleeping bag lying on the cot; clearly a camping cot at a campsite, not a bed in a bedroom, not a crib, not a bench; no people',
  kid: 'a kid: one happy cartoon kid of about six, a boy in an orange t-shirt, blue shorts and sneakers, standing and waving, full body; clearly a child, not a grown-up, not a toy doll, not an elf; no green',
  // Item 178's words (ICE keeps its flavour picture above).
  frost: 'frost: one window pane covered in white feathery frost patterns, sparkly ice crystals spreading in from the corners, a cold pale-blue glow; clearly frost on glass, not snow falling, not one snowflake, not an ice cube; no people',
  pond: 'a pond: one small round blue pond seen a little from above, with two green lily pads, a pink water-lily flower and a few reeds and pebbles round its edge; clearly a little pond of still water, not a puddle, not a lake with boats, not a swimming pool; no frog, no duck, no people',
  sand: 'sand: one big soft heap of golden beach sand with a little red toy spade stuck in it and a few grains trickling down its side; clearly a pile of sand, not a sandcastle, not a hill of dirt; no sea, no people',
  fang: "a fang: the open mouth of a friendly cartoon snake, close up, two long pointed shiny white fangs at the front clearly the biggest thing in the picture, a little sparkle on each fang tip; clearly fangs, not ordinary teeth, not a smile with many teeth; no blood",
  // Item 187: Matt's pick 4 from item 183's round (brief 183_helmet_bike): 178's knight's helms read as a hat or a knight.
  helmet: "a helmet: one bright red-and-yellow kid's bicycle helmet on its own, seen from the side and a little above, its rounded shell with air vents and a little peak at the front, the black chin strap and buckle hanging down below it; plainly the hard helmet a child wears to ride a bike, not a cap or a hat",
  goblin: 'a goblin: one cheeky little cartoon goblin standing, full body, green skin, big pointy ears, a long nose, a mischievous grin, ragged brown clothes and bare feet, holding a stolen gold coin; clearly a little fairy-tale goblin, not an elf with a pointy hat, not a frog, not a monster',
  cape: "a cape: one bright red hero's cape on its own, flowing out sideways as if in a strong wind, a gold clasp at the neck; clearly a cape with nobody in it, not a dress, not a flag, not a blanket",
  cave: 'a cave: the dark arched opening of a cave in the side of a big grey rocky hill, black inside, a few rocks and a little path leading in; clearly a cave entrance, not a tunnel with rails, not a doorway in a house, not a hut; no bats, no people',
  flame: 'a flame: one big bright orange and yellow flame on its own, flickering up into a pointed tip, a little blue at its base; clearly one flame of fire, not a campfire with logs, not a candle, not the sun',
  smoke: 'smoke: a tall grey puff of smoke curling up out of a little chimney pot, round billowing grey puffs getting bigger and lighter as they rise; clearly smoke from a chimney, not a white cloud in the sky, not fog lying low',
  sword: "a sword: one shiny silver knight's sword standing point down, a long straight blade, a gold cross-guard and a wrapped brown handle with a round gold knob; clearly a sword, not a knife, not a dagger, not a stick; nobody holding it",
  shield: "a shield: one big knight's shield standing alone, rounded at the top and pointed at the bottom, blue with a gold border and a gold star in the middle; clearly a shield, not a plate, not a sign, not a badge",
  bow: 'a bow: one wooden archery bow with its string pulled straight, held upright, with one arrow with red feathers beside it; clearly a bow for shooting arrows, not a ribbon bow, not a violin bow; nobody holding it',
  dragon: 'a dragon: one friendly cartoon dragon standing, full body, purple scales, big bat-like wings spread, two little horns, a long tail with a spike on the end, a little puff of fire from its nose; clearly a dragon, not a dinosaur, not a lizard; no rider',
  crown: "a crown: one shiny golden crown on its own, five points with a red jewel on each point and a row of blue jewels round the band; clearly a king's or queen's crown, not a tiara, not a cake, not a party hat; nobody wearing it",
  castle: 'a castle: one fairy-tale castle on a little hill, grey stone walls with battlements, two round towers with pointed blue roofs and little flags, a big arched wooden door with a drawbridge; clearly a castle, not a house, not a church, not a sandcastle',
  wizard: "a wizard: one kind old cartoon wizard standing, full body, a very long white beard, a tall pointy blue hat with yellow stars and moons, a long blue robe with stars, holding a wooden staff with a glowing crystal on top, a few magic sparkles round it; clearly a wizard, not a witch, not a king, not Santa",
  // Item 184: Matt's pick 3 from item 183's round (brief 183_robot_friendly).
  robot: 'a robot: one friendly toy robot standing facing the viewer and waving one hand: a rounded white and bright orange body, a round dome head with a little antenna and a glowing light on top, a dark screen face with two big round happy eyes and a smile, chunky arms with claw hands, little wheels or chunky boots; no wind-up key, not blue, not boxy (the bedroom already shows a blue boxy wind-up robot); plainly a robot',
  // Item 188: the bedroom's other toys, each drawn unlike the bedroom's own toy (obj_<id>).
  teddy: 'a teddy bear: one soft golden-honey teddy bear sitting facing the viewer with its legs out in front, round ears, a cream muzzle and tummy, a big red bow at its neck and a little red heart patch on one foot, a happy smile; plainly a toy teddy with stitching, not a real bear, not brown, not walking, only one bear',
  rocket: 'a rocket: one toy rocket standing upright on the ground, pointed nose, a shiny silver body with purple stripes, three purple fins, one round blue porthole window, a few little yellow stars around it; no flames, no smoke, no launch pad, not red and not blue-and-cream; plainly a rocket, not a plane',
  ball: "a ball: one standard black-and-white soccer ball, the classic pattern of white hexagons and black pentagons, round and plain, resting on nothing, seen straight on with a soft shine; nothing else with it: no goal, no grass, no foot, no player, no motion lines, no stars, no colours but black and white. (Note: the bedroom already shows a rainbow striped beach ball, so this one must look different; an earlier red ball with a yellow star was turned down.)",
  unicorn: 'a unicorn: one cartoon unicorn standing side-on and prancing with one front hoof raised, a soft lilac-purple coat, a shiny golden spiral horn, a long flowing blue-and-violet mane and tail, little golden hooves, big friendly eyes; a real unicorn, not a plush toy, no rainbow, not white, no wings',
};

const HAND: Record<string, string> = {
  char_rilla_evil:
    'EvilRilla, the villain: a giant, menacing-but-silly gorilla robot, chrome and red armour plates, huge rocket fists, glowing red eyes, a bandolier of banana peels across the chest. Mischievous grin rather than frightening. Standing, facing the viewer.',
  // Item 113: Matt's pick 5 from item 110's round (brief 110_bluerilla_furry), drawn with Julia's plush attached (REFS).
  char_rilla_good:
    "Bluerilla, the good version: a big, gentle cartoon gorilla hero modelled on Julia's plush gorilla, a kind, huggable giant. Shaggy deep navy-blue fur all over, a large pale-blue face with a big friendly rounded muzzle and a happy smile, small dark kind eyes, a big round pale-blue chest and belly patch, very long navy arms with big pale-blue hands, and pale-blue feet. Round and chunky like the toy, all soft curves, NOT a robot: no armour, no metal, no glowing eyes. Standing tall, facing the viewer, one big hand waving hello and a warm grin.",
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
  // Item 046: Matt's pick 4 from item 043's round (brief 044_cyberface_wrench), one hologram tool where the full body has four.
  face_dada_matt_cyber:
    "Dada Matt's face, a friendly head-and-shoulders portrait of a tall, strong, broad-shouldered dad, fit but not bulky (not a bodybuilder): fair skin, short light-brown hair thinning on top with a high hairline, a full short reddish-brown beard, blue eyes, no glasses, a big warm smile, as a friendly, fun cyber engineer for a children's game: one big chunky glowing cyan power gauntlet on his right hand and forearm, round cyber goggles with cyan lenses, and a dark navy work jacket with glowing magenta circuit lines. The goggles are pushed up on his forehead, and he raises the gauntlet beside his face, projecting a glowing cyan hologram wrench above it. Kid-friendly and playful, not edgy. No green anywhere. NO TEXT OR NAME anywhere: it is the picture for reading the name. Head and shoulders only, facing the viewer, smiling.",
  item_mice:
    'Wind-up Mice: a round open tin box with three cute grey clockwork toy mice spilling out of it, each with a little silver wind-up key in its back, pink ears and curly tails, a few golden sparkles around them.',
};

const EMPTY_HANDED_FACES = new Set(['face_ellie', 'face_anna', 'face_rilla']);

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
