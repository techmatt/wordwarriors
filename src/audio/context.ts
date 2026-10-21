/**
 * One AudioContext for the whole game.
 *
 * Chimes and voice share it deliberately: it is the thing a browser gates
 * behind a user gesture, so one context means one unlock to get right, and
 * `currentTime` on it is the clock the word highlighting rides on.
 */

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (ctx) return ctx;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

/**
 * Browsers start an AudioContext suspended until a user gesture. Call this from
 * any input handler; it is cheap and safe to call repeatedly.
 */
export function unlockAudio(): void {
  const c = getAudioContext();
  if (c && c.state === 'suspended') void c.resume().catch(() => undefined);
}

/**
 * Resolves once the tab is visible again and the context has had its chance to
 * resume (item 080): a line that comes up while the tab is hidden waits for her,
 * rather than running silent on the estimated clock. Never waits on a context
 * that cannot resume yet (no gesture so far): a second at most.
 */
export function whenVisible(): Promise<void> {
  if (typeof document === 'undefined' || !document.hidden) return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', check);
      const c = getAudioContext();
      const resumed = c?.state === 'suspended' ? c.resume().catch(() => undefined) : Promise.resolve();
      void Promise.race([resumed, new Promise((r) => setTimeout(r, 1000))]).then(() => resolve());
    };
    document.addEventListener('visibilitychange', check);
  });
}
