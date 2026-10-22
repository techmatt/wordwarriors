/**
 * The reading words: the bank's pictured words (content/phonics/bank.ts), plus the
 * roster's names as sight words.
 *
 * `glyph` is what the placeholder picture card draws (an emoji, rendered by
 * Chromium's system font) until real art lands under the same asset id,
 * `pic_<word>`. `draw` names a hand-drawn fallback for words Windows 10's emoji
 * font does not have. A picture card never shows the word itself: the word is
 * the thing she must read, so the picture must not give it away.
 *
 * `decodable` is false for sight words. Blend Path only uses decodable words,
 * because it sounds out every letter as she steps on it and a name like
 * "Jasmine" does not blend.
 */

import { BANK, THINGS, type BankWord, type DrawId } from './bank.js';

export interface Word {
  word: string;
  glyph?: string;
  /** A canvas drawing in tools/art/placeholders.ts, when there is no emoji. */
  draw?: DrawId;
  decodable: boolean;
  /** For sight words: the character whose card is the picture. */
  character?: string;
}

/**
 * The pictured reading words: every bank word with a clear picture
 * (content/phonics/bank.ts, role `thing` or `both`). Before item 037 these
 * were 33 hand-listed CVC words; since then they come from the bank and run
 * to blends (FROG) and digraphs (SHIP), and the name went from CVC_WORDS to
 * PICTURE_WORDS (item 088).
 */
export const PICTURE_WORDS: Word[] = THINGS.map(asWord);

function asWord(w: BankWord): Word {
  return { word: w.word, decodable: true, ...(w.glyph ? { glyph: w.glyph } : {}), ...(w.draw ? { draw: w.draw } : {}) };
}

/** Character names as sight words. The picture is the character's own card. */
export const SIGHT_WORDS: Word[] = [
  { word: 'julia', decodable: false, character: 'julia' },
  { word: 'ellie', decodable: false, character: 'ellie' },
  { word: 'seraphina', decodable: false, character: 'seraphina' },
  { word: 'elsa', decodable: false, character: 'elsa' },
  { word: 'anna', decodable: false, character: 'anna' },
  { word: 'jasmine', decodable: false, character: 'jasmine' },
  { word: 'smaug', decodable: false, character: 'smaug' },
  { word: 'tiamat', decodable: false, character: 'tiamat' },
  { word: 'scar', decodable: false, character: 'scar' },
  { word: 'moriarty', decodable: false, character: 'moriarty' },
  { word: 'bavmorda', decodable: false, character: 'bavmorda' },
];

/**
 * Sentence key words that are not CVC: special cases kept because they are
 * the right word for the story (Matt's MICE). Not decodable, so the hint
 * sounds only the first letter, as for a name.
 */
export const SPECIAL_WORDS: Word[] = [{ word: 'mice', glyph: '🐭', decodable: false }];

export const WORDS: Word[] = [...PICTURE_WORDS, ...SIGHT_WORDS, ...SPECIAL_WORDS];

/**
 * The bank's other words: its actions (the battle's move pads and the
 * ally's gift word, item 037) and its `odd` things (item 040). Each has a picture (the
 * victory recap and the fan on its super). Not in WORDS: they are never key
 * words or room objects. A familiar `both` word (NET, PAN) is in PICTURE_WORDS instead.
 */
export const MOVE_PICTURES: Word[] = BANK.filter((w) => !THINGS.includes(w)).map(asWord);

/**
 * Pictures kept for roster flavour words that left the reading pool in item
 * 037: POW and ICE are not one-short-vowel words, so she no longer reads them,
 * but abilities still carry them as their own name.
 */
export const FLAVOUR_PICTURES: Word[] = [
  { word: 'pow', glyph: '🥊', decodable: false },
  { word: 'ice', glyph: '🧊', decodable: false },
];

export const WORD_BY_ID: Record<string, Word> = Object.fromEntries(WORDS.map((w) => [w.word, w]));

/**
 * The picture asset id for a word: its own card, or the character's. `face`
 * picks a character's card: the game passes `castFace`, so in a chef episode
 * JULIA shows chef Julia's face (content/battle/forms.ts).
 */
export function pictureFor(word: Word, face: (character: string) => string = (c) => `face_${c}`): string {
  // A character's picture is its name-free face card: the normal card prints
  // the name, which would turn reading the name into matching letters.
  return word.character ? face(word.character) : `pic_${word.word}`;
}

/** Capitalised, for names: "Seraphina!" rather than "seraphina!". */
export function spokenWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
