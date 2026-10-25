/**
 * A timer on the wall clock, for waits on real work: the network (a fetch
 * that never answers) and a line's decode (VoiceBus's ENSURE_TIMEOUT_MS). The browser tests run every page clock fast (`tests/harness.ts`
 * `warpClocks`, 5x by default), which made VoiceBank's 15 s fetch timeout 3 s
 * of real time: on a loaded machine voice fetches aborted and lines played
 * with no audio (item 069). The harness keeps the real `setTimeout` as
 * `__wwRealSetTimeout`; in the game itself this is plain `setTimeout`.
 */
export function realTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
  const real = (globalThis as unknown as { __wwRealSetTimeout?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout> }).__wwRealSetTimeout;
  return real ? real(fn, ms) : setTimeout(fn, ms);
}

/** The wall clock in ms (the harness keeps the real `performance.now` as `__wwRealNow`): how long real work took (item 150). */
export function realNow(): number {
  const real = (globalThis as unknown as { __wwRealNow?: () => number }).__wwRealNow;
  return real ? real() : performance.now();
}
