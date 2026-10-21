/**
 * One AudioContext for the whole game.
 *
 * Chimes and voice share it deliberately: it is the thing a browser gates
 * behind a user gesture, so one context means one unlock to get right, and
 * `currentTime` on it is the clock the word highlighting rides on.
 */

import { realTimeout } from '../realTime';

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

/** Set while a hidden tab holds the context (item 080), until it has resumed. */
let held: { done: Promise<void>; release: () => void } | null = null;

/**
 * The tab went hidden (Phaser's HIDDEN, item 080): the context sleeps with the
 * game loop, so the voice, chimes and music wait with the picture.
 */
export function holdAudio(): void {
  const c = getAudioContext();
  // Not yet unlocked (suspended, nothing held): nothing plays to hold.
  if (!c || (c.state !== 'running' && !held)) return;
  holds++;
  if (!held) {
    let release = () => undefined as void;
    held = { done: new Promise<void>((r) => (release = r)), release: () => release() };
  }
  void c.suspend().catch(() => undefined);
}

/** Bumped by each hold, so a resume that ends after the tab hid again keeps the hold. */
let holds = 0;

/** The tab is back (Phaser's VISIBLE): resume, and let waiting lines start once it has (a second at most). */
export function releaseAudio(): void {
  const h = held;
  if (!h) return;
  const at = holds;
  const end = () => {
    if (held !== h || holds !== at) return;
    held = null;
    h.release();
  };
  const resumed = getAudioContext()?.resume().catch(() => undefined) ?? Promise.resolve();
  void Promise.race([resumed, new Promise<void>((r) => realTimeout(r, 1000))]).then(end);
}

/** A hidden tab holds the audio: a line coming up now waits for `whenAudible()`. */
export function audioHeld(): boolean {
  return held !== null;
}

/** Resolves once the tab is back and the context running again (at once when nothing holds it). */
export function whenAudible(): Promise<void> {
  return held ? held.done : Promise.resolve();
}
