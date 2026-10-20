/**
 * Charge the Spell (item 053): which runes a visit lights, and how much help
 * each gets. Pure: no Phaser, unit-tested (tests/unit/charge.test.ts).
 *
 * She says a rune's letter sound aloud; Dad presses 2 (yes) or 1 (no). The
 * draw is the word bank's path for sounds: each sound weighs its shakiness
 * (ProgressStore `sounds`) × its coverage (the sounds she has charged least
 * come up, the bank's `factor`) × its tier's gate. Tier 1, the continuous
 * sounds, is always open; tier 2 (quick sounds) opens as tier 1 firms up and
 * tier 3 (digraphs) as tier 2 does (CHARGE.tiers, BANK_DRAW.solid), a shut
 * tier only as a last resort. A round has one rune of each look-alike set
 * (B D P) and one of each same-sound set (C K), and plays continuous sounds
 * first.
 *
 * Each sound has a help level on a ramp, like the warm-up's words:
 *   1. the sound and its gesture first, she copies;
 *   2. the gesture only (its line trails off where the sound would be);
 *   3. the rune alone.
 * A yes with no assist moves it up a level; an assist (Dad's no, or nothing
 * for CHARGE.timeoutMs) moves it down one.
 */

import { LOOKALIKE_RUNES, RUNES, RUNE_BY_SOUND, SAME_SOUND, type RuneTier } from '../../content/phonics/runes';
import { BANK_DRAW, CHARGE } from '../config';
import { pickWeighted, type ProgressStore } from '../state/ProgressStore';
import { factor, type Rand } from './bank';

export type ChargeLevel = 1 | 2 | 3;

/** A visit's plan: the runes, in the order they light (continuous sounds first). */
export interface ChargePlan {
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

/** The sounds a round cannot have beside `sound`: its look-alikes and its same-sound partners. */
function clashes(sound: string): string[] {
  return [...LOOKALIKE_RUNES, ...SAME_SOUND].filter((set) => set.includes(sound)).flat();
}

/**
 * A visit's runes: `n` sounds, weighted as above, none clashing, continuous
 * sounds first (then in the order drawn). A shut tier's sound comes up only
 * when the open ones run out.
 */
export function planCharge(store: ProgressStore, rand: Rand = Math.random, n = CHARGE.runes): ChargePlan {
  const gates = gatesOf(store);
  const seen = seenOf(store);
  const weight = (s: string) => runeWeight(store, s, gates, seen);
  let pool = [...RUNE_SOUNDS];
  const out: string[] = [];
  while (out.length < n && pool.length) {
    const open = pool.filter((s) => (gates[RUNE_BY_SOUND[s]!.tier] ?? 0) > 0);
    const pick = pickWeighted(open.length ? open : pool, weight, 1, rand)[0]!;
    out.push(pick);
    const gone = new Set([pick, ...clashes(pick)]);
    pool = pool.filter((s) => !gone.has(s));
  }
  const tier = (s: string) => RUNE_BY_SOUND[s]!.tier;
  return { runes: out.map((s, i) => ({ s, i })).sort((a, b) => tier(a.s) - tier(b.s) || a.i - b.i).map((x) => x.s) };
}

/** How shaky her letter sounds are, on average over the open runes: the room's lean in the minigame pool. */
export function soundShakiness(store: ProgressStore): number {
  const gates = gatesOf(store);
  const open = RUNES.filter((r) => (gates[r.tier] ?? 0) > 0);
  return open.reduce((n, r) => n + store.shakiness('sounds', r.sound), 0) / Math.max(1, open.length);
}
