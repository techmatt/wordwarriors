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

export class VoiceBank {
  private readonly lines = new Map<string, VoiceLine>();
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly groups = new Map<string, Promise<void>>();
  private manifest: Promise<boolean> | null = null;

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
    // A few at a time: decodeAudioData on hundreds of clips at once stalls the frame.
    for (let i = 0; i < lines.length; i += 12) {
      await Promise.all(lines.slice(i, i + 12).map((line) => this.decodeLine(ctx, line, base)));
    }
  }

  private async decodeLine(ctx: AudioContext, line: VoiceLine, base: string): Promise<void> {
    if (this.buffers.has(line.id)) return;
    try {
      const bytes = await (await fetch(`${base}${line.audio}`)).arrayBuffer();
      this.buffers.set(line.id, await ctx.decodeAudioData(bytes));
    } catch (error) {
      console.warn(`voice: could not decode ${line.id}`, error);
    }
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

  /** Make sure one line is decoded (for a line outside the loaded groups). */
  async ensure(id: string, base = import.meta.env.BASE_URL): Promise<void> {
    const line = this.lines.get(id);
    const ctx = getAudioContext();
    if (line && ctx) await this.decodeLine(ctx, line, base);
  }

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
