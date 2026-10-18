/**
 * The reading words: short CVC words with an unmistakable picture, plus the
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

export interface Word {
  word: string;
  glyph?: string;
  /** A canvas drawing in tools/art/placeholders.ts, when there is no emoji. */
  draw?: 'fan' | 'log' | 'mop' | 'pot';
  decodable: boolean;
  /** For sight words: the character whose card is the picture. */
  character?: string;
}

export const CVC_WORDS: Word[] = [
  { word: 'cat', glyph: '🐱', decodable: true },
  { word: 'dog', glyph: '🐶', decodable: true },
  { word: 'sun', glyph: '☀️', decodable: true },
  { word: 'fox', glyph: '🦊', decodable: true },
  { word: 'bug', glyph: '🐛', decodable: true },
  { word: 'pig', glyph: '🐷', decodable: true },
  { word: 'hat', glyph: '🎩', decodable: true },
  { word: 'bed', glyph: '🛏️', decodable: true },
  { word: 'cup', glyph: '☕', decodable: true },
  { word: 'map', glyph: '🗺️', decodable: true },
  { word: 'fan', draw: 'fan', decodable: true },
  { word: 'web', glyph: '🕸️', decodable: true },
  { word: 'bus', glyph: '🚌', decodable: true },
  { word: 'hen', glyph: '🐔', decodable: true },
  { word: 'box', glyph: '📦', decodable: true },
  { word: 'net', glyph: '🥅', decodable: true },
  { word: 'pen', glyph: '🖊️', decodable: true },
  { word: 'van', glyph: '🚐', decodable: true },
  { word: 'bat', glyph: '🦇', decodable: true },
  { word: 'bag', glyph: '👜', decodable: true },
  { word: 'can', glyph: '🥫', decodable: true },
  { word: 'nut', glyph: '🥜', decodable: true },
  { word: 'tub', glyph: '🛁', decodable: true },
  { word: 'cap', glyph: '🧢', decodable: true },
  { word: 'pin', glyph: '📌', decodable: true },
  { word: 'jet', glyph: '✈️', decodable: true },
  { word: 'log', draw: 'log', decodable: true },
  { word: 'mop', draw: 'mop', decodable: true },
  { word: 'pot', draw: 'pot', decodable: true },
  { word: 'rat', glyph: '🐀', decodable: true },
];

/** Character names as sight words. The picture is the character's own card. */
export const SIGHT_WORDS: Word[] = [
  { word: 'julia', decodable: false, character: 'julia' },
  { word: 'seraphina', decodable: false, character: 'seraphina' },
  { word: 'elsa', decodable: false, character: 'elsa' },
  { word: 'anna', decodable: false, character: 'anna' },
  { word: 'jasmine', decodable: false, character: 'jasmine' },
  { word: 'smaug', decodable: false, character: 'smaug' },
  { word: 'scar', decodable: false, character: 'scar' },
  { word: 'moriarty', decodable: false, character: 'moriarty' },
  { word: 'bavmorda', decodable: false, character: 'bavmorda' },
];

export const WORDS: Word[] = [...CVC_WORDS, ...SIGHT_WORDS];

export const WORD_BY_ID: Record<string, Word> = Object.fromEntries(WORDS.map((w) => [w.word, w]));

/** The picture asset id for a word: its own card, or the character's. */
export function pictureFor(word: Word): string {
  // A character's picture is its name-free face card: the normal card prints
  // the name, which would turn reading the name into matching letters.
  return word.character ? `face_${word.character}` : `pic_${word.word}`;
}

/** Capitalised, for names: "Seraphina!" rather than "seraphina!". */
export function spokenWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
