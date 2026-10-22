import type { StorageLike } from '../../src/state/ProgressStore';

/**
 * A loop's seed, spread out before it goes to a test file's `seeded(n)`. Those generators
 * (Park–Miller `s * 16807 % 2147483647`, and the LCGs) give nearly the same first draw for
 * small seeds (1 to a few hundred), so `for (seed = 1..N) f(seeded(seed))` tests only a
 * handful of cases when `f` makes one or two draws (item 074). Multiplying by a large
 * prime spreads the first draw over the whole range. Fixed seeds (`seeded(1)`) stay as
 * they are: changing them would change every fixed-seed test.
 */
export const spread = (n: number): number => n * 104729;

/** Deterministic Park–Miller rand for repeatable draws. */
export function seeded(seed = 1): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** The LCG some files have always used (bank, machine, wordrules); kept so their fixed seeds draw as before. */
export function seededLcg(seed = 1): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** An in-memory store backing; `data` is the map behind it. */
export function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}
