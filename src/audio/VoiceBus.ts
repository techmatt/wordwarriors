/**
 * The voice arbiter: one voice at a time, decided in one place.
 *
 * Seraphina's bubbles each played their own audio; battles here have a dozen
 * fighters who all want to taunt, plus a narrator giving instructions, so every
 * spoken line goes through `say()` and this decides:
 *
 * - `instruction` (narrator, prompts, word confirmations) always plays. It cuts
 *   off a playing bark and queues behind another instruction.
 * - `bark` (taunts, ultimate calls) plays only if nobody is talking, and only
 *   if the last bark ended a moment ago; otherwise it is dropped, never queued,
 *   because a stale taunt three seconds late is noise.
 *
 * Listeners (the bubble layer, the caption) hear about every line that starts,
 * so text and voice can never disagree. When a clip is missing (mute build,
 * failed line) the line still "plays" for an estimated duration so the caption
 * shows and flow-control awaits still resolve.
 */

import { getAudioContext, unlockAudio } from './context';
import type { HoldMode } from './holdSound';
import { setMusicDuck } from './music';
import { setSfxLevel } from './sfx';
import { voiceBank, type VoiceLine, type VoicePlayback } from '../voice/VoiceBank';

export type Priority = 'instruction' | 'bark';

export interface Utterance {
  id: string;
  line: VoiceLine | undefined;
  text: string;
  speaker: string;
  priority: Priority;
  /** Who is talking, for the follow-the-speaker bubble. Opaque to the bus. */
  anchor?: unknown;
  startedAt: number;
  /** Seconds since start, on the audio clock when there is audio. */
  time(): number;
  duration: number;
}

type Listener = (u: Utterance | null) => void;

const BARK_GAP_MS = 900;

class Bus {
  private current: { u: Utterance; playback: Pick<VoicePlayback, 'stop'> | null; done: () => void } | null = null;
  private queue: ((() => void) & { drop?: () => void })[] = [];
  private hushes = 0;
  private listeners = new Set<Listener>();
  private lastBarkEnd = 0;
  /** Lines started, by id, in order: the tests' view of what was said. */
  readonly history: string[] = [];

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get speaking(): Utterance | null {
    return this.current?.u ?? null;
  }

  get busy(): boolean {
    return this.current !== null || this.queue.length > 0;
  }

  /**
   * Say a line. Resolves when it has finished (or was dropped/cut), never rejects.
   * A bark that is dropped resolves immediately with false.
   */
  say(id: string, priority: Priority = 'instruction', anchor?: unknown): Promise<boolean> {
    if (priority === 'bark') {
      if (this.current || this.queue.length) return Promise.resolve(false);
      if (performance.now() - this.lastBarkEnd < BARK_GAP_MS) return Promise.resolve(false);
      return this.start(id, priority, anchor);
    }
    if (this.current?.u.priority === 'bark') this.cut();
    if (!this.current && this.queue.length === 0) return this.start(id, priority, anchor);
    return new Promise((resolve) => {
      this.queue.push(Object.assign(() => void this.start(id, priority, anchor).then(resolve), { drop: () => resolve(false) }));
    });
  }

  /** Say several instruction lines back to back. */
  async sequence(ids: string[], anchor?: unknown): Promise<void> {
    // A hush (scene change) ends the whole sequence, not just its current line.
    const epoch = this.hushes;
    for (const id of ids) {
      if (this.hushes !== epoch) return;
      await this.say(id, 'instruction', anchor);
    }
  }

  /**
   * Hold a letter sound (item 054, the Stretchy Bridge): it plays while she
   * stands on its stone and stops, with a short fade, on `release()`. A `hold`
   * sound loops its steady part (up to `maxMs`); a `once` sound plays its cut
   * once, never with a schwa (VoiceBank `held`, src/audio/holdSound.ts). It is
   * a line like any other to the listeners and the history, so a bark waits
   * and an instruction queues behind it. Null while an instruction is playing
   * or queued: a stone never talks over the narrator. With no audio (muted,
   * not decoded yet) it still "plays", silent, so the flow is the same.
   */
  hold(id: string, mode: HoldMode, maxMs: number): HeldSound | null {
    if (this.current?.u.priority === 'instruction' || this.queue.length) return null;
    if (this.current) this.cut();
    if (voiceBank.has(id) && !voiceBank.ready(id)) void voiceBank.ensure(id);
    const ctx = getAudioContext();
    const clip = ctx?.state === 'running' ? voiceBank.held(id, mode) : null;
    let stopAudio = () => undefined as void;
    let ended: Promise<void> | null = null;
    if (ctx && clip) {
      unlockAudio();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      const source = ctx.createBufferSource();
      source.buffer = clip.buffer;
      if (mode === 'hold' && clip.loopStart !== null) {
        source.loop = true;
        source.loopStart = clip.loopStart;
        source.loopEnd = clip.buffer.duration;
      }
      source.connect(gain);
      source.start();
      ended = new Promise((resolve) => (source.onended = () => resolve()));
      stopAudio = () => {
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + HOLD_FADE_S);
        try {
          source.stop(t + HOLD_FADE_S + 0.01);
        } catch {
          // Already ended.
        }
      };
    }
    const line = voiceBank.get(id);
    const startedAt = performance.now();
    const length = clip ? clip.buffer.duration : 0.15;
    const u: Utterance = {
      id,
      line,
      text: line?.text ?? '',
      speaker: line?.speaker ?? '',
      priority: 'instruction',
      startedAt,
      duration: mode === 'hold' ? maxMs / 1000 : length,
      time: () => (performance.now() - startedAt) / 1000,
    };
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      stopAudio();
      if (this.current?.u === u) this.finish();
    };
    this.current = { u, playback: { stop: release }, done: () => undefined };
    this.history.push(id);
    if (this.history.length > 200) this.history.shift();
    setSfxLevel(0.45);
    setMusicDuck(0.35);
    for (const fn of this.listeners) fn(u);
    // A once sound ends by itself; a held one at `maxMs` at the latest.
    if (mode === 'once' && ended) void ended.then(release);
    else setTimeout(release, mode === 'once' ? length * 1000 : maxMs);
    return { id, release, get playing() { return !released; } };
  }

  /** Stop everything, queue included (scene change). */
  hush(): void {
    this.hushes++;
    // Queued lines resolve (as not said) rather than hang their awaiters.
    const dropped = this.queue;
    this.queue = [];
    for (const q of dropped) q.drop?.();
    this.cut();
  }

  private cut(): void {
    const c = this.current;
    if (!c) return;
    c.playback?.stop();
    this.finish();
  }

  private async start(id: string, priority: Priority, anchor: unknown): Promise<boolean> {
    // Claim the voice before any await, so nothing else starts meanwhile.
    const claim = { u: { id } as Utterance, playback: null, done: () => undefined };
    this.current = claim;
    if (voiceBank.has(id) && !voiceBank.ready(id)) await voiceBank.ensure(id);
    // hush() or a newer line may have taken the voice while this one decoded;
    // then this line is dropped rather than talking over (and orphaning) it.
    if (this.current !== claim) return false;
    this.current = null;
    const line = voiceBank.get(id);
    if (!line) console.warn(`voice: no line ${id}`);
    // A suspended context (audio not yet unlocked) never ends a clip, so it
    // would hang every await on this line: run on the estimated clock instead.
    const live = getAudioContext()?.state === 'running';
    const playback = line && live ? voiceBank.play(id) : null;
    const text = line?.text ?? '';
    const words = text.split(/\s+/).length;
    const duration = playback ? playback.length : line ? Math.max(0.8, line.duration + 0.3) : Math.max(0.6, words * 0.35);
    const startedAt = performance.now();
    const u: Utterance = {
      id,
      line,
      text,
      speaker: line?.speaker ?? '',
      priority,
      anchor,
      startedAt,
      duration,
      time: () => (playback ? playback.time : (performance.now() - startedAt) / 1000),
    };
    this.history.push(id);
    if (this.history.length > 200) this.history.shift();
    setSfxLevel(0.45);
    setMusicDuck(0.35);

    return new Promise((resolve) => {
      const done = () => resolve(true);
      this.current = { u, playback, done };
      for (const fn of this.listeners) fn(u);
      if (playback) void playback.ended.then(() => this.current?.u === u && this.finish());
      // Always a backstop: whatever happens to the audio, the line ends.
      setTimeout(() => {
        if (this.current?.u !== u) return;
        playback?.stop();
        this.finish();
      }, (duration + (playback ? 1.5 : 0)) * 1000);
    });
  }

  private finish(): void {
    const c = this.current;
    if (!c) return;
    this.current = null;
    if (c.u.priority === 'bark') this.lastBarkEnd = performance.now();
    for (const fn of this.listeners) fn(null);
    setSfxLevel(1);
    setMusicDuck(1);
    c.done();
    const next = this.queue.shift();
    if (next) next();
  }
}

/** A held letter sound (`voiceBus.hold`). */
export interface HeldSound {
  id: string;
  /** Stop it (a short fade); safe to call again. */
  release(): void;
  readonly playing: boolean;
}

/** A held sound fades out over this when she steps off its stone. */
const HOLD_FADE_S = 0.04;

export const voiceBus = new Bus();
