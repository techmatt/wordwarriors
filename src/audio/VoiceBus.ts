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
  private current: { u: Utterance; playback: VoicePlayback | null; done: () => void } | null = null;
  private queue: (() => void)[] = [];
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
      this.queue.push(() => void this.start(id, priority, anchor).then(resolve));
    });
  }

  /** Say several instruction lines back to back. */
  async sequence(ids: string[], anchor?: unknown): Promise<void> {
    for (const id of ids) await this.say(id, 'instruction', anchor);
  }

  /** Stop everything, queue included (scene change). */
  hush(): void {
    this.queue = [];
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
    const playback = line ? voiceBank.play(id) : null;
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
      else setTimeout(() => this.current?.u === u && this.finish(), duration * 1000);
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

export const voiceBus = new Bus();
