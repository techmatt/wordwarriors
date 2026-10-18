/**
 * Every art asset the game loads, by stable id.
 *
 * The id is the file name: `public/art/<id>.png`. Real art replaces a
 * placeholder by overwriting that file, nothing else; the game sizes every
 * image by `w`×`h` here (fitting, keeping its aspect), so the replacement does
 * not have to match the placeholder's pixel size. Transparent backgrounds for
 * everything except arenas and rooms.
 *
 * `tools/art/placeholders.ts` paints a placeholder for every entry that has no
 * file, and repaints only files it painted itself (it marks them). docs/art.md
 * is generated from this list too, as the brief for AI image prompts.
 */

import { ARENAS, MINIONS, ROSTER } from '../battle/roster.js';
import { BEDROOMS, HUB, SIDE_ROOMS } from '../house/house.js';
import { CVC_WORDS, SPECIAL_WORDS, WORD_BY_ID } from '../phonics/words.js';

export type AssetKind = 'character' | 'minion' | 'arena' | 'room' | 'picture' | 'item' | 'prop';

export interface ArtAsset {
  id: string;
  kind: AssetKind;
  /** Intended display size in design pixels (1280×720 screen). */
  w: number;
  h: number;
  /** What the picture should show: the AI art brief. */
  content: string;
  /** Placeholder painting hints. */
  label?: string;
  glyph?: string;
  palette?: [number, number];
  evil?: boolean;
  draw?: string;
  /** Arena floor colour. */
  ground?: number;
}

const assets: ArtAsset[] = [];

for (const c of ROSTER) {
  for (const evil of [false, true]) {
    const f = evil ? c.evil : c.good;
    assets.push({
      id: `char_${c.id}_${evil ? 'evil' : 'good'}`,
      kind: 'character',
      w: 200,
      h: 250,
      content: `${f.displayName}: ${f.look}. Full body, facing the viewer, cheerful cartoon style for a 4-year-old${evil ? ', villain version: darker palette, mischievous rather than frightening' : ''}. Transparent background.`,
      label: f.displayName.replace(/^Evil /, '').toUpperCase(),
      glyph: f.glyph,
      palette: f.palette,
      evil,
    });
  }
}

// Name-free cards: the pictures for character names as sight words.
for (const c of ROSTER) {
  assets.push({
    id: `face_${c.id}`,
    kind: 'character',
    w: 200,
    h: 200,
    content: `${c.good.displayName}'s face, friendly portrait, NO TEXT OR NAME anywhere: it is the picture for reading the name.`,
    label: '',
    glyph: c.good.glyph,
    palette: c.good.palette,
  });
}

for (const m of Object.values(MINIONS)) {
  assets.push({
    id: `minion_${m.id}`,
    kind: 'minion',
    w: 140,
    h: 140,
    content: `${m.name}: ${m.look}. Small summoned creature, cartoon style, transparent background.`,
    label: m.name.toUpperCase(),
    glyph: m.glyph,
    palette: m.palette,
  });
}

for (const [id, a] of Object.entries(ARENAS)) {
  assets.push({
    id: `arena_${id}`,
    kind: 'arena',
    w: 1280,
    h: 720,
    content: `Battle arena background, ${a.name}: ${a.look}. Wide side-on view, open flat ground across the lower 60% for fighters, bright and readable, no characters.`,
    label: a.name.toUpperCase(),
    glyph: a.glyph,
    palette: a.sky,
    ground: a.ground,
  });
}

const ROOMS: [string, string, string, [number, number]][] = [
  ['title', 'Title screen backdrop: a heroic sunrise over a castle and a dragon silhouette, room for a big logo in the top half', '🏰', [0x2a1a5a, 0xff9a5a]],
  ['pick', 'A hall of heroes: a wide stone floor with spotlights where character cards stand', '🎭', [0x3a2a6a, 0x8a6ac8]],
  ['stones', 'A magic garden with mossy ground where three letter stones stand', '🌿', [0x2a6a4a, 0x9ad8a0]],
  ['path', 'A riverside path of stepping stones leading to a row of doors on the right', '🚪', [0x3a5a8a, 0xa0c8ff]],
  ['gallery', 'A sunny museum gallery with pedestals and a hanging banner', '🖼️', [0x8a5a3a, 0xffd8a0]],
  ['forge', 'A cosy wizard workshop with an anvil, bubbling potions and a glowing forge', '⚒️', [0x5a2a1a, 0xff9a3a]],
  ['camp', 'A hidden campfire camp in a forest at dusk, a tent, logs to sit on', '🏕️', [0x1a2a3a, 0xff8a3a]],
  ['victory', 'A victory celebration: fireworks over a castle, confetti, a podium', '🎆', [0x3a1a6a, 0xffd23f]],
  ['parent', 'A calm plain grown-ups page background, soft paper texture', '📋', [0xf0ece0, 0xffffff]],
];
for (const [id, content, glyph, palette] of ROOMS) {
  assets.push({ id: `room_${id}`, kind: 'room', w: 1280, h: 720, content: `${content}. No text.`, label: '', glyph, palette });
}

// The house (content/house/house.ts). Every room shares one brief tail: she
// walks across the floor in the lower half, and things stand across the middle.
// The villain's mood is laid over at run time, so the rooms stay cheerful.
const HOUSE_ROOM = 'Side-on view, bright cheerful cartoon for a 4-year-old, a floor across the lower half where she walks, clear space across the middle for three objects or characters to stand, no characters, no text';
for (const b of BEDROOMS) {
  assets.push({ id: `room_bedroom_${b.id}`, kind: 'room', w: 1280, h: 720, content: `${b.look}. The bed on the left and a door on the right are drawn by the game. ${HOUSE_ROOM}.`, label: '', glyph: '⭐', palette: b.palette });
}
assets.push({ id: 'room_hub', kind: 'room', w: 1280, h: 720, content: `${HUB.look}. The doors and the magic circle are drawn by the game on top; keep the back wall plain where they stand. ${HOUSE_ROOM}.`, label: '', glyph: '🏠', palette: HUB.palette });
for (const r of SIDE_ROOMS) {
  assets.push({ id: `room_side_${r.id}`, kind: 'room', w: 1280, h: 720, content: `${r.look}. ${HOUSE_ROOM}.`, label: '', glyph: r.glyph, palette: r.palette });
}

// Bedroom toys: things she presses green next to. Art at about twice the
// display box so it stays crisp when the reaction squashes it bigger.
for (const b of BEDROOMS) {
  for (const o of b.objects) {
    assets.push({ id: `obj_${o.id}`, kind: 'prop', w: Math.round(o.w * 1.75), h: Math.round(o.h * 1.75), content: `${o.look}: a toy in a child's bedroom, chunky cartoon, side-on, transparent background.`, label: '', glyph: o.glyph });
  }
}

// What each villain leaves lying about the house (CharacterSpec.house.decals).
const decalSeen = new Set<string>();
for (const c of ROSTER) {
  for (const d of c.house?.decals ?? []) {
    if (decalSeen.has(d.id)) continue;
    decalSeen.add(d.id);
    assets.push({ id: `decal_${d.id}`, kind: 'prop', w: 120, h: 120, content: `${d.look}: left lying about the house by ${c.evil.displayName}. Small, mischievous not scary, cartoon, transparent background, no text.`, label: '', glyph: d.glyph });
  }
}

// Word pictures: every CVC word, the special words (MICE), and any counter
// sentence key word not already among them (its picture is the item's glyph).
const picWords = [...CVC_WORDS, ...SPECIAL_WORDS];
for (const c of ROSTER) {
  const key = c.counter.word;
  if (key && !picWords.some((w) => w.word === key)) picWords.push(WORD_BY_ID[key] ?? { word: key, glyph: c.counter.glyph, decodable: true });
}
for (const w of picWords) {
  assets.push({
    id: `pic_${w.word}`,
    kind: 'picture',
    w: 200,
    h: 200,
    content: `A single clear picture of a ${w.word}, centred, simple bold cartoon, instantly recognisable to a 4-year-old. NO TEXT OR LETTERS anywhere: it is the answer to a reading question.`,
    ...(w.glyph ? { glyph: w.glyph } : {}),
    ...(w.draw ? { draw: w.draw } : {}),
  });
}

for (const c of ROSTER) {
  assets.push({
    id: `item_${c.counter.id}`,
    kind: 'item',
    w: 180,
    h: 180,
    content: `${c.counter.name}: ${c.counter.look}. A magical item glowing with power, centred, transparent background.`,
    label: c.counter.name.toUpperCase(),
    glyph: c.counter.glyph,
    palette: [0xfff3c4, 0xffb703],
  });
}

const PROPS: [string, number, number, string, string, string?][] = [
  ['stone', 150, 150, 'A round mossy standing stone, flat face for a big letter painted on it by the game. No letter in the art.', ''],
  ['tile', 120, 120, 'A square stepping-stone tile seen from above, flat face for a letter painted by the game. No letter in the art.', ''],
  ['door', 170, 230, 'A colourful arched wooden door in a stone frame, closed, with a little window where a picture is shown.', '🚪'],
  ['pedestal', 190, 110, 'A marble museum pedestal seen side-on.', ''],
  ['banner', 620, 150, 'A wide hanging cloth banner, blank in the middle for a word painted by the game. No text.', ''],
  ['gem', 120, 120, 'A big glowing faceted power gem, rainbow sparkles.', '💎'],
  ['ammo', 120, 120, 'A little wooden crate overflowing with glowing star ammo.', '🌟'],
  ['pig', 110, 110, 'A cute surprised pink piglet: a hero turned into a pig by a spell.', '🐷'],
  ['ice_block', 150, 190, 'A clear blue block of ice, empty, see-through, to be drawn over a frozen fighter.', '🧊'],
  ['card_trap', 80, 80, 'A glowing playing card lying flat on the ground, a trap.', '🃏'],
  ['sun', 200, 200, 'A big happy cartoon sun.', '☀️'],
  ['anvil', 260, 170, 'A magic anvil with runes, glowing.', '⚒️'],
  ['tent', 280, 220, 'A striped camping tent with a flag.', '⛺'],
  ['bed', 300, 200, "A child's cosy bed side-on: a puffy star-pattern duvet, a big pillow, a wooden headboard on the left.", '🛏️'],
  ['front_door', 200, 290, "A big friendly front door of a house: painted red, a round brass knob, a little window at the top, a doormat. Closed. No house number or text.", '🚪'],
  ['magic_circle', 260, 110, 'A glowing rune circle painted on the floor, seen at an angle (a flat ellipse), soft blue-violet light rising from it, little stars. Abstract runes only, no letters.', '✨'],
  ['bag', 120, 130, 'A little adventure backpack for a child: rounded, bright, a buckle flap, a star patch. No text.', '🎒'],
  ['scroll', 520, 160, 'A wide unrolled magic scroll, rolled ends with wooden knobs, glowing edges, blank parchment in the middle for a word painted by the game. NO TEXT.', '📜'],
];
for (const [id, w, h, content, glyph] of PROPS) {
  assets.push({ id: `prop_${id}`, kind: 'prop', w, h, content, label: '', glyph });
}

export const ART_ASSETS: ArtAsset[] = assets;
export const ART_BY_ID: Record<string, ArtAsset> = Object.fromEntries(assets.map((a) => [a.id, a]));
export const charArt = (character: string, evil: boolean) => `char_${character}_${evil ? 'evil' : 'good'}`;
