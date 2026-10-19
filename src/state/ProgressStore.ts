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
  /** The word machine (item 026): word families by rime (`at`) and first sounds by letter (`b`), first-try builds. */
  rimes: Record<string, Stat>;
  onsets: Record<string, Stat>;
  /** Her word bag: the sentence key words drawn without replacement (item 015). */
  bag: WordBag;
  /** Her move bag: the battle's move words, drawn the same way (item 018). */
  moveBag: WordBag;
  episodes: number;
  /** The villains (persons) of her last few episodes, newest last (item 025): the cast draw avoids them. */
  villains: string[];
  /** The victory scene of her last episode (item 027): the next one is different. */
  ending: string | null;
}

/**
 * Key words still to come this round. A word leaves the bag when she reads
 * it right first time; when no word the episode can use is left, the bag
 * refills with every key word and `round` counts up. A word she missed stays
 * in, or goes back in if a refill dropped it (`returnToBag`).
 */
export interface WordBag {
  left: string[];
  round: number;
}

/** Which bag: the sentence key words, or the battle's move words. */
export type BagKind = 'keys' | 'moves';

export type ItemKind = 'sounds' | 'words' | 'spelling' | 'frames' | 'rimes' | 'onsets';

const RECENT = 6;

function emptyStat(): Stat {
  return { seen: 0, right: 0, wrong: 0, recent: [], last: 0 };
}

function empty(): ProgressData {
  return { version: STORE_VERSION, sounds: {}, words: {}, spelling: {}, frames: {}, rimes: {}, onsets: {}, bag: { left: [], round: 0 }, moveBag: { left: [], round: 0 }, episodes: 0, villains: [], ending: null };
}

/** How many past villains the store keeps. */
const VILLAINS_KEPT = 4;

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
      // Item 015, the same way: an empty bag with round 0 fills on the first draw.
      parsed.bag ??= { left: [], round: 0 };
      parsed.moveBag ??= { left: [], round: 0 };
      parsed.episodes ??= 0;
      // Item 025, the same way.
      parsed.villains ??= [];
      // Item 026, the same way.
      parsed.rimes ??= {};
      parsed.onsets ??= {};
      // Item 027, the same way.
      parsed.ending ??= null;
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

  /** Her recent villains (persons), newest last. */
  recentVillains(): string[] {
    return [...this.data.villains];
  }

  /** Her last episode's victory scene, or null. */
  lastEnding(): string | null {
    return this.data.ending;
  }

  /** A victory scene was played: the next episode draws another. */
  endingPlayed(id: string): void {
    this.data.ending = id;
    this.save();
  }

  /** An episode was cast with this villain (a person): kept so the next ones differ. */
  villainMet(person: string): void {
    this.data.villains = [...this.data.villains.filter((v) => v !== person), person].slice(-VILLAINS_KEPT);
    this.save();
  }

  private bagField(which: BagKind): 'bag' | 'moveBag' {
    return which === 'keys' ? 'bag' : 'moveBag';
  }

  /** A word bag, as stored (a copy). */
  bag(which: BagKind = 'keys'): WordBag {
    const b = this.data[this.bagField(which)];
    return { left: [...b.left], round: b.round };
  }

  /** She read a word right first time: it leaves the bag until the next round. */
  takeFromBag(word: string, which: BagKind = 'keys'): void {
    const b = this.data[this.bagField(which)];
    b.left = b.left.filter((w) => w !== word);
    this.save();
  }

  /** A new round: the bag holds `words` again. */
  refillBag(words: string[], which: BagKind = 'keys'): void {
    const f = this.bagField(which);
    this.data[f] = { left: [...new Set(words)], round: this.data[f].round + 1 };
    this.save();
  }

  /** A word she missed goes back in, so it can come round again before the bag empties. */
  returnToBag(word: string, which: BagKind = 'keys'): void {
    const b = this.data[this.bagField(which)];
    if (!b.left.includes(word)) b.left.push(word);
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
