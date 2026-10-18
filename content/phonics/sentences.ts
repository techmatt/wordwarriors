/**
 * The sentence game's data: frames, the key words that fill them, and the
 * battle items those key words become.
 *
 * A sentence is a frame with its slots filled: `{villain} IS SCARED OF {x}`
 * with the episode's villain and a key word. The key word is always last.
 * Sentences come from a few repeating frames so the little words (IS, THE, A,
 * OF) recur until they are sight words; progress is kept per frame.
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

import { CHARACTER_BY_ID, ROSTER } from '../battle/roster.js';
import type { AbilitySpec } from '../battle/types.js';

export interface Frame {
  id: string;
  /** Upper case. Slots: {villain} {helper} {x}. {x} is last. */
  text: string;
  /** Fetch frames fill the side rooms; counter frames belong to the villain (CounterItem.frame). */
  use: 'fetch' | 'counter';
}

export const FRAMES: Frame[] = [
  { id: 'we_can_use_the', text: 'WE CAN USE THE {x}', use: 'fetch' },
  { id: 'helper_needs_a', text: '{helper} NEEDS A {x}', use: 'fetch' },
  { id: 'go_get_the', text: 'GO GET THE {x}', use: 'fetch' },
  { id: 'villain_hates_the', text: '{villain} HATES THE {x}', use: 'fetch' },
  { id: 'we_need_a', text: 'WE NEED A {x}', use: 'fetch' },
  { id: 'scared_of', text: '{villain} IS SCARED OF {x}', use: 'counter' },
  { id: 'scared_of_the', text: '{villain} IS SCARED OF THE {x}', use: 'counter' },
];

export const FRAME_BY_ID: Record<string, Frame> = Object.fromEntries(FRAMES.map((f) => [f.id, f]));

/**
 * A key word a side room can fetch, and what it does in the battle: the hero
 * fires `ability` at the villain with a banner, and the item's picture flies
 * out of her bag first. Words are CVC with an existing `pic_<word>` picture.
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
];

export const FETCH_BY_WORD: Record<string, FetchItem> = Object.fromEntries(FETCH_ITEMS.map((f) => [f.word, f]));

/** Who fills the name slots. `helper` is the ally, or the narrator with no ally. */
export interface Fill {
  villain: string;
  helper: string;
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
export function frameName(frame: Frame, fill: Fill): { slot: 'villain' | 'helper'; id: string } | null {
  if (frame.text.includes('{villain}')) return { slot: 'villain', id: fill.villain };
  if (frame.text.includes('{helper}')) return { slot: 'helper', id: fill.helper };
  return null;
}

/** The prefix line id: `sent_<frame>` or `sent_<frame>_<character>`. */
export function prefixLineId(frameId: string, name: string | null): string {
  return name ? `sent_${frameId}_${name}` : `sent_${frameId}`;
}

/** A name as shown in a sentence: the villain's evil name, the helper's good name. */
export function nameFor(slot: 'villain' | 'helper', id: string): { show: string; say: string } {
  const c = CHARACTER_BY_ID[id]!;
  const f = slot === 'villain' ? c.evil : c.good;
  return { show: f.displayName, say: f.sayName ?? f.displayName };
}

export function sentence(frameId: string, fill: Fill, key: string): Sentence {
  const frame = FRAME_BY_ID[frameId]!;
  const name = frameName(frame, fill);
  const text = frame.text
    .replace('{villain}', name?.slot === 'villain' ? nameFor('villain', name.id).show.toUpperCase() : '')
    .replace('{helper}', name?.slot === 'helper' ? nameFor('helper', name.id).show.toUpperCase() : '')
    .replace('{x}', key.toUpperCase());
  return { frame: frameId, tokens: text.split(/\s+/).filter(Boolean), key, prefixLine: prefixLineId(frameId, name?.id ?? null) };
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
    const slot = frame.text.includes('{villain}') ? 'villain' : frame.text.includes('{helper}') ? 'helper' : null;
    const ids = slot ? ROSTER.map((c) => c.id) : [null];
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
      if (w === '{villain}' || w === '{helper}') {
        for (const c of ROSTER) for (const t of nameFor(w === '{villain}' ? 'villain' : 'helper', c.id).show.split(/\s+/)) set.add(tokenWord(t));
      } else set.add(tokenWord(w));
    }
  }
  return [...set].sort();
}

function cap(w: string): string {
  return w.charAt(0) + w.slice(1).toLowerCase();
}
