/**
 * A word sounded out (item 085): one step per sound unit, never per letter.
 * KING is K, I, NG; SHIP is SH, I, P; BELL is B, E, LL (LL saying L once);
 * SHEEP is SH, long E (on EE), P. A multi-letter unit is one sound and one
 * line, its letters lit together: it is never said as its letters ("N, G")
 * and never as its letters and then its sound. Pure, so every place that
 * sounds a word out (the entry hall's clue, the sentence room's key-word
 * hint, the bridge's wrong pick, Charge the Spell, the Shape-Shifter's wrong
 * picture) says the same thing, and
 * tests/unit/soundOut.test.ts checks it over the whole word bank.
 */

import { BANK_BY_WORD, soundOf, unitsOf } from '../../content/phonics/bank';
import { NAME_HIDES, SOUND_BY_UNIT } from '../../content/phonics/letters';
import { letterSoundLine, nameHidesLine } from '../../content/voice/ids';

export interface SoundStep {
  /** The unit's letters (`ng`, `ee`, `ll`, `k`). */
  unit: string;
  /** Its sound key (SOUND_BY_UNIT): `ng`, `long_e`, `l`; `` for a silent letter (KITE's E). */
  sound: string;
  /** Where its letters start in the word, and how many there are (lit together). */
  index: number;
  span: number;
  /** The line to say: `letter_<sound>_sound`, or `` for a silent letter, which only lights. */
  id: string;
}

/** The word's sound units with their sounds and lines: the bank's spelling, else `unitsOf`. */
export function soundOut(word: string): SoundStep[] {
  const b = BANK_BY_WORD[word];
  const units = b?.units ?? unitsOf(word);
  const out: SoundStep[] = [];
  let index = 0;
  units.forEach((unit, i) => {
    const sound = b?.sounds[i] ?? soundOf(unit);
    out.push({ unit, sound, index, span: unit.length, id: SOUND_BY_UNIT[sound] ? letterSoundLine(sound) : '' });
    index += unit.length;
  });
  return out;
}

/**
 * A letter's sound as a hint or teaching line gives it (item 096): where the
 * letter's name holds its sound (NAME_HIDES: B D F J K L M N P R S T V Z),
 * the bridge from the name first ("M's name is Em... squeeze off the front:"),
 * then the sound; any other letter (C G H W Y X, the vowels) or a
 * multi-letter unit, the plain sound. `letter` is the unit as written, `sound`
 * its sound key: a letter not saying its own sound gets no bridge.
 */
export function nameToSound(letter: string, sound: string = letter): string[] {
  const plain = SOUND_BY_UNIT[sound] ? [letterSoundLine(sound)] : [];
  return nameHolds(letter, sound) ? [nameHidesLine(letter), ...plain] : plain;
}

/** Whether `letter`'s name holds the sound it says here (`sound`, its own by default): the name can bridge to it. */
export function nameHolds(letter: string, sound: string = letter): boolean {
  return Boolean(NAME_HIDES[letter]) && letter === sound;
}
