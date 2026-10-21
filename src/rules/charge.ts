/**
 * Charge the Spell (item 053; one word a visit since item 058): which word a
 * visit spells, its runes, and how much help each gets. Pure: no Phaser,
 * unit-tested (tests/unit/charge.test.ts).
 *
 * A visit is one word of CHARGE.units sound units, shown at the top; its
 * runes charge in order, the helper saying each letter sound and she saying
 * it back (no presses, item 059), then she reads the whole word aloud for
 * Dad. The
 * word is drawn through the bank's path (`drawWords`: shakiness × coverage,
 * last episode's words leaning back) from the familiar pictured words whose
 * every unit is a rune (`CHARGE_WORDS`: CHARGE.units long, no Q, X, CK, long
 * vowel, doubled letter or repeated sound), leaning to shaky sounds. Every
 * sound is in play from the start (item 067: no sound tiers). The word is a
 * battle item like any room's fetched word.
 *
 * Each sound has a help level on a ramp (item 053: 1 the sound and gesture
 * first, 2 the gesture only, 3 the rune alone; an unhelped yes up a level, a
 * help down one). Since item 059 the room says every sound for her and
 * judges only the word, so the ramp is kept (and its saved levels) but
 * unused by the room; DIFFICULTY caps it like every ramp (item 067).
 */

import { BANK_BY_WORD, THINGS, type BankWord } from '../../content/phonics/bank';
import { RUNES, RUNE_BY_SOUND } from '../../content/phonics/runes';
import { FETCH_BY_WORD } from '../../content/phonics/sentences';
import { CHARGE } from '../config';
import type { ProgressStore } from '../state/ProgressStore';
import { drawWords, type Rand } from './bank';
import { helpLevel } from './difficulty';

export type ChargeLevel = 1 | 2 | 3;

/** A visit's plan: the word it spells, its units (as shown), and their runes (sounds) in order. */
export interface ChargePlan {
  word: string;
  units: string[];
  runes: string[];
}

/** Every sound a rune can carry. */
export const RUNE_SOUNDS: string[] = RUNES.map((r) => r.sound);

/** The help level a sound's ramp has reached (recorded for the grown-ups page). */
export function recordedChargeLevel(store: ProgressStore, sound: string): ChargeLevel {
  const l = store.chargeLevel(sound, CHARGE.startLevel);
  return (l <= 1 ? 1 : l >= 3 ? 3 : 2) as ChargeLevel;
}

/** A sound's help level now: CHARGE.startLevel at base, else its recorded level up to DIFFICULTY (item 067). */
export function chargeLevel(store: ProgressStore, sound: string): ChargeLevel {
  return helpLevel(recordedChargeLevel(store, sound), CHARGE.startLevel);
}

/** The ramp: a yes with no assist is one level less help, an assisted rune one level more. */
export function nextChargeLevel(level: ChargeLevel, unaided: boolean): ChargeLevel {
  return Math.max(1, Math.min(3, level + (unaided ? 1 : -1))) as ChargeLevel;
}

/**
 * A word the room can spell: a familiar pictured thing (with a battle item)
 * of CHARGE.units sound units, each unit a rune shown as itself (no doubled
 * BELL, no THUMB's MB) and no sound twice (each rune charges once).
 */
function chargeable(w: BankWord): boolean {
  const [lo, hi] = CHARGE.units;
  return (
    w.units.length >= lo &&
    w.units.length <= hi &&
    Boolean(FETCH_BY_WORD[w.word]) &&
    w.units.every((u, i) => u === w.sounds[i] && Boolean(RUNE_BY_SOUND[u])) &&
    new Set(w.sounds).size === w.sounds.length
  );
}

/** Every word Charge the Spell can spell. */
export const CHARGE_WORDS: string[] = THINGS.filter(chargeable).map((w) => w.word);

export interface ChargeInput {
  /** Words the episode says or shows first, its move pads and gift, and other rooms' words: never the charge word. */
  avoid: string[];
}

/**
 * A visit's word: drawn by the bank's weight × how shaky its sounds are (½
 * to 1½), never a word in `avoid`; with every word avoided, the avoid list
 * gives way (a visit always has a word).
 */
export function planCharge(store: ProgressStore, input: ChargeInput = { avoid: [] }, rand: Rand = Math.random): ChargePlan {
  const avoid = new Set(input.avoid);
  let pool = CHARGE_WORDS.filter((w) => !avoid.has(w));
  if (!pool.length) pool = [...CHARGE_WORDS];
  const shaky = (w: string) => {
    const s = BANK_BY_WORD[w]!.sounds;
    return 0.5 + s.reduce((n, x) => n + store.shakiness('sounds', x), 0) / s.length;
  };
  const word = drawWords(store, pool, 1, rand, shaky)[0]!;
  const b = BANK_BY_WORD[word]!;
  return { word, units: [...b.units], runes: [...b.sounds] };
}

/** How shaky her letter sounds are, on average over every rune: the room's lean in the minigame pool. */
export function soundShakiness(store: ProgressStore): number {
  return RUNES.reduce((n, r) => n + store.shakiness('sounds', r.sound), 0) / Math.max(1, RUNES.length);
}
