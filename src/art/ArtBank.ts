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
import { walkObjects } from '../hookState';
import { realTimeout } from '../realTime';

/**
 * Pictures fetched at once for a scene about to show. Four, not more: the dev
 * server speaks HTTP/1.1 (six connections a host), and eight took them all, so
 * the voice clips queued past their timeout (item 065, the cook-off test).
 */
const SLOTS = 4;
/**
 * At once for the background (the next scene's): fewer, so the voice clips the
 * scene is saying now keep the connections (item 065's sweep: with more, lines
 * played with no clip, `voice-silent`).
 */
const BACKGROUND_SLOTS = 2;
/**
 * A fetch still out after this is aborted and asked again (`TRIES` in all), so
 * nothing hangs for good. Long: a fetch waits its turn behind the voice
 * clips, and aborting one re-queues it at the back (30 s, 6 s real at test
 * speed 5, thrashed: the slow-art test took a minute instead of 5 s).
 * Wall-clock time since item 069 (`realTimeout`): test speed no longer shortens it.
 */
const FETCH_TIMEOUT_MS = 120_000;
const TRIES = 3;
/**
 * The wait before each try after the first (item 093, M25): a passing network
 * error (a server restart while she plays) failed all three tries within
 * milliseconds. Wall-clock time.
 */
const BACKOFF_MS = [500, 2000];
/** A picture lost to the network is asked again by a scene starting this long after (wall clock), not by the one it failed for. */
const REASK_AFTER_MS = 3000;

/** The file is not there, or not a picture: no point asking again. */
class NotThere extends Error {}

interface Job {
  id: string;
  urgent: boolean;
  done: Promise<void>;
  resolve(): void;
  /** The fetch in flight, asked at background priority: made urgent, it is asked again at high. */
  slow?: AbortController;
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
  /** Failed on the network, not a 404: magenta for now, asked again (in the background) by a later scene (M25). */
  private readonly retry = new Set<string>();
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

  /** The ids painted magenta (for the tests). */
  failedIds(): string[] {
    return [...this.failed];
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
    const list = [...ids];
    this.retryFailed(list);
    for (const id of this.missing(list)) void this.queue(id, false);
  }

  /**
   * Ask again, in the background, for any of `ids` that failed on the network
   * (a scene starting, or the next one's prefetch): the magenta square stays
   * drawable meanwhile, and is swapped for the picture if it comes (M25).
   */
  retryFailed(ids: Iterable<string>): void {
    for (const id of new Set(ids)) {
      if (!this.retry.has(id) || this.jobs.has(id)) continue;
      this.retry.delete(id);
      void this.queue(id, false);
    }
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
          const at = this.waiting.findIndex((j) => !j.urgent);
          this.waiting.splice(at < 0 ? this.waiting.length : at, 0, job);
          this.pump();
        } else job.slow?.abort();
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
          () => {
            this.loaded.add(job.id);
            this.failed.delete(job.id);
          },
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
   * A fetch that stalls or fails is asked again after a wait (`BACKOFF_MS`), up
   * to `TRIES` times; only a file that is not there (or never arrives) gets the
   * magenta square, and one lost to the network is asked again by a later scene.
   */
  private async load(job: Job): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      const promoted = !job.urgent;
      try {
        await this.fetchImage(job);
        return;
      } catch (error) {
        // Made urgent while in flight: asked again at high priority, not counted as a try.
        if (promoted && job.urgent && !(error instanceof NotThere)) {
          attempt--;
          continue;
        }
        if (error instanceof NotThere || attempt >= TRIES) throw error;
      }
      const ms = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)]!;
      await new Promise<void>((resolve) => realTimeout(resolve, ms));
    }
  }

  /**
   * By `fetch`, not an `<img>` request: Chromium ranks image requests below the
   * voice bank's fetches and starved them for minutes (item 065's slow lane
   * stuck in the Wait scene). A scene about to show asks at high priority, the
   * background (two at a time) at the default.
   */
  private async fetchImage(job: Job): Promise<void> {
    const game = this.game;
    if (!game) throw new Error('art bank not installed');
    const abort = new AbortController();
    if (!job.urgent) job.slow = abort;
    const timer = realTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);
    let blob: Blob;
    try {
      // Background at the default priority: Chromium holds `low` back for as long as higher ones keep coming.
      const response = await fetch(`${import.meta.env.BASE_URL}art/${job.id}.png`, { signal: abort.signal, ...(job.urgent ? { priority: 'high' } : {}) } as RequestInit);
      if (response.status === 404) throw new NotThere('not found');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      blob = await response.blob();
    } finally {
      window.clearTimeout(timer);
      job.slow = undefined;
    }
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new NotThere('not a picture'));
      img.src = URL.createObjectURL(blob);
    });
    // Chromium sometimes refuses to pre-decode (`EncodingError`) with many at once; the image is still good.
    await img.decode().catch(() => undefined);
    if (this.failed.has(job.id) && this.exists(job.id)) this.swap(job.id, img);
    else if (!this.exists(job.id)) this.add(() => game.textures.addImage(job.id, img));
  }

  /**
   * The picture for an id painted magenta after a network error (M25): the
   * square's texture is replaced, and whatever still shows it takes the
   * picture, fitted inside the square it filled.
   */
  private swap(id: string, img: HTMLImageElement): void {
    const game = this.game!;
    const users: { o: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite; w: number; h: number }[] = [];
    for (const s of game.scene.getScenes(false)) {
      walkObjects(s.sys.displayList?.list ?? [], (o) => {
        if ((o instanceof Phaser.GameObjects.Image || o instanceof Phaser.GameObjects.Sprite) && o.texture.key === id) users.push({ o, w: o.displayWidth, h: o.displayHeight });
      });
    }
    this.add(() => {
      game.textures.remove(id);
      game.textures.addImage(id, img);
    });
    for (const { o, w, h } of users) {
      const sx = Math.sign(o.scaleX) || 1;
      const sy = Math.sign(o.scaleY) || 1;
      o.setTexture(id);
      const k = Math.min(w / img.width, h / img.height);
      o.setScale(k * sx, k * sy);
    }
  }

  /** A missing art file must not stop the game: the magenta square boot always painted. */
  private fail(id: string, error: unknown): void {
    this.failed.add(id);
    // Lost to the network, not a 404 or a broken file: a later scene asks again (M25).
    if (!(error instanceof NotThere)) realTimeout(() => this.failed.has(id) && this.retry.add(id), REASK_AFTER_MS);
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
