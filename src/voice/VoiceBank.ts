/**
 * The game's entire knowledge of voice: `public/voice-gen/manifest.json`.
 *
 * Ported from Seraphina's VoiceBank, with manifest groups added: there are
 * well over a thousand lines (every narrator line exists once per possible
 * ally), so nothing decodes up front. `loadGroups([...])` fetches and decodes
 * exactly the groups a scene is about to use, and is safe to call repeatedly.
 * Voice loading must never be what stops a four-year-old playing: no manifest
 * means a mute game with the captions still showing.
 */

import { getAudioContext, unlockAudio } from '../audio/context';
import { holdPlan, holdSamples, type HoldMode } from '../audio/holdSound';

export interface TimedWord {
  word: string;
  start: number;
  end: number;
}

export interface VoiceLine {
  id: string;
  speaker: string;
  group: string;
  text: string;
  audio: string;
  words: TimedWord[];
  duration: number;
}

interface VoiceManifestFile {
  version: number;
  provider: string;
  lines: VoiceLine[];
}

/** Clips fetched and decoded at once: the dev server's HTTP/1.1 allows six connections a host. */
const DECODE_SLOTS = 6;
/** A clip's fetch is given up after this (item 057 saw one hang 60 s), freeing its slot. */
const FETCH_TIMEOUT_MS = 15_000;

interface DecodeJob {
  id: string;
  group: string;
  /** Asked for by `ensure` (a line about to be said), not only by its group. */
  urgent: boolean;
  done: Promise<void>;
  run(): Promise<void>;
  /** Taken off the queue before it ran: its awaiters resolve, nothing decoded. */
  cancel(): void;
}

export class VoiceBank {
  private readonly lines = new Map<string, VoiceLine>();
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly groups = new Map<string, Promise<void>>();
  private manifest: Promise<boolean> | null = null;
  /** Decodes queued or under way, by line id; `waiting` is the queue, front first. */
  private readonly jobs = new Map<string, DecodeJob>();
  private readonly waiting: DecodeJob[] = [];
  private readonly failed = new Set<string>();
  private active = 0;

  /** Read the manifest only; cheap. */
  load(base = import.meta.env.BASE_URL): Promise<boolean> {
    this.manifest ??= (async () => {
      try {
        const response = await fetch(`${base}voice-gen/manifest.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const manifest = (await response.json()) as VoiceManifestFile;
        for (const line of manifest.lines) this.lines.set(line.id, line);
        return true;
      } catch (error) {
        console.warn('voice: no manifest, running mute', error);
        return false;
      }
    })();
    return this.manifest;
  }

  /** Decode every clip in these groups. Resolves when all are ready (or failed). */
  async loadGroups(names: string[], base = import.meta.env.BASE_URL): Promise<void> {
    await this.load(base);
    await Promise.all(
      names.map((name) => {
        let p = this.groups.get(name);
        if (!p) {
          p = this.decodeGroup(name, base);
          this.groups.set(name, p);
        }
        return p;
      }),
    );
  }

  private async decodeGroup(name: string, base: string): Promise<void> {
    const ctx = getAudioContext();
    if (!ctx) return;
    const lines = [...this.lines.values()].filter((l) => l.group === name);
    await Promise.all(lines.map((line) => this.request(ctx, line, base, false)));
  }

  /**
   * One queue for every clip, `DECODE_SLOTS` fetching and decoding at a time
   * (decodeAudioData on hundreds at once stalls the frame). A line about to be
   * said (`ensure`) goes to the front and shares a decode already under way.
   * Item 062: each group used to decode in its own batches of 12, so an episode's
   * six or more groups put 70-odd fetches ahead of the line being said, past
   * VoiceBus's ENSURE_TIMEOUT_MS: the caption showed and nothing was said.
   */
  private request(ctx: AudioContext, line: VoiceLine, base: string, urgent: boolean): Promise<void> {
    if (this.buffers.has(line.id)) return Promise.resolve();
    const known = this.jobs.get(line.id);
    if (known) {
      const i = this.waiting.indexOf(known);
      if (urgent && i > 0) this.waiting.unshift(...this.waiting.splice(i, 1));
      known.urgent ||= urgent;
      return known.done;
    }
    let settle = () => undefined as void;
    const done = new Promise<void>((resolve) => (settle = resolve));
    const job: DecodeJob = {
      id: line.id,
      group: line.group,
      urgent,
      done,
      cancel: () => {
        this.jobs.delete(line.id);
        settle();
      },
      run: async () => {
        // A fetch that never answers would hold its slot for good; past this it fails like any other.
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);
        try {
          const bytes = await (await fetch(`${base}${line.audio}`, { signal: abort.signal })).arrayBuffer();
          const buffer = await ctx.decodeAudioData(bytes);
          // A group retain() let go while this was under way stays let go, unless a line asked for it.
          if (job.urgent || this.groups.has(line.group)) this.buffers.set(line.id, buffer);
          this.failed.delete(line.id);
        } catch (error) {
          this.failed.add(line.id);
          console.warn(`voice: could not decode ${line.id}`, error);
        } finally {
          clearTimeout(timer);
          this.jobs.delete(line.id);
          settle();
        }
      },
    };
    this.jobs.set(line.id, job);
    if (urgent) this.waiting.unshift(job);
    else this.waiting.push(job);
    this.pump();
    return done;
  }

  private pump(): void {
    while (this.active < DECODE_SLOTS && this.waiting.length) {
      const job = this.waiting.shift()!;
      this.active++;
      void job.run().finally(() => {
        this.active--;
        this.pump();
      });
    }
  }

  /** Where a line's audio stands, for the bug-hunt checker's silent-line reason. */
  state(id: string): 'ready' | 'queued' | 'decoding' | 'failed' | 'none' {
    if (this.buffers.has(id)) return 'ready';
    const job = this.jobs.get(id);
    if (job) return this.waiting.includes(job) ? 'queued' : 'decoding';
    if (this.failed.has(id)) return 'failed';
    return 'none';
  }

  /**
   * Forget the decoded audio of every group not in `keep` (core and phonics
   * always stay). A new episode's narrator is ~500 clips, 110-170 MB decoded,
   * and nothing was ever freed: a long sitting with varied allies held over a
   * gigabyte (item 039). A group dropped here decodes again if it is needed.
   */
  retain(keep: string[]): void {
    const k = new Set([...keep, 'core', 'phonics']);
    for (const name of [...this.groups.keys()]) {
      if (k.has(name)) continue;
      this.groups.delete(name);
      for (const line of this.lines.values()) if (line.group === name) this.buffers.delete(line.id);
      // Not yet started: drop them, or they would decode a group just let go.
      for (const job of this.waiting.filter((j) => j.group === name)) {
        this.waiting.splice(this.waiting.indexOf(job), 1);
        job.cancel();
      }
    }
  }

  get(id: string): VoiceLine | undefined {
    return this.lines.get(id);
  }

  has(id: string): boolean {
    return this.lines.has(id);
  }

  /** Decoded and playable right now. */
  ready(id: string): boolean {
    return this.buffers.has(id);
  }

  /** Make sure one line is decoded, ahead of any group still decoding. */
  async ensure(id: string, base = import.meta.env.BASE_URL): Promise<void> {
    const line = this.lines.get(id);
    const ctx = getAudioContext();
    if (line && ctx) await this.request(ctx, line, base, true);
  }

  /**
   * A letter sound cut for the Stretchy Bridge (item 054, src/audio/holdSound.ts):
   * held (its steady part looping from `loopStart`, in seconds) or once (no
   * schwa). Worked out from the decoded clip the first time, and again if the
   * clip is decoded anew, so a recording that replaces a placeholder is cut
   * by its own shape. Null until the line is decoded.
   */
  held(id: string, mode: HoldMode): HeldClip | null {
    const ctx = getAudioContext();
    const buffer = this.buffers.get(id);
    if (!ctx || !buffer) return null;
    let cuts = this.cuts.get(buffer);
    if (!cuts) this.cuts.set(buffer, (cuts = {}));
    const done = cuts[mode];
    if (done) return done;
    const x = buffer.getChannelData(0);
    const plan = holdPlan(x, buffer.sampleRate, mode);
    const { data, loopStart } = holdSamples(x, plan, buffer.sampleRate);
    const out = ctx.createBuffer(1, data.length, buffer.sampleRate);
    out.copyToChannel(data, 0);
    const clip: HeldClip = { buffer: out, loopStart: loopStart === null ? null : loopStart / buffer.sampleRate };
    cuts[mode] = clip;
    return clip;
  }

  private readonly cuts = new WeakMap<AudioBuffer, Partial<Record<HoldMode, HeldClip>>>();

  get ids(): string[] {
    return [...this.lines.keys()];
  }

  /** Start a clip; null when there is nothing to play (callers time the caption themselves). */
  play(id: string, destination?: AudioNode): VoicePlayback | null {
    const ctx = getAudioContext();
    const buffer = this.buffers.get(id);
    if (!ctx || !buffer) return null;
    unlockAudio();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(destination ?? ctx.destination);
    source.start();
    return new VoicePlayback(ctx, source, buffer.duration);
  }
}

/** A letter sound cut to hold or play once (`VoiceBank.held`). */
export interface HeldClip {
  buffer: AudioBuffer;
  /** Where a held clip loops back to, in seconds; null for a once clip. */
  loopStart: number | null;
}

export class VoicePlayback {
  private readonly startedAt: number;
  private stopped = false;
  readonly ended: Promise<void>;

  constructor(
    private readonly ctx: AudioContext,
    private readonly source: AudioBufferSourceNode,
    readonly length: number,
  ) {
    this.startedAt = ctx.currentTime;
    this.ended = new Promise((resolve) => {
      source.onended = () => resolve();
    });
  }

  get time(): number {
    return this.stopped ? 0 : this.ctx.currentTime - this.startedAt;
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    try {
      this.source.stop();
    } catch {
      // Already ended.
    }
  }
}

/** One bank for the whole game. */
export const voiceBank = new VoiceBank();
