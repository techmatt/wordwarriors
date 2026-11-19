/**
 * Item 186: the save file. Which copy wins at boot, the one-time merge, the store's stamp and hooks, and the
 * dev server's folder (daily backup, a stale save refused, the main-checkout guard).
 * `npx tsx --test tests/unit/saveFile.test.ts`.
 */

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { ProgressStore, STORE_KEY, type ProgressData } from '../../src/state/ProgressStore';
import { chooseProgress, mergeProgress, staleReplaced } from '../../src/state/saveFile';
import { SaveFolder, day, saveDir } from '../../src/state/saveFileServer';
import { memory } from './seeds';

const blob = (episodes: number, savedAt?: number) => JSON.stringify({ version: 1, episodes, ...(savedAt ? { savedAt } : {}) });

test('only the newest replaced copy stays in the browser (item 196)', () => {
  const p = `${STORE_KEY}.replaced.`;
  const keys = [STORE_KEY, `${p}9`, `${p}100`, `${p}20`, 'other'];
  assert.deepEqual(staleReplaced(keys, p, 1), [`${p}20`, `${p}9`], 'boot keeps the latest');
  assert.deepEqual(staleReplaced(keys, p, 0), [`${p}100`, `${p}20`, `${p}9`], 'a new copy drops every old one');
  assert.deepEqual(staleReplaced([STORE_KEY], p, 0), []);
});

test('boot keeps the newer copy: an empty one loses, stamps decide, else episodes', () => {
  assert.equal(chooseProgress(null, null), 'same');
  assert.equal(chooseProgress(null, blob(5, 10)), 'file', 'a fresh origin restores the file');
  assert.equal(chooseProgress(blob(5, 10), null), 'local', 'no file yet: the browser seeds it');
  assert.equal(chooseProgress(blob(5, 10), blob(5, 10)), 'same');
  assert.equal(chooseProgress(blob(9, 10), blob(5, 20)), 'file', 'a later save wins, an erase included');
  assert.equal(chooseProgress(blob(0, 30), blob(70, 20)), 'local', 'an erase in the browser sticks');
  assert.equal(chooseProgress(blob(3), blob(70, 20)), 'file', 'an unstamped copy with fewer episodes');
  assert.equal(chooseProgress(blob(67), blob(3, 20)), 'local', 'an unstamped copy with more episodes');
  assert.equal(chooseProgress('not json', blob(1, 1)), 'file');
});

test('the store stamps every write, tells onWrite, and replace takes a whole blob', () => {
  let t = 1000;
  const storage = memory();
  const store = new ProgressStore(storage, () => t);
  const seen: string[] = [];
  store.onWrite = (raw) => seen.push(raw);
  store.record('words', 'cat', true, 0);
  assert.equal(seen.length, 1);
  assert.equal((JSON.parse(storage.getItem(STORE_KEY)!) as ProgressData).savedAt, 1000);
  store.hold();
  store.record('words', 'dog', true, 0);
  assert.equal(seen.length, 1, 'a debug game sends nothing');
  store.release();

  t = 2000;
  const other = new ProgressStore(memory(), () => t);
  other.record('words', 'sun', false, 2);
  other.episodeDone();
  assert.ok(store.replace(JSON.stringify(other.snapshot())));
  assert.equal(store.stat('words', 'sun').wrong, 2);
  assert.equal(store.stat('words', 'cat').seen, 0);
  assert.equal(store.stat('words', 'sun', 'session').seen, 0, "today's column starts empty");
  assert.equal((JSON.parse(storage.getItem(STORE_KEY)!) as ProgressData).episodes, 1, 'saved to the browser at once');
  assert.equal(store.replace('{"version":99}'), false);
  assert.equal(store.stat('words', 'sun').wrong, 2, 'an unreadable blob changes nothing');

  // Item 194: a stale tab switches to the file during a debug game: the game keeps its sandbox, sends nothing,
  // and release() comes back to the file.
  store.hold();
  store.record('words', 'pig', true, 0);
  assert.ok(store.replace(JSON.stringify(other.snapshot())));
  store.record('words', 'hen', true, 0);
  assert.equal(seen.length, 1, 'still a debug game: nothing sent');
  assert.equal(store.stat('words', 'pig').seen, 1, 'the game under test keeps its sandbox');
  assert.equal((JSON.parse(storage.getItem(STORE_KEY)!) as ProgressData).words.pig, undefined, 'the browser holds the file, not the sandbox');
  store.release();
  assert.equal(store.stat('words', 'pig').seen, 0);
  assert.equal(store.stat('words', 'hen').seen, 0);
  assert.equal(store.stat('words', 'sun').wrong, 2, 'back to the file');
});

test('two histories merge: counts add, tries run older then newer, levels the higher, the bag less what was taken', () => {
  const a = new ProgressStore(memory(), () => 100);
  a.record('words', 'cat', false, 1);
  a.record('words', 'dog', true, 0);
  a.refillBag(['cat', 'dog', 'sun', 'pig']);
  a.takeFromBag('dog');
  a.setRampLevel('bridge', 'cat', 3);
  a.remember('villain', 'smaug', 4);
  a.remember('villain', 'tiamat', 4);
  a.remember('last_games', 'x y z', 1);
  a.episodeDone();
  a.episodeDone();
  const b = new ProgressStore(memory(), () => 200);
  b.refillBag(['cat', 'dog', 'sun', 'pig']);
  b.record('words', 'cat', true, 0);
  b.takeFromBag('cat');
  b.record('words', 'sun', false, 1);
  b.setRampLevel('bridge', 'cat', 1);
  b.setRampLevel('bridge', 'sun', 2);
  b.remember('villain', 'smaug', 4);
  b.remember('last_games', 'p q r', 1);
  b.episodeDone();

  const m = mergeProgress(a.snapshot(), b.snapshot());
  assert.equal(m.episodes, 3);
  assert.deepEqual(m.words.cat, { seen: 2, right: 2, wrong: 1, recent: [false, true], last: 200 });
  assert.equal(m.words.dog!.seen, 1);
  assert.equal(m.words.sun!.wrong, 1);
  assert.deepEqual(m.bridgeLevels, { cat: 3, sun: 2 });
  assert.deepEqual(m.recent.villain, ['tiamat', 'smaug'], 'replayed as remember makes them');
  assert.deepEqual(m.recent.last_games, ['p q r'], 'a kept-whole kind is the newer');
  assert.deepEqual(m.bag, { left: ['sun', 'pig'], round: 1 }, 'cat left on the newer, dog on the older');

  const s = new ProgressStore(memory());
  assert.ok(s.replace(JSON.stringify(m)), "the merged blob is one this build's store reads");
});

test('the save folder: a dated backup before the day\'s first write, a stale save refused, asides kept', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ww-save-'));
  try {
    let t = new Date(2026, 10, 16, 9).getTime();
    const f = new SaveFolder(join(dir, 'progress'), () => t);
    assert.equal(f.read(), null);
    assert.equal(f.write(blob(1, 10)), 'written');
    assert.equal(readdirSync(f.dir).filter((n) => n.startsWith('progress-')).length, 0, 'nothing to back up yet');
    assert.equal(f.write(blob(2, 20)), 'written');
    const backup = join(f.dir, `progress-${day(t)}.json`);
    assert.equal(readFileSync(backup, 'utf8'), blob(1, 10), "the day's backup holds the file as the day found it");
    assert.equal(f.write(blob(3, 30)), 'written');
    assert.equal(readFileSync(backup, 'utf8'), blob(1, 10), 'one backup a day');
    assert.equal(f.write(blob(9, 25)), 'stale');
    assert.equal(f.read(), blob(3, 30));
    assert.equal(f.write('nope'), 'bad');
    t += 24 * 3600 * 1000;
    assert.equal(f.write(blob(4, 40)), 'written');
    assert.equal(readFileSync(join(f.dir, `progress-${day(t)}.json`), 'utf8'), blob(3, 30));
    // Item 194: a stale tab's save carries a newer stamp of its own, but builds on a file older than this one.
    assert.equal(f.write(blob(9, 50), 30), 'stale', 'built on 30, the file is 40: another tab saved since');
    assert.equal(f.write(blob(5, 50), 40), 'written', 'built on the file as it is');
    assert.equal(f.write(blob(6, 45), 50), 'stale', 'its own stamp still older than the file');
    const name = f.aside(blob(3), 'localhost:5240');
    assert.match(name, /^aside-localhost_5240-/);
    assert.ok(existsSync(join(f.dir, name)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the mirror is on only in the main checkout unless forced, and off for every test server', () => {
  // This worktree's .git is a file; a test run sets WW_PROGRESS_MIRROR=0 (tests/servers.ts).
  const root = process.cwd();
  if (!statSync(join(root, '.git')).isDirectory()) assert.equal(saveDir(root, {}), null);
  assert.equal(saveDir(root, { WW_PROGRESS_MIRROR: '0' }), null);
  assert.equal(saveDir(root, { WW_PROGRESS_MIRROR: '1', WW_DATA_DIR: join(root, 'x') }), join(root, 'x'));
});
