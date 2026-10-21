/**
 * A loop's seed, spread out before it goes to a test file's `seeded(n)`. Those generators
 * (Park–Miller `s * 16807 % 2147483647`, and the LCGs) give nearly the same first draw for
 * small seeds (1 to a few hundred), so `for (seed = 1..N) f(seeded(seed))` tests only a
 * handful of cases when `f` makes one or two draws (item 074). Multiplying by a large
 * prime spreads the first draw over the whole range. Fixed seeds (`seeded(1)`) stay as
 * they are: changing them would change every fixed-seed test.
 */
export const spread = (n: number): number => n * 104729;
