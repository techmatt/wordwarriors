/**
 * Word families for the word machine (item 026): onset + rime, CAT HAT BAT RAT.
 *
 * A family is a rime (AT) and every pictured, decodable CVC word that ends in
 * it (content/phonics/words.ts). Only rimes with at least two pictured words
 * are families: the game teaches that changing the first sound makes a new
 * word, which needs a second word to change to. Today that is -AT, -AN, -AP,
 * -EN, -ET and -OG; a new pictured word (MUG, RUG, TOP...) can open -UG or -OP
 * without any change here.
 *
 * `silly` are the onsets whose word is nonsense: the wrong tiles of mode 1
 * ("that makes ZAT, a silly word!"). Each one is checked by hand: not an
 * English word (ZAP, YAP, ZEN, YEN are out), not a name (JAN, JEN, KEN, BEN),
 * not slang a grown-up would wince at, and not a homophone of a real word (KAT
 * is CAT, NAT is GNAT, WAT is WHAT). Never J or F before AP.
 *
 * Voice: each rime is its own line (`rimeLine`, phonics speaker), said apart
 * from the onset's letter sound, never blended; each silly word is its own
 * line too (`sillyLine`). `say` is the placeholder spelling handed to edge-tts
 * (EN alone comes back as the letter name N), until Matt records them.
 *
 * Pure data: no Phaser, so the voice composer and the unit tests read it.
 */

import { CVC_WORDS } from './words.js';

export interface Family {
  /** Lower case: `at`. */
  rime: string;
  /** What edge-tts is asked to say for the rime alone. */
  say: string;
  /** The family's pictured words, lower case. */
  words: string[];
  /** Onsets that make a silly (nonsense) word with this rime. */
  silly: SillyOnset[];
}

export interface SillyOnset {
  letter: string;
  /** What edge-tts is asked to say for the whole silly word. */
  say: string;
}

/** Rime placeholders and silly onsets, by rime. A rime with pictured words but no entry here is not a family yet. */
const RIMES: Record<string, { say: string; silly: SillyOnset[] }> = {
  // Out: JAT (a people's name), GAT (slang), KAT/NAT/WAT (sound like CAT, GNAT, WHAT).
  at: { say: 'At', silly: [{ letter: 'z', say: 'Zat' }, { letter: 'y', say: 'Yat' }] },
  // Out: YAN, JAN, DAN, HAN (names), GAN (Scots "go"), KAN (sounds like CAN), WAN, NAN.
  an: { say: 'Ann', silly: [{ letter: 'z', say: 'Zan' }, { letter: 'l', say: 'Lan' }] },
  // Every other onset makes a word, a name or worse (ZAP, YAP, DAP, BAP, WAP; never J
  // or F), so -AP lays two tiles, the right one and VAP.
  ap: { say: 'App', silly: [{ letter: 'v', say: 'Vap' }] },
  // Out: ZEN, YEN, FEN, WEN (words), JEN, KEN, BEN, LEN, REN (names), SEN (a coin).
  en: { say: 'Ehn', silly: [{ letter: 'n', say: 'Nehn' }, { letter: 'v', say: 'Vehn' }] },
  // "Ett" spans 1.39 s (read as letters); a single syllable is 0.7 s. Out: FET, RET, HET.
  et: { say: 'Eht', silly: [{ letter: 'z', say: 'Zet' }, { letter: 'd', say: 'Det' }] },
  // Out: ZOG (a storybook dragon, and worse), MOG (a cat, and a storybook one), WOG
  // (a slur), NOG, POG, TOG, GOG, VOG (words or names), KOG (sounds like COG).
  og: { say: 'Ogg', silly: [{ letter: 'y', say: 'Yog' }, { letter: 's', say: 'Sog' }] },
};

export const onsetOf = (word: string): string => word.charAt(0);
export const rimeOf = (word: string): string => word.slice(1);

/** Every family the pictured words make, in rime order. */
export const FAMILIES: Family[] = Object.entries(RIMES)
  .map(([rime, r]) => ({
    rime,
    say: r.say,
    words: CVC_WORDS.filter((w) => w.decodable && w.word.length === 3 && rimeOf(w.word) === rime).map((w) => w.word),
    silly: r.silly,
  }))
  .filter((f) => f.words.length >= 2);

export const FAMILY_BY_RIME: Record<string, Family> = Object.fromEntries(FAMILIES.map((f) => [f.rime, f]));

/** Every word the machine can build. */
export const FAMILY_WORDS: string[] = FAMILIES.flatMap((f) => f.words);

/** A silly word's id and display: `zat`, shown ZAT. */
export const sillyWord = (letter: string, rime: string): string => `${letter}${rime}`;
