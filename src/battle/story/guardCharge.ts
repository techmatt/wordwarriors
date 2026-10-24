/**
 * The gold guards' charge (hunt 11, M74), Phaser-free: when each guard
 * reaches a hero, so the hero's hop over them is timed to what is seen, not
 * fired as the charge starts from far off. Not Charge the Spell
 * (`src/rules/charge.ts`).
 */

/** One guard's run along the floor: from `from` to `to` (x), `ms` long after `delay`, eased Quad.easeIn. */
export interface GuardCharge {
  from: number;
  to: number;
  delay: number;
  ms: number;
}

/** When (ms after the charge is set off) a charge eased Quad.easeIn reaches `x`; null if it never passes it. */
export function chargeArrival(c: GuardCharge, x: number): number | null {
  const run = c.from - c.to;
  if (run === 0) return null;
  const p = (c.from - x) / run;
  if (p < 0 || p > 1) return null;
  // Quad.easeIn: progress = t², so t = √progress.
  return c.delay + c.ms * Math.sqrt(p);
}

/** The shortest hop (ms), and how long she is already up before the first guard and still up after the last. */
export const HOP_MS = 700;
const HOP_LEAD = 150;

/**
 * The hop of a hero standing at `x` over every guard that passes there: its
 * start (ms after the charge is set off) and length, its peak midway between
 * the first guard's arrival and the last's. Null when no guard passes her.
 */
export function hopOverCharge(charges: readonly GuardCharge[], x: number): { delay: number; ms: number } | null {
  const at = charges.map((c) => chargeArrival(c, x)).filter((t): t is number => t !== null);
  if (!at.length) return null;
  const first = Math.min(...at);
  const last = Math.max(...at);
  const ms = Math.max(HOP_MS, last - first + 2 * HOP_LEAD);
  return { delay: Math.max(0, (first + last) / 2 - ms / 2), ms };
}
