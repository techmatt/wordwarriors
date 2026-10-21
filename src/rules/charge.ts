/**
 * Charge the Spell (item 053; one word a visit since item 058): which word a
 * visit spells, its runes, and how much help each gets. Pure: no Phaser,
 * unit-tested (tests/unit/charge.test.ts).
 *
 * A visit is one word of CHARGE.units sound units, shown at the top; she
 * charges its runes in order, saying each letter sound aloud while Dad
 * presses 2 (yes) or 1 (no), then reads the whole word aloud for Dad. The
 * word is drawn through the bank's path (`drawWords`: shakiness × coverage ×
 * level gate) from the familiar pictured words whose every unit is a rune
 * (`CHARGE_WORDS`: no Q, X, CK, long vowel, doubled letter or repeated
 * sound), times its sounds' gate: a word whose sounds are all in open tiers
 * draws (tier 1, the continuous sounds, is always open; tier 2, quick
 * sounds, opens as tier 1 firms up and tier 3, digraphs, as tier 2 does:
 * CHARGE.tiers, BANK_DRAW.solid), leaning to shaky sounds; a word with a
 * shut tier's sound only as a last resort. The word is a battle item like
 * any room's fetched word.
 *
 * Each sound has a help level on a ramp, like the warm-up's words:
 *   1. the sound and its gesture first, she copies;
 *   2. the gesture only (its line trails off where the sound would be);
 *   3. the rune alone.
 * A yes with no assist moves it up a level; an assist (Dad's no, or nothing
 * for CHARGE.timeoutMs) moves it down one.
 */

import { BANK_BY_WORD, THINGS, type BankWord } from '../../content/phonics/bank';
import { RUNES, RUNE_BY_SOUND, type RuneTier } from '../../content/phonics/runes';
import { FETCH_BY_WORD } from '../../content/phonics/sentences';
import { BANK_DRAW, CHARGE } from '../config';
import type { ProgressStore } from '../state/ProgressStore';
import { drawWords, factor, type Rand } from './bank';

export type ChargeLevel = 1 | 2 | 3;

/** A visit's plan: the word it spells, its units (as shown), and their runes (sounds) in order. */
export interface ChargePlan {
  word: string;
  units: string[];
  runes: string[];
}

/** Every sound a rune can carry. */
export const RUNE_SOUNDS: string[] = RUNES.map((r) => r.sound);

const TIERS: RuneTier[] = [1, 2, 3];

/** A sound's help level now. */
export function chargeLevel(store: ProgressStore, sound: string): ChargeLevel {
  const l = store.chargeLevel(sound, CHARGE.startLevel);
  return (l <= 1 ? 1 : l >= 3 ? 3 : 2) as ChargeLevel;
}

/** The ramp: a yes with no assist is one level less help, an assisted rune one level more. */
export function nextChargeLevel(level: ChargeLevel, unaided: boolean): ChargeLevel {
  return Math.max(1, Math.min(3, level + (unaided ? 1 : -1))) as ChargeLevel;
}

/** The share of a tier's sounds that are solid (charged, shakiness at or under BANK_DRAW.solid). */
export function tierFirmness(store: ProgressStore, tier: RuneTier): number {
  const sounds = RUNES.filter((r) => r.tier === tier);
  const solid = sounds.filter((r) => store.stat('sounds', r.sound).seen > 0 && store.shakiness('sounds', r.sound) <= BANK_DRAW.solid);
  return solid.length / Math.max(1, sounds.length);
}

/** A tier's gate, 0..1: tier 1 always open; a tier opens as the one before it firms up. */
export function tierGate(store: ProgressStore, tier: RuneTier): number {
  if (tier === 1) return 1;
  const g = CHARGE.tiers[tier];
  const firm = tierFirmness(store, (tier - 1) as RuneTier);
  if (firm < g.start) return 0;
  return Math.min(1, g.min + ((1 - g.min) * (firm - g.start)) / Math.max(0.001, g.full - g.start));
}

/** A sound's weight in the draw: shakiness × coverage × its tier's gate. */
export function runeWeight(store: ProgressStore, sound: string, gates: Record<number, number> = gatesOf(store), seen: Record<string, number> = seenOf(store)): number {
  const r = RUNE_BY_SOUND[sound];
  if (!r) return 0;
  return store.shakiness('sounds', sound) * factor(seen, sound, RUNE_SOUNDS) * (gates[r.tier] ?? 0);
}

function gatesOf(store: ProgressStore): Record<number, number> {
  return Object.fromEntries(TIERS.map((t) => [t, tierGate(store, t)]));
}

function seenOf(store: ProgressStore): Record<string, number> {
  return Object.fromEntries(RUNE_SOUNDS.map((s) => [s, store.stat('sounds', s).seen]));
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

/** A word's gate: its least open sound's tier gate (a word with a shut tier's sound is 0). */
export function chargeWordGate(word: string, gates: Record<number, number>): number {
  const w = BANK_BY_WORD[word];
  if (!w) return 0;
  return Math.min(...w.sounds.map((s) => gates[RUNE_BY_SOUND[s]?.tier ?? 3] ?? 0));
}

export interface ChargeInput {
  /** Words the episode says or shows first, its move pads and gift, and other rooms' words: never the charge word. */
  avoid: string[];
}

/**
 * A visit's word: drawn by the bank's weight × its sounds' gate × how shaky
 * its sounds are (½ to 1½), never a word in `avoid`. A word with a shut
 * tier's sound draws only when no open one is left; with every word avoided,
 * the avoid list gives way (a visit always has a word).
 */
export function planCharge(store: ProgressStore, input: ChargeInput = { avoid: [] }, rand: Rand = Math.random): ChargePlan {
  const gates = gatesOf(store);
  const avoid = new Set(input.avoid);
  let pool = CHARGE_WORDS.filter((w) => !avoid.has(w));
  if (!pool.length) pool = [...CHARGE_WORDS];
  const open = pool.filter((w) => chargeWordGate(w, gates) > 0);
  const shaky = (w: string) => {
    const s = BANK_BY_WORD[w]!.sounds;
    return 0.5 + s.reduce((n, x) => n + store.shakiness('sounds', x), 0) / s.length;
  };
  const from = open.length ? open : pool;
  const word = drawWords(store, from, 1, rand, (w) => Math.max(0.05, chargeWordGate(w, gates)) * shaky(w))[0]!;
  const b = BANK_BY_WORD[word]!;
  return { word, units: [...b.units], runes: [...b.sounds] };
}

/** How shaky her letter sounds are, on average over the open runes: the room's lean in the minigame pool. */
export function soundShakiness(store: ProgressStore): number {
  const gates = gatesOf(store);
  const open = RUNES.filter((r) => (gates[r.tier] ?? 0) > 0);
  return open.reduce((n, r) => n + store.shakiness('sounds', r.sound), 0) / Math.max(1, open.length);
}
