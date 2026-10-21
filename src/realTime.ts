/**
 * A timer on the wall clock, for waits on the network (a fetch that never
 * answers). The browser tests run every page clock fast (`tests/harness.ts`
 * `warpClocks`, 5x by default), which made VoiceBank's 15 s fetch timeout 3 s
 * of real time: on a loaded machine voice fetches aborted and lines played
 * with no audio (item 069). The harness keeps the real `setTimeout` as
 * `__wwRealSetTimeout`; in the game itself this is plain `setTimeout`.
 */
export function realTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
  const real = (globalThis as unknown as { __wwRealSetTimeout?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout> }).__wwRealSetTimeout;
  return real ? real(fn, ms) : setTimeout(fn, ms);
}
