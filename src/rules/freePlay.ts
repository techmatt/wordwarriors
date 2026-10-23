/**
 * Free play's timing rules (item 060), Phaser-free: a held button's charge,
 * the jump's arc, the live-shot cap. `src/fx/freePlay.ts` draws them.
 */

import { FREE_PLAY, PAD_COLOR } from '../config';

export type CastColor = 'blue' | 'red' | 'yellow';

export const CAST_COLORS: CastColor[] = ['blue', 'red', 'yellow'];

/** A cast button's colours: the shot's body, the trail and burst tints. */
export interface CastPalette {
  body: number;
  trail: number[];
}

/** `a` mixed toward `b` by `t` (0..1), per channel: the hue stays put. */
export function mixColor(a: number, b: number, t: number): number {
  const ch = (shift: number) => Math.round(((a >> shift) & 0xff) * (1 - t) + ((b >> shift) & 0xff) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 * Each cast button's shots in its own pad colour (item 085, Matt: blue, red
 * and yellow must look clearly different). Every shape, an outfit's own too
 * (the chef's donuts), takes these tints: the pad colour, a lighter and a
 * deeper shade of it, never another button's colour and never plain white.
 */
export function castPalette(c: CastColor, pad: Record<CastColor, number> = PAD_COLOR): CastPalette {
  const base = pad[c];
  return { body: mixColor(base, 0xffffff, 0.15), trail: [base, mixColor(base, 0xffffff, 0.4), mixColor(base, 0x000000, 0.2)] };
}

/** A cast button let go after `heldMs`: a tap (one shot) or a charged big shot, 0..1. */
export function castPower(heldMs: number, cfg = FREE_PLAY): { charged: boolean; power: number } {
  if (heldMs < cfg.chargeMs) return { charged: false, power: 0 };
  return { charged: true, power: Math.min(1, (heldMs - cfg.chargeMs) / Math.max(1, cfg.fullChargeMs - cfg.chargeMs)) };
}

/** One jump: height above the floor (px, up is positive) and its speed. */
export interface Jump {
  h: number;
  v: number;
  /** How long green has been held on this jump (ms); the float stops at `holdMs`. */
  heldMs: number;
}

export function startJump(cfg = FREE_PLAY): Jump {
  return { h: 0.01, v: cfg.jump.speed, heldMs: 0 };
}

/** Advance a jump by `dt` seconds; null once it has landed. Holding green softens gravity. */
export function stepJump(j: Jump, dt: number, holding: boolean, cfg = FREE_PLAY): Jump | null {
  const floating = holding && j.heldMs < cfg.jump.holdMs;
  const g = cfg.jump.gravity * (floating ? cfg.jump.holdGravity : 1);
  const v = j.v - g * dt;
  const h = j.h + v * dt;
  if (h <= 0) return null;
  return { h, v, heldMs: floating ? j.heldMs + dt * 1000 : cfg.jump.holdMs };
}

/** The shots to pop so one more fits under the cap (oldest first). */
export function overCap(live: number, cap = FREE_PLAY.maxShots): number {
  return Math.max(0, live + 1 - cap);
}
