/**
 * Item 186's one-time merge: two copies of the store (an older history, then play that started from an empty
 * store on another origin) as one, written as the save file the dev server keeps
 * (src/state/saveFileServer.ts). Both inputs are copied beside it first, untouched.
 *
 *   npx tsx tests/progress/merge.ts <older.json> <newer.json> [<save folder>]
 *
 * The folder defaults to the dev server's (`saveDir`, here forced on). An existing save file is refused:
 * this is for seeding the file, not for overwriting play. Under tests/ rather than tools/ because it reads
 * blobs through the game's own store, which tools/' NodeNext build cannot import.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { ProgressStore, STORE_KEY, type Stat, type StorageLike } from '../../src/state/ProgressStore';
import { mergeProgress } from '../../src/state/saveFile';
import { SAVE_FILE, saveDir } from '../../src/state/saveFileServer';

/** A blob as this build's store reads it (brought up to date), through a throwaway in-memory storage. */
function load(path: string) {
  const raw = readFileSync(path, 'utf8');
  const mem = new Map<string, string>([[STORE_KEY, raw]]);
  const storage: StorageLike = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) };
  const data = new ProgressStore(storage).snapshot();
  // The store sets an unreadable blob aside under `<key>.unreadable.<ms>` and starts empty: never merge that.
  if ([...mem.keys()].some((k) => k.startsWith(`${STORE_KEY}.unreadable`))) throw new Error(`${path}: unreadable as this build's store`);
  return data;
}

const [olderPath, newerPath, dirArg] = process.argv.slice(2);
if (!olderPath || !newerPath) {
  console.error('usage: npx tsx tests/progress/merge.ts <older.json> <newer.json> [<save folder>]');
  process.exit(2);
}
const dir = dirArg ?? saveDir(process.cwd(), { ...process.env, WW_PROGRESS_MIRROR: '1' });
if (!dir) throw new Error('no save folder: give one, or set WW_DATA_DIR');
const file = join(dir, SAVE_FILE);
if (existsSync(file)) throw new Error(`${file} exists: refusing to write over it`);

const older = load(olderPath);
const newer = load(newerPath);
const merged = mergeProgress(older, newer);
merged.savedAt = Date.now();

mkdirSync(dir, { recursive: true });
copyFileSync(olderPath, join(dir, `merged-from-older-${basename(olderPath)}`));
copyFileSync(newerPath, join(dir, `merged-from-newer-${basename(newerPath)}`));
writeFileSync(file, JSON.stringify(merged), 'utf8');

const count = (d: typeof merged) => Object.values(d.words).reduce((n, s: Stat) => n + s.seen, 0);
console.log(`episodes ${older.episodes} + ${newer.episodes} = ${merged.episodes}`);
console.log(`word reads ${count(older)} + ${count(newer)} = ${count(merged)}; words ${Object.keys(merged.words).length}`);
console.log(`key bag: older ${older.bag.left.length} left (round ${older.bag.round}) -> ${merged.bag.left.length} left (round ${merged.bag.round})`);
console.log(`wrote ${file}`);
