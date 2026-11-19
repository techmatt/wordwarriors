/**
 * The save file's rules (item 186), pure: which of two copies of the store wins at boot, and the one-time
 * merge of two histories. The dev server keeps the file (src/state/saveFileServer.ts); the page fetches it
 * (src/state/mirror.ts); `tests/progress/merge.ts` merged :5174's history with :5240's.
 */

import type { ProgressData, Stat, WordBag } from './ProgressStore';

/**
 * Of a browser's storage keys, the replaced copies (`<prefix><ms>`) to drop so only the newest `keep` stay (item
 * 196: each ~35 KB, and the aside file beside the save file holds every one).
 */
export function staleReplaced(keys: readonly string[], prefix: string, keep: number): string[] {
  const ms = (k: string) => Number(k.slice(prefix.length)) || 0;
  return keys.filter((k) => k.startsWith(prefix)).sort((a, b) => ms(b) - ms(a)).slice(keep);
}

/** A blob's episodes and save time, or null when it is empty or not JSON. */
function facts(raw: string | null): { episodes: number; savedAt: number } | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<ProgressData>;
    return { episodes: d.episodes ?? 0, savedAt: d.savedAt ?? 0 };
  } catch {
    return null;
  }
}

/**
 * Which copy the game boots from: `file` (the save file replaces the browser's), `local` (the browser's
 * goes to the file) or `same` (nothing to do). An empty or unreadable copy loses. Two stamped copies: the
 * later write wins, so an erase on the grown-ups page sticks. Otherwise (a copy from before item 186 has
 * no stamp) the one with more episodes wins, and a tie keeps the browser's.
 */
export function chooseProgress(local: string | null, file: string | null): 'file' | 'local' | 'same' {
  const l = facts(local);
  const f = facts(file);
  if (!f) return l ? 'local' : 'same';
  if (!l) return 'file';
  if (local === file) return 'same';
  if (l.savedAt && f.savedAt) return f.savedAt > l.savedAt ? 'file' : f.savedAt < l.savedAt ? 'local' : 'same';
  if (f.episodes !== l.episodes) return f.episodes > l.episodes ? 'file' : 'local';
  return f.savedAt > l.savedAt ? 'file' : 'local';
}

const RECENT = 6;

function mergeStat(a: Stat | undefined, b: Stat | undefined): Stat {
  if (!a) return structuredClone(b!);
  if (!b) return structuredClone(a);
  const s: Stat = {
    seen: a.seen + b.seen,
    right: a.right + b.right,
    wrong: a.wrong + b.wrong,
    recent: [...a.recent, ...b.recent].slice(-RECENT),
    last: Math.max(a.last, b.last),
  };
  if (a.modelled !== undefined || b.modelled !== undefined) s.modelled = (a.modelled ?? 0) + (b.modelled ?? 0);
  return s;
}

function mergeStats(a: Record<string, Stat> = {}, b: Record<string, Stat> = {}): Record<string, Stat> {
  const out: Record<string, Stat> = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) out[id] = mergeStat(a[id], b[id]);
  return out;
}

/** A help ramp's levels: the higher per word (the newer copy restarted every ramp from the bottom). */
function mergeLevels(a: Record<string, number> = {}, b: Record<string, number> = {}): Record<string, number> {
  const out = { ...a };
  for (const [w, l] of Object.entries(b)) out[w] = Math.max(out[w] ?? l, l);
  return out;
}

/** The newer copy's picks replayed onto the older's as `remember` makes them, keeping the longer list's length. */
function mergeRecent(a: Record<string, string[]>, b: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = structuredClone(a);
  for (const [kind, ids] of Object.entries(b)) {
    let list = out[kind] ?? [];
    for (const id of ids) list = [...list.filter((x) => x !== id), id];
    out[kind] = list.slice(-Math.max(1, ids.length, a[kind]?.length ?? 0));
  }
  return out;
}

/**
 * The older copy's bag, less what the newer copy's play took out. The newer copy started from nothing, so a
 * word it has taken out is one its catalogue (`known`) holds and its bag no longer does.
 */
function mergeBag(older: WordBag, newer: WordBag, known: string[]): WordBag {
  if (newer.round > 1) return structuredClone(newer);
  const taken = new Set(known.filter((w) => !newer.left.includes(w)));
  return { left: older.left.filter((w) => !taken.has(w)), round: older.round };
}

/** All the words a fresh bag held: what is left plus every word the copy has read (only those can leave). */
function bagWords(d: ProgressData, bag: WordBag): string[] {
  return [...new Set([...bag.left, ...Object.keys(d.words)])];
}

/**
 * Two histories as one (item 186): `older` played first, `newer` started from an empty store afterwards.
 * Counts add up; recent tries and rotations run older then newer; levels take the higher; the bags keep the
 * older round less what the newer took out; anything kept whole (the bag catalogue) is the newer's.
 */
export function mergeProgress(older: ProgressData, newer: ProgressData): ProgressData {
  const m: ProgressData = {
    version: newer.version,
    sounds: mergeStats(older.sounds, newer.sounds),
    words: mergeStats(older.words, newer.words),
    spelling: mergeStats(older.spelling, newer.spelling),
    frames: mergeStats(older.frames, newer.frames),
    rimes: mergeStats(older.rimes, newer.rimes),
    onsets: mergeStats(older.onsets, newer.onsets),
    grabs: mergeStats(older.grabs, newer.grabs),
    grabLevels: mergeLevels(older.grabLevels, newer.grabLevels),
    bridgeLevels: mergeLevels(older.bridgeLevels, newer.bridgeLevels),
    shifterLevels: mergeLevels(older.shifterLevels, newer.shifterLevels),
    rhymeLevels: mergeLevels(older.rhymeLevels, newer.rhymeLevels),
    bag: mergeBag(older.bag, newer.bag, bagWords(newer, newer.bag)),
    moveBag: mergeBag(older.moveBag, newer.moveBag, bagWords(newer, newer.moveBag)),
    padBag: mergeBag(older.padBag, newer.padBag, bagWords(newer, newer.padBag)),
    episodes: older.episodes + newer.episodes,
    recent: mergeRecent(older.recent ?? {}, newer.recent ?? {}),
  };
  const known = newer.bagKnown ?? older.bagKnown;
  if (known !== undefined) m.bagKnown = known;
  return m;
}
