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

import { VARIETY } from '../config';

export const STORE_KEY = 'wordwarriors.progress';
const STORE_VERSION = 1;

export interface Stat {
  seen: number;
  right: number;
  /** Wrong tries (a round can have several before the right one). */
  wrong: number;
  /** Rolling record of the last few first tries: true = right first time. */
  recent: boolean[];
  last: number;
  /**
   * Said with the helper, not read by her (item 106: Charge the Spell with no
   * Dad to judge). Counted apart: seen, right, wrong and recent (so
   * shakiness and the bags) never see it. Absent in an older blob.
   */
  modelled?: number;
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
  /**
   * The home warm-up (item 033): per word, first-try grabs. A grab is exposure,
   * not a read: it never touches `words` or the word bag.
   */
  grabs: Record<string, Stat>;
  /** The warm-up's ramp level per word (1 and 2 sounds with the letters, 3 sounds; amendment 1549; no names since item 137); absent = GRAB.startLevel. */
  grabLevels: Record<string, number>;
  /**
   * The Stretchy Bridge (item 054): per word, its help level (1 the stones
   * sound themselves and the pictures show, 2 silent stones, 3 she says the
   * word to Dad before the pictures come); absent = BRIDGE.startLevel. Her
   * reads there are recorded under `words`.
   */
  bridgeLevels: Record<string, number>;
  /**
   * The Shape-Shifter (item 096): per word, its help level (1 the changed
   * letter lit and the stones sounding as she comes near, 2 lit but silent,
   * 3 nothing lit); absent = SHIFTER.startLevel. Her reads are under `words`.
   */
  shifterLevels?: Record<string, number>;
  /**
   * The rhyme room (item 139): per word, its help level (1 the helper sounds
   * the printed word out unasked, 2 and 3 only on yellow); absent =
   * RHYME.startLevel. Her reads are under `words`, the family under `rimes`.
   */
  rhymeLevels?: Record<string, number>;
  /** Her word bag: the sentence key words drawn without replacement (item 015). */
  bag: WordBag;
  /** The bag words the game had when `bag` was last topped up (`topUpBag`); `'legacy'` for a blob from before item 035. */
  bagKnown?: string[] | 'legacy';
  /** Her move bag: the battle's move words, drawn the same way (item 018). */
  moveBag: WordBag;
  /** The wrong move pads (item 038): a word leaves when a choice has shown it, so they rotate across episodes. */
  padBag: WordBag;
  episodes: number;
  /**
   * Rotations remembered across episodes (item 067), per kind, newest last:
   * `villain` (persons, the last VILLAINS_KEPT), `ally`, `form_<dad>`, `rooms`,
   * `games`, `phonics` (the last phonics game played), `quest_<helper>`,
   * `scene_<helper>`, `line_<key>` (the story's line variants, src/rules/story.ts),
   * `line:<key>` (a narrator line's variant round, item 087,
   * src/episode/lineVariants.ts: a colon, not an underscore), `ending`;
   * `words` her latest right-first-time reads (VARIETY.words), which the
   * bank's draws lean away from. `rememberPlan` (src/episode/plans.ts) also
   * keeps `chains` (the Shape-Shifter's chains, CHAINS_KEPT), `shifter_door`
   * (whether door b had the Shape-Shifter), `story_fight_<person>` (whether a
   * drawn villain played their story fight, `storyKey`) and `last_episode_words`
   * (`LAST_READ`, src/rules/shifter.ts: every word the episode had her read).
   */
  recent: Record<string, string[]>;
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

/** Which bag: the sentence key words, the battle's right move words, or its wrong pads. */
export type BagKind = 'keys' | 'moves' | 'pads';

export type ItemKind = 'sounds' | 'words' | 'spelling' | 'frames' | 'rimes' | 'onsets' | 'grabs';

const RECENT = 6;

function emptyStat(): Stat {
  return { seen: 0, right: 0, wrong: 0, recent: [], last: 0 };
}

function empty(): ProgressData {
  return { version: STORE_VERSION, sounds: {}, words: {}, spelling: {}, frames: {}, rimes: {}, onsets: {}, grabs: {}, grabLevels: {}, bridgeLevels: {}, bag: { left: [], round: 0 }, moveBag: { left: [], round: 0 }, padBag: { left: [], round: 0 }, episodes: 0, recent: {} };
}

/** How many past villains the store keeps. */
const VILLAINS_KEPT = 4;

/** Fields an older blob may still carry, moved into `recent` (item 076) or dropped (item 078) on load. */
interface LegacyData {
  /** Item 025's recent villains, newest last: now `recent.villain`. */
  villains?: string[];
  /** Item 027's last victory scene: now `recent.ending`. */
  ending?: string | null;
  /** Item 053's Charge the Spell help level per sound, unused since item 059. */
  chargeLevels?: Record<string, number>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * The page's localStorage, or null where there is none or the browser blocks it (hunt 11: a blocked site's
 * `localStorage` getter throws a SecurityError, and the game never booted: a blank page).
 */
function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export class ProgressStore {
  private data: ProgressData;
  private session: ProgressData = empty();

  constructor(
    private readonly storage: StorageLike | null = defaultStorage(),
    private readonly now: () => number = Date.now,
  ) {
    this.data = this.read();
  }

  private read(): ProgressData {
    let raw: string | null | undefined;
    try {
      raw = this.storage?.getItem(STORE_KEY);
    } catch {
      // Blocked site storage (hunt 11): the game plays without saving.
      return empty();
    }
    if (!raw) return empty();
    const parsed = this.parse(raw);
    if (parsed) return parsed;
    try {
      this.storage?.setItem(`${STORE_KEY}.unreadable.${this.now()}`, raw);
    } catch {
      // Storage full or blocked: the old blob is not kept.
    }
    return empty();
  }

  /**
   * Another tab wrote the store (item 144, M72: the `storage` listener in src/state/progress.ts). Lifetime is
   * re-read, so this tab's next write builds on the other's episodes instead of writing back over them; the
   * session column (this page load's) stays. Everything the store hands out is a copy or read at once, so a
   * running scene keeps its plan and its later records land on the fresh data. A blob this build cannot read
   * (a newer version) is left alone: this tab keeps what it has and writes no more, so it never writes over a
   * newer build's store. An erased one (no blob, or fewer episodes than this tab had: only an erase lowers the
   * count) starts empty, today's column too, as `reset()` does. During a debug game (`hold`) it is what
   * `release()` comes back to, the game under test keeping its sandbox.
   */
  reload(): void {
    let raw: string | null | undefined;
    try {
      raw = this.storage?.getItem(STORE_KEY);
    } catch {
      return;
    }
    const fresh = raw ? this.parse(raw) : empty();
    if (!fresh) {
      this.readOnly = true;
      return;
    }
    this.readOnly = false;
    const erased = !raw || fresh.episodes < (this.held?.data ?? this.data).episodes;
    if (this.held) {
      this.held.data = fresh;
      if (erased) this.held.session = empty();
    } else {
      this.data = fresh;
      if (erased) this.session = empty();
    }
  }

  /** Set once another tab wrote a blob this build cannot read (`reload`): this tab stops writing over it. */
  private readOnly = false;

  /** A stored blob, brought up to date, or null when it is not this version's or not JSON. */
  private parse(raw: string): ProgressData | null {
    try {
      const parsed = JSON.parse(raw) as ProgressData & LegacyData;
      if (parsed.version !== STORE_VERSION) throw new Error(`version ${parsed.version}`);
      parsed.sounds ??= {};
      parsed.words ??= {};
      parsed.spelling ??= {};
      // Added in v0.2 without a version bump: an older blob simply has none yet.
      parsed.frames ??= {};
      // Item 015, the same way: an empty bag with round 0 fills on the first draw.
      parsed.bag ??= { left: [], round: 0 };
      parsed.moveBag ??= { left: [], round: 0 };
      // Item 038, the same way.
      parsed.padBag ??= { left: [], round: 0 };
      parsed.episodes ??= 0;
      // Item 026, the same way.
      parsed.rimes ??= {};
      parsed.onsets ??= {};
      // Item 033, the same way.
      parsed.grabs ??= {};
      parsed.grabLevels ??= {};
      // Item 054, the same way.
      parsed.bridgeLevels ??= {};
      // Item 067, the same way: her last victory scene (item 027's `ending`) seeds its rotation.
      parsed.recent ??= parsed.ending ? { ending: [parsed.ending] } : {};
      // Item 076: item 025's own villain list joins the rotations.
      if (parsed.villains?.length && !parsed.recent.villain) parsed.recent.villain = parsed.villains.slice(-VILLAINS_KEPT);
      delete parsed.villains;
      delete parsed.ending;
      // Item 078: Charge the Spell's help ramp (item 053, unused since 059) is gone.
      delete parsed.chargeLevels;
      // Item 035: a blob with no `bagKnown` knew the bag words before MUG RUG JUG.
      parsed.bagKnown ??= 'legacy';
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Minigame debug mode (item 086, src/episode/debug.ts): between `hold()` and
   * `release()` the store records as usual (the game under test reads it) but
   * saves nothing, and `release()` puts lifetime and session back as they were.
   */
  private held: { data: ProgressData; session: ProgressData } | null = null;

  hold(): void {
    if (this.held) return;
    this.held = { data: this.snapshot(), session: this.sessionSnapshot() };
  }

  release(): void {
    if (!this.held) return;
    this.data = this.held.data;
    this.session = this.held.session;
    this.held = null;
  }

  /** Read the store as it was before `hold()` (the grown-ups page opened during a debug game shows none of it). */
  outsideHold<T>(f: () => T): T {
    if (!this.held) return f();
    const now = { data: this.data, session: this.session };
    this.data = this.held.data;
    this.session = this.held.session;
    try {
      return f();
    } finally {
      this.data = now.data;
      this.session = now.session;
    }
  }

  private save(): void {
    if (this.held) return;
    this.write();
  }

  private write(): void {
    if (this.readOnly) return;
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
    // Item 067: a word read right first time joins her latest reads, which the draws lean away
    // from; a missed one leaves them, so it keeps its full weight.
    if (kind === 'words') {
      const was = (this.data.recent.words ?? []).filter((w) => w !== id);
      this.data.recent.words = firstTry ? [...was, id].slice(-VARIETY.words) : was;
    }
    this.save();
  }

  /** She said an item along with the helper (item 106): counted as modelled, never as a read. */
  model(kind: ItemKind, id: string): void {
    for (const d of [this.data, this.session]) {
      const s = (d[kind][id] ??= emptyStat());
      s.modelled = (s.modelled ?? 0) + 1;
    }
    this.save();
  }

  /** A rotation's recent picks, newest last (item 067; `recent` in ProgressData). */
  recentOf(kind: string): string[] {
    return [...(this.data.recent[kind] ?? [])];
  }

  /** An episode used `id` for rotation `kind`: kept (the latest `keep`) so the next episodes differ. */
  remember(kind: string, id: string, keep: number = VARIETY.rotations): void {
    const was = (this.data.recent[kind] ?? []).filter((x) => x !== id);
    this.data.recent[kind] = [...was, id].slice(-Math.max(1, keep));
    this.save();
  }

  episodeDone(): void {
    this.data.episodes++;
    this.session.episodes++;
    this.save();
  }

  /** An episode was cast with this villain (a person): the last VILLAINS_KEPT are kept (`recent.villain`) so the next ones differ. */
  villainMet(person: string): void {
    this.remember('villain', person, VILLAINS_KEPT);
  }

  /** A word's warm-up level (item 033), or `fallback` (GRAB.startLevel) if she has never grabbed it. */
  grabLevel(word: string, fallback: number): number {
    return this.data.grabLevels[word] ?? fallback;
  }

  setGrabLevel(word: string, level: number): void {
    this.data.grabLevels[word] = level;
    this.save();
  }

  /** A word's Stretchy Bridge help level (item 054), or `fallback` (BRIDGE.startLevel) if she has never crossed with it. */
  bridgeLevel(word: string, fallback: number): number {
    return this.data.bridgeLevels[word] ?? fallback;
  }

  setBridgeLevel(word: string, level: number): void {
    this.data.bridgeLevels[word] = level;
    this.save();
  }

  /** A word's Shape-Shifter help level (item 096), or `fallback` (SHIFTER.startLevel) if she has never met it there. */
  shifterLevel(word: string, fallback: number): number {
    return this.data.shifterLevels?.[word] ?? fallback;
  }

  setShifterLevel(word: string, level: number): void {
    (this.data.shifterLevels ??= {})[word] = level;
    this.save();
  }

  /** A word's rhyme-room help level (item 139), or `fallback` (RHYME.startLevel) if she has never met it there. */
  rhymeLevel(word: string, fallback: number): number {
    return this.data.rhymeLevels?.[word] ?? fallback;
  }

  setRhymeLevel(word: string, level: number): void {
    (this.data.rhymeLevels ??= {})[word] = level;
    this.save();
  }

  private bagField(which: BagKind): 'bag' | 'moveBag' | 'padBag' {
    return which === 'keys' ? 'bag' : which === 'moves' ? 'moveBag' : 'padBag';
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

  /**
   * Words new to the game (item 035's MUG RUG JUG) join her key-word round
   * already under way, so she meets them this round, not after the bag
   * empties. `catalogue` is every bag word the game has now; `bagKnown`
   * remembers the catalogue last seen, and a blob saved before item 035
   * (`'legacy'`) knew `legacy`. A word in neither goes into the bag (item
   * 037's words, from a blob that remembers 035's catalogue). A word the game
   * no longer has leaves the bag, so a bag of only such words counts as
   * empty and refills.
   */
  topUpBag(catalogue: string[], legacy: string[]): void {
    const was = this.data.bagKnown;
    const known = was === 'legacy' ? legacy : (was ?? catalogue);
    const b = this.data.bag;
    const add = b.round ? catalogue.filter((w) => !known.includes(w) && !b.left.includes(w)) : [];
    const gone = b.left.filter((w) => !catalogue.includes(w));
    b.left = [...b.left.filter((w) => catalogue.includes(w)), ...add];
    const changed = add.length > 0 || gone.length > 0 || !was || was === 'legacy' || catalogue.some((w) => !was.includes(w));
    this.data.bagKnown = [...catalogue];
    if (changed) this.save();
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
    // Today's column too: an erase that left it showed counts for words with none (item 039).
    this.session = empty();
    // Erased during a debug game (item 086): erased for good, not put back on release.
    if (this.held) this.held = { data: empty(), session: empty() };
    // An erase is meant: it writes even over a blob another tab's newer build left (item 144).
    this.readOnly = false;
    this.write();
  }
}
