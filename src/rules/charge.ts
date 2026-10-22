/**
 * Charge the Spell (item 053; one word a visit since item 058): which word a
 * visit spells and its runes. Pure: no Phaser,
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
 * The room says every sound for her and judges only the word (item 059), so
 * it has no help ramp: item 053's per-sound levels went in item 078.
 */

import { BANK, BANK_BY_WORD, THINGS, type BankWord } from '../../content/phonics/bank';
import { RUNES, RUNE_BY_SOUND } from '../../content/phonics/runes';
import { FETCH_BY_WORD } from '../../content/phonics/sentences';
import { CHARGE } from '../config';
import type { ProgressStore } from '../state/ProgressStore';
import { drawWords, withStems } from './bank';
import type { Rand } from './random';

/** A visit's plan: the word it spells, its units (as shown), and their runes (sounds) in order. */
export interface ChargePlan {
  word: string;
  units: string[];
  runes: string[];
}

/** Every sound a rune can carry. */
export const RUNE_SOUNDS: string[] = RUNES.map((r) => r.sound);

/**
 * Glyphs close to a bank word's picture, which show that word as surely as its own (hunt 6: the M rune's
 * cake slice is CAKE's birthday cake to her, the E rune's hatching chick CHICK's chick; runes.ts's header
 * names the chick as what a glyph must not be).
 */
const GLYPH_LOOKS_LIKE: Record<string, string[]> = { m: ['cake'], e: ['chick'] };

/** Each rune's gesture's bank words: what its line says (stemmed), a word whose picture is its glyph or close to it, and its picture letter's word (item 097: VASE for V). */
const RUNE_WORDS: Record<string, string[]> = Object.fromEntries(
  RUNES.map((r) => [
    r.sound,
    [
      ...new Set([
        ...withStems(r.gesture.text.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean)).filter((w) => BANK_BY_WORD[w]),
        ...BANK.filter((w) => w.glyph && w.glyph === r.gesture.glyph).map((w) => w.word),
        ...(GLYPH_LOOKS_LIKE[r.sound] ?? []).filter((w) => BANK_BY_WORD[w]),
        ...(r.picture && BANK_BY_WORD[r.picture.word] ? [r.picture.word] : []),
      ]),
    ],
  ]),
);

/**
 * The bank words these runes' gestures say or show: the /e/ rune's "Tap the
 * egg" says TAP and EGG (item 071). Since item 074 they count as said only in
 * an episode whose Charge word has that rune, and only from when it plays:
 * the Charge word is never one whose gestures say a word she reads later
 * (`later` in `planCharge`), and `episodePlans` keeps the keys drawn after it
 * clear of them. Elsewhere TAP and EGG are words like any other. A rune's
 * picture letter's word counts the same way (item 097: VASE for V).
 */
export function gestureWords(sounds: Iterable<string>): string[] {
  return [...new Set([...sounds].flatMap((s) => RUNE_WORDS[s] ?? []))];
}

/** Every rune's gesture words (the runes test's allowance). */
export const GESTURE_WORDS: string[] = gestureWords(RUNE_SOUNDS);

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
  /** Words she reads after the room (the gift and move pads, other rooms' words, the attic's): no gesture of the word's runes says one (item 074). */
  later?: string[];
}

/**
 * A visit's word: drawn by the bank's weight × how shaky its sounds are (½
 * to 1½), never a word in `avoid`, nor one whose runes' gestures say itself
 * or a word in `later` (the /e/ rune's "Tap the egg" would read EGG for her);
 * with every word avoided, the avoid list gives way, then the gestures' rule
 * (a visit always has a word).
 */
export function planCharge(store: ProgressStore, input: ChargeInput = { avoid: [] }, rand: Rand = Math.random): ChargePlan {
  const avoid = new Set(input.avoid);
  const later = new Set(input.later ?? []);
  const quiet = CHARGE_WORDS.filter((w) => !gestureWords(BANK_BY_WORD[w]!.sounds).some((g) => g === w || later.has(g)));
  let pool = quiet.filter((w) => !avoid.has(w));
  if (!pool.length) pool = quiet.length ? quiet : [...CHARGE_WORDS];
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
