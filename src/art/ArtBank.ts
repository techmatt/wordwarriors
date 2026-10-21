/**
 * Art on demand (item 065), the way voice loads its groups: boot used to load
 * all 459 pictures (47 MB) before the title. Now nothing loads until a scene
 * asks: `ensure(ids)` (a scene about to show: front of the queue) or
 * `prefetch(ids)` (the scene after it, in the background). Each picture is
 * fetched once (by `fetch`, at a priority), decoded off the main thread where it can (`Image.decode`) and handed to
 * Phaser's texture manager, so it outlives every scene.
 *
 * Which scene needs what is `src/art/needs.ts`; the gate that keeps a scene
 * from showing before its art is `src/art/gate.ts`. A missing file still must
 * not stop the game: it gets the magenta square boot used to paint.
 *
 * The safety net: asking the texture manager for an art id that is not loaded
 * yet (`get` or `exists`) warns `art: not ready <id> (<scene>)` once and puts
 * the id at the front of the queue. Nothing should ever do that; the bug-hunt
 * checker reports it as `art-late`.
 */

import Phaser from 'phaser';

import { ART_BY_ID } from '../../content/art/assets';

/** Pictures fetched and decoded at once for a scene about to show. */
const SLOTS = 8;
/**
 * At once for the background (the next scene's): fewer, so the voice clips the
 * scene is saying now keep the connections (item 065's sweep: with more, lines
 * played with no clip, `voice-silent`).
 */
const BACKGROUND_SLOTS = 3;
/**
 * A fetch still out after this is aborted and asked again (`TRIES` in all), so
 * nothing hangs for good. Long: a fetch waits its turn behind the voice
 * clips, and aborting one re-queues it at the back (30 s, 6 s real at test
 * speed 5, thrashed: the slow-art test took a minute instead of 5 s).
 */
const FETCH_TIMEOUT_MS = 120_000;
const TRIES = 3;

/** The file is not there, or not a picture: no point asking again. */
class NotThere extends Error {}

interface Job {
  id: string;
  urgent: boolean;
  done: Promise<void>;
  resolve(): void;
}

export interface LateArt {
  id: string;
  scene: string;
}

export class ArtBank {
  private game: Phaser.Game | null = null;
  private readonly jobs = new Map<string, Job>();
  private readonly waiting: Job[] = [];
  private readonly failed = new Set<string>();
  private readonly loaded = new Set<string>();
  private active = 0;
  /** Art asked for before it was loaded, in order (the QA probe reads it). */
  readonly late: LateArt[] = [];
  private readonly warned = new Set<string>();
  private exists: (key: string) => boolean = () => false;
  /** Adding a texture: Phaser's own `checkKey` asks `exists` first, which is not a scene asking early. */
  private adding = false;

  /** Call once, as the game is made: wraps the texture manager's `get` and `exists` for the safety net. */
  install(game: Phaser.Game): void {
    this.game = game;
    const tm = game.textures;
    const exists = tm.exists.bind(tm);
    const get = tm.get.bind(tm);
    this.exists = exists;
    tm.exists = (key: string) => {
      const yes = exists(key);
      if (!yes) this.lateAsk(key);
      return yes;
    };
    tm.get = ((key: string | Phaser.Textures.Texture | Phaser.Textures.Frame) => {
      if (typeof key === 'string' && !exists(key)) this.lateAsk(key);
      return get(key);
    }) as typeof tm.get;
  }

  /** Loaded (or failed and painted magenta): safe to draw. */
  has(id: string): boolean {
    return this.loaded.has(id) || this.failed.has(id) || (ART_BY_ID[id] === undefined && this.exists(id));
  }

  /** The art ids among `ids` not ready yet. */
  missing(ids: Iterable<string>): string[] {
    return [...new Set(ids)].filter((id) => ART_BY_ID[id] && !this.has(id));
  }

  /** Load `ids` ahead of anything queued in the background; resolves when every one is drawable. */
  ensure(ids: Iterable<string>): Promise<void> {
    const want = this.missing(ids);
    if (!want.length) return Promise.resolve();
    return Promise.all(want.map((id) => this.queue(id, true))).then(() => undefined);
  }

  /** Load `ids` in the background, behind anything urgent. */
  prefetch(ids: Iterable<string>): void {
    for (const id of this.missing(ids)) void this.queue(id, false);
  }

  /** Queued or loading, for the transition's progress and the probe. */
  pending(): number {
    return this.jobs.size;
  }

  private queue(id: string, urgent: boolean): Promise<void> {
    let job = this.jobs.get(id);
    if (job) {
      if (urgent && !job.urgent) {
        job.urgent = true;
        const i = this.waiting.indexOf(job);
        if (i >= 0) {
          this.waiting.splice(i, 1);
          this.waiting.splice(this.waiting.findIndex((j) => !j.urgent) >>> 0, 0, job);
        }
      }
      return job.done;
    }
    let resolve!: () => void;
    const done = new Promise<void>((r) => (resolve = r));
    job = { id, urgent, done, resolve };
    this.jobs.set(id, job);
    if (urgent) {
      const at = this.waiting.findIndex((j) => !j.urgent);
      this.waiting.splice(at < 0 ? this.waiting.length : at, 0, job);
    } else this.waiting.push(job);
    this.pump();
    return done;
  }

  private pump(): void {
    while (this.active < SLOTS && this.waiting.length) {
      if (!this.waiting[0]!.urgent && this.active >= BACKGROUND_SLOTS) return;
      const job = this.waiting.shift()!;
      this.active++;
      void this.load(job)
        .then(
          () => this.loaded.add(job.id),
          (error: unknown) => this.fail(job.id, error),
        )
        .finally(() => {
          this.active--;
          this.jobs.delete(job.id);
          job.resolve();
          this.pump();
        });
    }
  }

  /**
   * A fetch that stalls is aborted and asked again, up to `TRIES` times; only a
   * file that is not there (or never arrives) gets the magenta square.
   */
  private async load(job: Job): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.fetchImage(job);
        return;
      } catch (error) {
        if (error instanceof NotThere || attempt >= TRIES) throw error;
      }
    }
  }

  /**
   * By `fetch`, not an `<img>` request: Chromium ranks image requests below the
   * voice bank's fetches and starved them for minutes (item 065's slow lane
   * stuck in the Wait scene). A scene about to show asks at high priority, the
   * background at low, so the voice being said keeps the connections.
   */
  private async fetchImage(job: Job): Promise<void> {
    const game = this.game;
    if (!game) throw new Error('art bank not installed');
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);
    let blob: Blob;
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}art/${job.id}.png`, { signal: abort.signal, priority: job.urgent ? 'high' : 'low' } as RequestInit);
      if (response.status === 404) throw new NotThere('not found');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      blob = await response.blob();
    } finally {
      window.clearTimeout(timer);
    }
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new NotThere('not a picture'));
      img.src = URL.createObjectURL(blob);
    });
    // Chromium sometimes refuses to pre-decode (`EncodingError`) with many at once; the image is still good.
    await img.decode().catch(() => undefined);
    if (!this.exists(job.id)) this.add(() => game.textures.addImage(job.id, img));
  }

  /** A missing art file must not stop the game: the magenta square boot always painted. */
  private fail(id: string, error: unknown): void {
    this.failed.add(id);
    console.warn(`art: missing ${id}`, error instanceof Error ? error.message : '');
    const game = this.game;
    if (!game || this.exists(id)) return;
    const canvas = this.add(() => game.textures.createCanvas(id, 64, 64));
    if (!canvas) return;
    canvas.context.fillStyle = '#ff00ff';
    canvas.context.fillRect(0, 0, 64, 64);
    canvas.refresh();
  }

  private add<T>(make: () => T): T {
    this.adding = true;
    try {
      return make();
    } finally {
      this.adding = false;
    }
  }

  private lateAsk(key: string): void {
    if (this.adding || !ART_BY_ID[key] || this.loaded.has(key) || this.failed.has(key)) return;
    const scenes = this.game?.scene.getScenes(true) ?? [];
    const scene = scenes.map((s) => s.scene.key).join('+') || '-';
    void this.queue(key, true);
    if (this.warned.has(`${key}@${scene}`)) return;
    this.warned.add(`${key}@${scene}`);
    this.late.push({ id: key, scene });
    console.warn(`art: not ready ${key} (${scene})`);
  }
}

export const artBank = new ArtBank();
