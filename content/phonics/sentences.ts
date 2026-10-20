/**
 * The sentence game's data: frames, the key words that fill them, and the
 * battle items those key words become.
 *
 * A sentence is a frame with its slots filled: `{villain} RUNS FROM THE {x}`
 * with the episode's villain and a key word. The key word is always last.
 * Sentences come from a few repeating frames so the little words (IS, THE, A,
 * OF) recur until they are sight words; progress is kept per frame. Key words
 * come from her word bag (ProgressStore `bag`, src/rules/sentences.ts), so
 * they keep changing; the counter word is drawn too, not fixed per villain.
 *
 * Voice: each frame × name fill has one "prefix" line (the sentence up to the
 * key word, trailing off: "EvilRilla is scared of...") read by the phonics
 * speaker (Matt's reading voice, replaceable by his recordings). The key word
 * is its own `word_<x>` line, so the whole sentence after an answer is the
 * prefix then the word, and no line ever contains a key word before she
 * answers. Every other token has a `word_<token>` line for the yellow hint.
 *
 * Pure data and pure functions: no Phaser, so the voice composer and the
 * unit tests read it under Node.
 */

import { CHARACTER_BY_ID, PERSONS, ROSTER, personOf } from '../battle/roster.js';
import type { AbilitySpec } from '../battle/types.js';

export interface Frame {
  id: string;
  /** Upper case. Slots: {villain} {helper} {hero} (at most one) and {x}. {x} is last. */
  text: string;
  /** Fetch frames fill the two side rooms; counter frames fill the attic (the villain's weakness). */
  use: 'fetch' | 'counter';
}

/**
 * Few frames on purpose (item 015): the small words recur until they are
 * sight words while the key words keep changing. Only words a four-year-old
 * can sound out (CAN, NOT, GET) or learn by sight (THE, IS, OF, NEEDS).
 * VILLAIN HATES THE was a fetch frame until item 015; it kept its id (and so
 * its progress and its prefix lines) when it moved to the counter.
 */
export const FRAMES: Frame[] = [
  { id: 'we_can_use_the', text: 'WE CAN USE THE {x}', use: 'fetch' },
  { id: 'helper_needs_a', text: '{helper} NEEDS A {x}', use: 'fetch' },
  { id: 'go_get_the', text: 'GO GET THE {x}', use: 'fetch' },
  { id: 'we_need_a', text: 'WE NEED A {x}', use: 'fetch' },
  { id: 'hero_needs_the', text: '{hero} NEEDS THE {x}', use: 'fetch' },
  { id: 'scared_of_the', text: '{villain} IS SCARED OF THE {x}', use: 'counter' },
  { id: 'villain_hates_the', text: '{villain} HATES THE {x}', use: 'counter' },
  { id: 'runs_from_the', text: '{villain} RUNS FROM THE {x}', use: 'counter' },
  { id: 'no_match_for_the', text: '{villain} IS NO MATCH FOR THE {x}', use: 'counter' },
];

export const FRAME_BY_ID: Record<string, Frame> = Object.fromEntries(FRAMES.map((f) => [f.id, f]));

/**
 * A key word a side room can fetch, and what it does in the battle: the hero
 * fires `ability` at the villain with a banner, and the item's picture flies
 * out of her bag first. Words are CVC with an existing `pic_<word>` picture.
 * Since item 015 every CVC word is here, so the word bag (ProgressStore) can
 * hand any of them to a side room.
 */
export interface FetchItem {
  word: string;
  /** What it does, for docs and art prompts. */
  look: string;
  ability: AbilitySpec;
}

function use(word: string, kind: AbilitySpec['kind'], color: number, extra: Partial<AbilitySpec> = {}): AbilitySpec {
  return { id: `item_${word}`, name: `The ${word}`, kind, cooldown: 0, color, power: 2, ...extra };
}

export const FETCH_ITEMS: FetchItem[] = [
  { word: 'net', look: 'a big net flung over the villain: tangled and dizzy', ability: use('net', 'bolt', 0xffffff, { glyph: '🥅', count: 3, status: 'stun', duration: 2, homing: true }) },
  { word: 'fan', look: 'a giant fan that blows a gale across the arena', ability: use('fan', 'wave', 0xbfefff, { color2: 0xffffff }) },
  { word: 'mop', look: 'a mop that sweeps in and slams down, splash', ability: use('mop', 'slam', 0x7ad9ff, { power: 3 }) },
  { word: 'jet', look: 'a toy jet that zooms through the villain', ability: use('jet', 'dash', 0xff5a3c, { power: 3 }) },
  { word: 'hen', look: 'a flock of brave hens that peck at the villain', ability: use('hen', 'summon', 0xffffff, { minion: 'hen', count: 3 }) },
  { word: 'dog', look: 'the family dog, who bounds in barking', ability: use('dog', 'summon', 0xc8884a, { minion: 'dog', count: 1 }) },
  // Not CAN: it is a frame word (WE CAN USE THE), so the prefix line would say it.
  { word: 'pot', look: 'pots and pans clanging down one after another', ability: use('pot', 'rain', 0xc0c8d0, { count: 12 }) },
  { word: 'web', look: 'a sticky web laid on the ground: a trap', ability: use('web', 'trap', 0xe8e8ff, { glyph: '🕸️', count: 3 }) },
  { word: 'box', look: 'cardboard boxes raining down on the villain', ability: use('box', 'rain', 0xc8a070, { glyph: '📦', count: 14 }) },
  { word: 'pin', look: 'a volley of pins, ouch', ability: use('pin', 'bolt', 0xff3d7a, { glyph: '📌', count: 5, homing: true }) },
  { word: 'bus', look: 'a school bus that drives straight through the villain', ability: use('bus', 'dash', 0xffc83d, { power: 3 }) },
  { word: 'sun', look: 'a burst of sunshine beamed at the villain', ability: use('sun', 'beam', 0xffd23f, { color2: 0xffffff }) },
  // Item 015: the rest of the CVC words. Most fling or drop the word's own picture.
  { word: 'cat', look: 'a pounce of cats leaping at the villain', ability: use('cat', 'bolt', 0xffb347, { ...pic('cat'), count: 3, homing: true }) },
  { word: 'fox', look: 'a quick fox that dashes straight through the villain', ability: use('fox', 'dash', 0xff7b3a, { power: 3 }) },
  { word: 'bug', look: 'a cloud of bugs raining down, tickly', ability: use('bug', 'rain', 0x6ad66a, { ...pic('bug'), count: 10 }) },
  { word: 'pig', look: 'a magic pig that turns the villain into a pig for a moment', ability: use('pig', 'bolt', 0xff9ac8, { ...pic('pig'), count: 1, status: 'pig', duration: 2, homing: true }) },
  { word: 'hat', look: 'hats raining down and plopping onto the villain', ability: use('hat', 'rain', 0x9b5de5, { ...pic('hat'), count: 8 }) },
  { word: 'bed', look: 'a big comfy bed that flops down on the villain', ability: use('bed', 'slam', 0x7aa6ff, { power: 3 }) },
  { word: 'cup', look: 'cups tumbling down, splish', ability: use('cup', 'rain', 0xc8884a, { ...pic('cup'), count: 10 }) },
  { word: 'map', look: 'maps flapping at the villain, which way is up?', ability: use('map', 'bolt', 0xe8c890, { ...pic('map'), count: 3, homing: true }) },
  { word: 'pen', look: 'a volley of pens, scribble scribble', ability: use('pen', 'bolt', 0x3a86ff, { ...pic('pen'), count: 5, homing: true }) },
  { word: 'van', look: 'a van that drives straight through the villain', ability: use('van', 'dash', 0xffffff, { power: 3 }) },
  { word: 'bat', look: 'a flutter of bats swooping at the villain', ability: use('bat', 'bolt', 0x5a2a7a, { ...pic('bat'), count: 4, homing: true }) },
  { word: 'bag', look: 'bags dropping onto the villain, plop plop', ability: use('bag', 'rain', 0xff7ad9, { ...pic('bag'), count: 8 }) },
  { word: 'can', look: 'cans clattering down on the villain', ability: use('can', 'rain', 0xc0c8d0, { ...pic('can'), count: 12 }) },
  { word: 'nut', look: 'a hail of nuts, bonk bonk', ability: use('nut', 'rain', 0xc8884a, { ...pic('nut'), count: 14 }) },
  { word: 'tub', look: 'a bathtub that slams down, splash', ability: use('tub', 'slam', 0x7ad9ff, { power: 3 }) },
  { word: 'cap', look: 'caps flung like flying saucers', ability: use('cap', 'bolt', 0xe63946, { ...pic('cap'), count: 4, homing: true }) },
  { word: 'log', look: 'logs rolling down from the sky, thump', ability: use('log', 'rain', 0x8a5a2a, { ...pic('log'), count: 6, power: 3 }) },
  { word: 'rat', look: 'brave rats scurrying at the villain', ability: use('rat', 'bolt', 0xa0a0a0, { ...pic('rat'), count: 6, homing: true }) },
  // Item 035: the -UG family.
  { word: 'mug', look: 'mugs of cocoa tumbling down, warm and sloshy', ability: use('mug', 'rain', 0x3a86ff, { ...pic('mug'), count: 8 }) },
  { word: 'rug', look: 'a magic flying rug that swoops straight through the villain', ability: use('rug', 'dash', 0xe63946, { power: 3 }) },
  { word: 'jug', look: 'a giant jug that pours a wave of milk across the arena', ability: use('jug', 'wave', 0xffffff, { color2: 0xbfefff }) },
];

/** The word's own picture as the thing flung or dropped, the right way up. */
function pic(word: string): Partial<AbilitySpec> {
  return { art: `pic_${word}`, upright: true };
}

export const FETCH_BY_WORD: Record<string, FetchItem> = Object.fromEntries(FETCH_ITEMS.map((f) => [f.word, f]));

/**
 * Pictures a four-year-old could take for each other. A room never shows a
 * look-alike of its key word as a wrong answer (a RAT beside MICE would be a
 * fair pick, then told it is wrong). Groups may overlap; a word's look-alikes
 * are every other word in any group it is in.
 */
export const LOOKALIKES: string[][] = [
  ['mice', 'rat', 'bat'],
  ['cat', 'rat', 'bat'],
  ['dog', 'fox'],
  ['hat', 'cap'],
  ['bus', 'van', 'jet'],
  ['cup', 'pot', 'can'],
  ['cup', 'mug', 'jug'],
  ['pen', 'pin'],
  ['net', 'web'],
  ['bag', 'box'],
];

/** The words whose pictures look like `word`'s (not including `word`). */
export function lookalikesOf(word: string): string[] {
  const out = new Set<string>();
  for (const g of LOOKALIKES) if (g.includes(word)) for (const w of g) if (w !== word) out.add(w);
  return [...out];
}

/** Who fills the name slots. `helper` is the ally, or the narrator with no ally; `hero` is her character. */
export interface Fill {
  villain: string;
  helper: string;
  hero: string;
}

export type NameSlot = 'villain' | 'helper' | 'hero';
const SLOTS: NameSlot[] = ['villain', 'helper', 'hero'];

/** The name slot a frame has, if any. */
export function slotOf(frame: Frame): NameSlot | null {
  return SLOTS.find((s) => frame.text.includes(`{${s}}`)) ?? null;
}

export interface Sentence {
  frame: string;
  /** Upper-case tokens, key word last. */
  tokens: string[];
  /** The key word, lower case (a `word_<key>` line and a `pic_<key>` picture). */
  key: string;
  /** The prefix line: the sentence up to the key word. */
  prefixLine: string;
}

/** The character a frame's name slot is filled with, or null for a frame with no name. */
export function frameName(frame: Frame, fill: Fill): { slot: NameSlot; id: string } | null {
  const slot = slotOf(frame);
  return slot ? { slot, id: fill[slot] } : null;
}

/** The prefix line id: `sent_<frame>` or `sent_<frame>_<character>`. */
export function prefixLineId(frameId: string, name: string | null): string {
  return name ? `sent_${frameId}_${name}` : `sent_${frameId}`;
}

/** A name as shown in a sentence: the villain's evil name, the helper's or hero's good name. */
export function nameFor(slot: NameSlot, id: string): { show: string; say: string } {
  const c = CHARACTER_BY_ID[id]!;
  const f = slot === 'villain' ? c.evil : c.good;
  return { show: f.displayName, say: f.sayName ?? f.displayName };
}

export function sentence(frameId: string, fill: Fill, key: string): Sentence {
  const frame = FRAME_BY_ID[frameId]!;
  const name = frameName(frame, fill);
  const text = frame.text
    .replace(/\{(villain|helper|hero)\}/, name ? nameFor(name.slot, name.id).show.toUpperCase() : '')
    .replace('{x}', key.toUpperCase());
  // A form reads and sounds like its person (EVIL DADA MATT for every Matt), so it shares the person's prefix line.
  return { frame: frameId, tokens: text.split(/\s+/).filter(Boolean), key, prefixLine: prefixLineId(frameId, name ? personOf(name.id) : null) };
}

/** A sentence token's own word line (`word_evilrilla`, `word_the`). */
export function tokenWord(token: string): string {
  return token.toLowerCase().replace(/[^a-z]/g, '');
}

/** Every prefix line the game can ask for: frames × every name a slot can hold. */
export function allPrefixes(): { id: string; text: string; say?: string }[] {
  const out: { id: string; text: string; say?: string }[] = [];
  for (const frame of FRAMES) {
    const words = frame.text.replace(' {x}', '').split(/\s+/);
    const slot = slotOf(frame);
    const ids = slot ? PERSONS.map((c) => c.id) : [null];
    for (const id of ids) {
      const name = slot && id ? nameFor(slot, id) : null;
      // Spoken in sentence case, trailing off where the key word will go.
      const show = words.map((w, i) => (w.startsWith('{') ? name!.show : i === 0 ? cap(w) : w.toLowerCase())).join(' ');
      const say = words.map((w, i) => (w.startsWith('{') ? name!.say : i === 0 ? cap(w) : w.toLowerCase())).join(' ');
      out.push({ id: prefixLineId(frame.id, id), text: `${show}...`, ...(say !== show ? { say: `${say}...` } : {}) });
    }
  }
  return out;
}

/** Every token any sentence can show, except key words (which have their own word lines already). */
export function allFrameTokens(): string[] {
  const set = new Set<string>();
  for (const frame of FRAMES) {
    for (const w of frame.text.split(/\s+/)) {
      if (w === '{x}') continue;
      const slot = SLOTS.find((s) => w === `{${s}}`);
      if (slot) {
        for (const c of ROSTER) for (const t of nameFor(slot, c.id).show.split(/\s+/)) set.add(tokenWord(t));
      } else set.add(tokenWord(w));
    }
  }
  return [...set].sort();
}

function cap(w: string): string {
  return w.charAt(0) + w.slice(1).toLowerCase();
}
