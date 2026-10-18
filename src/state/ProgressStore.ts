/**
 * What she knows: per letter sound and per word, saved in localStorage.
 *
 * Versioned JSON under one key. A newer or unreadable blob is set aside (kept
 * under a backup key, never deleted) and a fresh store starts, because losing
 * the parent screen's history is better than a game that will not boot.
 *
 * Two horizons per item: `lifetime` (since the first episode) and `session`
 * (this page load), so the parent screen can show "today" next to "ever".
 *
 * Pure: no Phaser, no DOM beyond an injectable Storage, so the unit tests run
 * it under Node with a fake storage.
 */

export const STORE_KEY = 'wordwarriors.progress';
export const STORE_VERSION = 1;

export interface Stat {
  seen: number;
  right: number;
  /** Wrong tries (a round can have several before the right one). */
  wrong: number;
  /** Rolling record of the last few first tries: true = right first time. */
  recent: boolean[];
  last: number;
}

export interface ProgressData {
  version: number;
  sounds: Record<string, Stat>;
  words: Record<string, Stat>;
  /** Spelling is writing, not reading: its keystroke slips are kept apart. */
  spelling: Record<string, Stat>;
  /** Sentence frames (`we_can_use_the`): first-try answers, for skipping the listening pass. */
  frames: Record<string, Stat>;
  episodes: number;
}

export type ItemKind = 'sounds' | 'words' | 'spelling' | 'frames';

const RECENT = 6;

function emptyStat(): Stat {
  return { seen: 0, right: 0, wrong: 0, recent: [], last: 0 };
}

function empty(): ProgressData {
  return { version: STORE_VERSION, sounds: {}, words: {}, spelling: {}, frames: {}, episodes: 0 };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class ProgressStore {
  private data: ProgressData;
  private readonly session: ProgressData = empty();

  constructor(
    private readonly storage: StorageLike | null = typeof localStorage === 'undefined' ? null : localStorage,
    private readonly now: () => number = Date.now,
  ) {
    this.data = this.read();
  }

  private read(): ProgressData {
    const raw = this.storage?.getItem(STORE_KEY);
    if (!raw) return empty();
    try {
      const parsed = JSON.parse(raw) as ProgressData;
      if (parsed.version !== STORE_VERSION) throw new Error(`version ${parsed.version}`);
      parsed.sounds ??= {};
      parsed.words ??= {};
      parsed.spelling ??= {};
      // Added in v0.2 without a version bump: an older blob simply has none yet.
      parsed.frames ??= {};
      parsed.episodes ??= 0;
      return parsed;
    } catch {
      this.storage?.setItem(`${STORE_KEY}.unreadable.${this.now()}`, raw);
      return empty();
    }
  }

  private save(): void {
    try {
      this.storage?.setItem(STORE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage full or blocked: progress is a nicety, never a crash.
    }
  }

  /**
   * Record one answered item. `firstTry` is whether the very first answer was
   * right; `wrongTries` is how many wrong answers came before the right one.
   */
  record(kind: ItemKind, id: string, firstTry: boolean, wrongTries: number): void {
    for (const d of [this.data, this.session]) {
      const s = (d[kind][id] ??= emptyStat());
      s.seen++;
      s.right++;
      s.wrong += wrongTries;
      s.recent = [...s.recent, firstTry].slice(-RECENT);
      s.last = this.now();
    }
    this.save();
  }

  episodeDone(): void {
    this.data.episodes++;
    this.session.episodes++;
    this.save();
  }

  stat(kind: ItemKind, id: string, horizon: 'lifetime' | 'session' = 'lifetime'): Stat {
    return (horizon === 'lifetime' ? this.data : this.session)[kind][id] ?? emptyStat();
  }

  /**
   * How shaky an item is, 0 (solid) .. 1 (unknown or often missed). Unseen
   * items count as fairly shaky so new things get introduced.
   */
  shakiness(kind: ItemKind, id: string): number {
    const s = this.stat(kind, id);
    if (s.recent.length === 0) return 0.7;
    const misses = s.recent.filter((r) => !r).length / s.recent.length;
    // Fewer than three tries is not enough to call it solid.
    const confidence = Math.min(1, s.recent.length / 3);
    return Math.max(0.05, misses * confidence + 0.5 * (1 - confidence));
  }

  snapshot(): ProgressData {
    return JSON.parse(JSON.stringify(this.data)) as ProgressData;
  }

  sessionSnapshot(): ProgressData {
    return JSON.parse(JSON.stringify(this.session)) as ProgressData;
  }

  /** Dev/tests only. */
  reset(): void {
    this.data = empty();
    this.save();
  }
}

/** Weighted pick of `n` distinct ids, weighted toward shaky ones. `rand` in [0,1). */
export function pickWeighted(ids: string[], weight: (id: string) => number, n: number, rand: () => number = Math.random): string[] {
  const pool = [...ids];
  const out: string[] = [];
  while (out.length < n && pool.length) {
    const ws = pool.map((id) => Math.max(0.01, weight(id)));
    const total = ws.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= ws[i]!;
      if (r <= 0) break;
    }
    out.push(pool.splice(i, 1)[0]!);
  }
  return out;
}
