/**
 * The random-draw helpers every rule shares (item 088): the random source's
 * type, a seeded source, a shuffle and the uniform and weighted picks. No
 * imports, so any module can use them without pulling in the bank or the
 * progress store.
 */

/** A random source, 0..1 like Math.random: seeded in tests and with `?seed=`. */
export type Rand = () => number;

/** A seeded random source (mulberry32), for `?seed=` and the tests. */
export function seededRand(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A shuffled copy of `xs` (Fisher-Yates from the end, one `rand()` per step). */
export function shuffle<T>(xs: readonly T[], rand: Rand): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** One of `xs`, each equally likely (one `rand()`). */
export function pick<T>(xs: readonly T[], rand: Rand): T {
  return xs[Math.floor(rand() * xs.length)]!;
}

/**
 * Weighted pick of `n` distinct ids (one `rand()` each): an id is as likely as
 * its `weight` (at least 0.01). The word draws pass a weight that leans toward
 * shaky words. `rand` in [0,1).
 */
export function pickWeighted(ids: string[], weight: (id: string) => number, n: number, rand: () => number = Math.random): string[] {
  const pool = [...ids];
  const out: string[] = [];
  while (out.length < n && pool.length) {
    const ws = pool.map((id) => Math.max(0.01, weight(id)));
    const total = ws.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= ws[i]!;
      if (r <= 0) break;
    }
    out.push(pool.splice(i, 1)[0]!);
  }
  return out;
}
