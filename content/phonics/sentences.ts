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
 * key word, trailing off: "Rilla is scared of...") read by the phonics
 * speaker (Matt's reading voice, replaceable by his recordings). The key word
 * is its own `word_<x>` line, so the whole sentence after an answer is the
 * prefix then the word, and no line ever contains a key word before she
 * answers. Every other token has a `word_<token>` line for the yellow hint.
 *
 * Pure data and pure functions: no Phaser, so the voice composer and the
 * unit tests read it under Node.
 */

import { CHARACTER_BY_ID, PERSONS, ROSTER, personOf, villainName } from '../battle/roster.js';
import { sentenceLine } from '../voice/ids.js';
import { THINGS } from './bank.js';
import { EFFECT_BY_WORD, type WordEffect } from './effects.js';

export interface Frame {
  id: string;
  /** Upper case. Slots: {villain} {helper} {hero} (at most one) and {x}. {x} is last. */
  text: string;
  /** Fetch frames fill the two side rooms; counter frames fill the attic (the villain's weakness). */
  use: 'fetch' | 'counter';
  /** A number word (THREE) reads right as this frame's key word: GO GET THE TEN, not WE NEED A THREE or TIAMAT HIDES FROM THE THREE (item 093, M23). */
  numbers?: true;
  /** Key words that read wrong in this frame (hunt 10, M49: SMAUG RAN AWAY FROM THE ZOO reads as an escaped animal). */
  not?: readonly string[];
}

/** The bank's number words: key words only in frames marked `numbers` (item 093, M23); the warm-up and the bridge keep them. */
export const NUMBER_WORDS: ReadonlySet<string> = new Set(['six', 'ten', 'three']);

/** Bank things that take no "A" (some, not one): never the key word of a "...A {x}" frame (item 069; GUM item 092), nor the Shape-Shifter's first creature ("It starts as a...", hunt 6). */
// HAY (item 121) since hunt 10: WE NEED A HAY.
export const NO_ARTICLE: ReadonlySet<string> = new Set(['cheese', 'milk', 'jam', 'grass', 'chips', 'gum', 'hay']);

/**
 * Bank things never the key word of a fetch frame (hunt 9, M41 (b)): SCAR NEEDS A MOM reads as the
 * character lacking one, and Julia's family is two dads. The counter frames keep them (TIAMAT IS SCARED
 * OF THE DAD is a joke), and so do the games with words of their own.
 * ZOO and HAND (hunt 10, M53 (a)): ELSA NEEDS A ZOO (a place, then flying into the bag as an item) and
 * SERAPHINA NEEDS A HAND (the idiom). They stay in the counter frames and the other games.
 */
export const NOT_FETCHED: ReadonlySet<string> = new Set(['mom', 'dad', 'zoo', 'hand']);

/**
 * Bank things read as any word but never a battle item (hunt 10, M45 (b)): no copy goes to her bag
 * (the Shape-Shifter's last creature, if one, waves and stays), so none is ever fired in battle (THE MOM!
 * hurled at Evil Tiamat). Read, recorded and done for the episode all the same (`SideRoom.recordDone`).
 * Every one is in NOT_FETCHED too, so no fetch frame asks for one.
 */
export const NO_BAG_COPY: ReadonlySet<string> = new Set(['mom', 'dad']);

/**
 * Few frames on purpose (item 015): the small words recur until they are
 * sight words while the key words keep changing. Only words a four-year-old
 * can sound out (CAN, NOT, GET) or learn by sight (THE, IS, OF, NEEDS).
 * VILLAIN HATES THE was a fetch frame until item 015; it kept its id (and so
 * its progress and its prefix lines) when it moved to the counter.
 */
export const FRAMES: Frame[] = [
  { id: 'we_can_use_the', text: 'WE CAN USE THE {x}', use: 'fetch', numbers: true },
  { id: 'helper_needs_a', text: '{helper} NEEDS A {x}', use: 'fetch' },
  { id: 'go_get_the', text: 'GO GET THE {x}', use: 'fetch', numbers: true },
  { id: 'we_need_a', text: 'WE NEED A {x}', use: 'fetch' },
  { id: 'hero_needs_the', text: '{hero} NEEDS THE {x}', use: 'fetch', numbers: true },
  { id: 'scared_of_the', text: '{villain} IS SCARED OF THE {x}', use: 'counter' },
  { id: 'villain_hates_the', text: '{villain} HATES THE {x}', use: 'counter' },
  { id: 'runs_from_the', text: '{villain} RUNS FROM THE {x}', use: 'counter' },
  { id: 'no_match_for_the', text: '{villain} IS NO MATCH FOR THE {x}', use: 'counter' },
  // Item 040: more counter frames, so the attic's sentence changes more often.
  { id: 'cannot_beat_the', text: '{villain} CAN NOT BEAT THE {x}', use: 'counter' },
  { id: 'hides_from_the', text: '{villain} HIDES FROM THE {x}', use: 'counter' },
  { id: 'does_not_like_the', text: '{villain} DOES NOT LIKE THE {x}', use: 'counter' },
  { id: 'says_yuck_to_the', text: '{villain} SAYS YUCK TO THE {x}', use: 'counter' },
  // Item 121: two more, from Dad's bedtime chases.
  { id: 'ran_away_from_the', text: '{villain} RAN AWAY FROM THE {x}', use: 'counter', not: ['zoo'] },
  { id: 'cannot_get_past_the', text: '{villain} CAN NOT GET PAST THE {x}', use: 'counter' },
];

export const FRAME_BY_ID: Record<string, Frame> = Object.fromEntries(FRAMES.map((f) => [f.id, f]));

/**
 * A key word a side room can fetch, and what it does in the battle: the hero
 * fires `ability` at the villain with a banner, and the item's picture flies
 * out of her bag first. Since item 037 every pictured bank word is one, and
 * its effect lives with every other word's in content/phonics/effects.ts.
 */
export type FetchItem = WordEffect;

export const FETCH_ITEMS: FetchItem[] = THINGS.map((w) => EFFECT_BY_WORD[w.word]!).filter(Boolean);

export const FETCH_BY_WORD: Record<string, FetchItem> = Object.fromEntries(FETCH_ITEMS.map((f) => [f.word, f]));

/**
 * Pictures a four-year-old could take for each other. A room never shows a
 * look-alike of its key word as a wrong answer (a RAT beside MICE would be a
 * fair pick, then told it is wrong). Groups may overlap; a word's look-alikes
 * are every other word in any group it is in.
 */
export const LOOKALIKES: string[][] = [
  ['kit', 'box', 'bag'],
  ['jam', 'plum', 'fig'],
  ['wig', 'hat', 'cap'],
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
  // Item 037's words.
  ['box', 'gift'],
  ['ship', 'sub', 'raft'],
  ['sled', 'raft'],
  ['fin', 'fish', 'crab'],
  ['hut', 'tent', 'shed'],
  ['log', 'twig', 'rod'],
  ['fig', 'plum'],
  ['bug', 'slug', 'ant', 'moth'],
  ['moth', 'bat'],
  ['yak', 'ram'],
  ['duck', 'hen', 'chick'],
  // Item 054's words: a mat is a small rug, a lid sits on a pot or a pan, a lock takes a key.
  ['mat', 'rug'],
  ['lid', 'pot', 'pan'],
  ['lock', 'key'],
  ['pot', 'vat', 'tub'],
  // Item 056's words.
  ['glass', 'cup', 'mug', 'milk'],
  ['lamb', 'sheep', 'ram', 'goat'],
  ['king', 'man'],
  ['sink', 'tap', 'tub', 'bath'],
  ['bush', 'plant', 'grass', 'twig'],
  ['jeep', 'van', 'truck', 'bus'],
  ['vase', 'plant', 'jug'],
  ['cake', 'bun'],
  ['quilt', 'rug', 'mat', 'bed'],
  ['doll', 'elf'],
  ['egg', 'nest', 'pan'],
  // Item 058's words: an apple beside the other round fruit, an igloo beside the other little shelters.
  ['apple', 'plum', 'fig'],
  ['igloo', 'tent', 'hut'],
  ['glass', 'jug'],
  ['king', 'queen'],
  ['thumb', 'hand'],
  ['wing', 'bat', 'duck', 'hen'],
  // Item 126's: a dad beside the other grown-up men, a cow beside the other farm animals she could take it for.
  ['dad', 'man', 'king'],
  ['cow', 'goat', 'sheep', 'lamb'],
  ['jug', 'milk', 'mug', 'cup'],
  ['peg', 'pin'],
  ['lamp', 'sun'],
  ['vest', 'belt'],
  ['bun', 'nut'],
  ['jam', 'gum'],
  ['drum', 'pot'],
  // Item 040's words.
  ['bath', 'tub'],
  ['truck', 'van', 'bus'],
  ['stick', 'log'],
  ['chest', 'box', 'gift'],
  ['bin', 'can', 'pot'],
  ['rock', 'nut'],
  ['plant', 'nest'],
  ['crib', 'bed'],
  // Item 043's: a yo-yo and a spinning top are both round spinning toys.
  ['yoyo', 'top'],
  // Item 092's: LEG's picture is a leg in a striped sock and a shoe.
  ['leg', 'sock'],
  // Item 121's: a sack is a cloth bag, a stump a cut log, hay dried grass; a bee is a bug.
  ['sack', 'bag', 'kit'],
  ['stump', 'log', 'stick', 'twig'],
  ['hay', 'grass', 'bush'],
  ['tree', 'bush', 'plant', 'twig', 'stump'],
  ['bench', 'desk', 'bed'],
  ['block', 'box', 'gift', 'chest'],
  ['dress', 'vest'],
  ['skunk', 'cat', 'rat', 'fox'],
  // A ham is a cooked leg of pig.
  ['ham', 'pig', 'leg'],
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
function frameName(frame: Frame, fill: Fill): { slot: NameSlot; id: string } | null {
  const slot = slotOf(frame);
  return slot ? { slot, id: fill[slot] } : null;
}

/**
 * A name as shown in a sentence: the bare character name in every slot (item
 * 038). The villain is still drawn evil; EVIL only made a long sentence longer
 * (JORMUNGANDR RUNS FROM THE FAN, not EVIL JORMUNGANDR ...). The villain slot
 * reads `villainName` (RILLA, whose good side is BLUERILLA: item 113).
 */
function nameFor(id: string, slot: NameSlot): { show: string; say: string } {
  const c = CHARACTER_BY_ID[id]!;
  const f = slot === 'villain' ? villainName(c) : c.good;
  return { show: f.displayName, say: f.sayName ?? f.displayName };
}

export function sentence(frameId: string, fill: Fill, key: string): Sentence {
  const frame = FRAME_BY_ID[frameId]!;
  const name = frameName(frame, fill);
  const text = frame.text
    .replace(/\{(villain|helper|hero)\}/, name ? nameFor(name.id, name.slot).show.toUpperCase() : '')
    .replace('{x}', key.toUpperCase());
  // A form reads and sounds like its person (DADA MATT for every Matt), so it shares the person's prefix line.
  return { frame: frameId, tokens: text.split(/\s+/).filter(Boolean), key, prefixLine: sentenceLine(frameId, name ? personOf(name.id) : null) };
}

/** A sentence token's own word line (`word_rilla`, `word_the`). */
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
      const name = slot && id ? nameFor(id, slot) : null;
      // Spoken in sentence case, trailing off where the key word will go.
      const show = words.map((w, i) => (w.startsWith('{') ? name!.show : i === 0 ? cap(w) : w.toLowerCase())).join(' ');
      const say = words.map((w, i) => (w.startsWith('{') ? name!.say : i === 0 ? cap(w) : w.toLowerCase())).join(' ');
      out.push({ id: sentenceLine(frame.id, id), text: `${show}...`, ...(say !== show ? { say: `${say}...` } : {}) });
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
      if (SLOTS.some((s) => w === `{${s}}`)) {
        for (const c of ROSTER) for (const s of SLOTS) for (const t of nameFor(c.id, s).show.split(/\s+/)) set.add(tokenWord(t));
      } else set.add(tokenWord(w));
    }
  }
  return [...set].sort();
}

function cap(w: string): string {
  return w.charAt(0) + w.slice(1).toLowerCase();
}
