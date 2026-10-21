/**
 * Variety across episodes (item 067). Pure: no Phaser, unit-tested
 * (tests/unit/variety.test.ts).
 *
 * Each rotation (the villain, the ally, a dad's form, the side rooms, the games,
 * the story and line variants, the victory scene) keeps its recent picks in the
 * progress store (`recentOf` / `remember`, VARIETY in src/config.ts) and
 * draws through `fresh` or `leastRecent`, so she rarely sees a repeat soon.
 */

import type { Rand } from './bank';

/**
 * `pool` without its recent picks, newest first, while at least `leave` are
 * left to choose from (and always without the newest, while another is left):
 * a short pool never turns into a fixed rotation. `recent` is newest last;
 * picks not in the pool are ignored. With nothing recent it is `pool` itself,
 * so a draw from it consumes the random source exactly as before.
 */
export function fresh<T>(pool: readonly T[], recent: readonly T[], leave = 2): T[] {
  const rec = recent.filter((r) => pool.includes(r));
  if (!rec.length) return [...pool];
  const n = Math.min(rec.length, Math.max(1, pool.length - leave));
  const avoid = rec.slice(rec.length - n);
  const out = pool.filter((p) => !avoid.includes(p));
  return out.length ? out : [...pool];
}

/**
 * `n` of `pool`, the least recently used first (never used before any used;
 * ties in a random order): the house's side rooms, so the room left out last
 * episode comes back this one.
 */
export function leastRecent<T>(pool: readonly T[], recent: readonly T[], n: number, rand: Rand): T[] {
  const order = pool.map((p) => ({ p, at: recent.lastIndexOf(p), r: rand() }));
  return order.sort((a, b) => a.at - b.at || a.r - b.r).slice(0, n).map((x) => x.p);
}
