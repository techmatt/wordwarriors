/**
 * Item 144 (M72): two tabs. Another tab's write reaches this one through the `storage` event
 * (src/state/progress.ts), and `reload()` re-reads the store, so this tab's next write builds on it.
 * `npx tsx --test tests/unit/storeTabs.test.ts`.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ProgressStore, STORE_KEY } from '../../src/state/ProgressStore';
import { memory } from './seeds';

test('a stale tab reloaded on the other tab\'s write keeps both tabs\' episodes', () => {
  const storage = memory();
  const a = new ProgressStore(storage);
  const b = new ProgressStore(storage);
  a.record('words', 'cat', true, 0);
  a.episodeDone();
  b.reload();
  b.record('words', 'dog', false, 1);
  const saved = new ProgressStore(storage);
  assert.equal(saved.stat('words', 'cat').seen, 1, "tab a's read survives tab b's write");
  assert.equal(saved.stat('words', 'dog').seen, 1);
  assert.equal(saved.snapshot().episodes, 1);
  // This page load's column stays this tab's own.
  assert.equal(b.stat('words', 'cat', 'session').seen, 0);
  assert.equal(b.stat('words', 'dog', 'session').seen, 1);
});

test('reload: an unreadable blob is ignored, an erased store starts empty, a held store comes back to the fresh one', () => {
  const storage = memory();
  const store = new ProgressStore(storage);
  store.record('words', 'cat', true, 0);
  // A newer build's blob: this tab keeps what it has and writes no more over it (review, item 144).
  const newer = JSON.stringify({ version: 99 });
  storage.setItem(STORE_KEY, newer);
  store.reload();
  assert.equal(store.stat('words', 'cat').seen, 1);
  store.record('words', 'hat', true, 0);
  assert.equal(storage.getItem(STORE_KEY), newer, "the newer build's store is not written over");
  assert.deepEqual([...storage.data.keys()], [STORE_KEY]);

  // Another tab's write during a debug game: the game keeps its sandbox, release comes back to the other tab's store.
  const other = new ProgressStore(memory());
  other.record('words', 'sun', true, 0);
  storage.setItem(STORE_KEY, JSON.stringify(other.snapshot()));
  store.hold();
  store.record('words', 'dog', true, 0);
  store.reload();
  assert.equal(store.stat('words', 'dog').seen, 1, 'the game under test still reads what it recorded');
  store.release();
  assert.equal(store.stat('words', 'sun').seen, 1);
  assert.equal(store.stat('words', 'dog').seen, 0);
  assert.equal(store.stat('words', 'cat').seen, 0);

  // Site data cleared in another tab: no blob, an empty store.
  const cleared = memory();
  const fresh = new ProgressStore(cleared);
  fresh.record('words', 'cat', true, 0);
  cleared.data.delete(STORE_KEY);
  fresh.reload();
  assert.equal(fresh.stat('words', 'cat').seen, 0);
  assert.equal(fresh.stat('words', 'cat', 'session').seen, 0, "today's column goes with an erase");
});

test('reload: an erase in another tab (F8 twice) clears this tab\'s session column too', () => {
  const storage = memory();
  const a = new ProgressStore(storage);
  const b = new ProgressStore(storage);
  a.record('words', 'cat', true, 0);
  a.episodeDone();
  b.reload();
  b.record('words', 'dog', true, 0);
  a.reload();
  a.reset();
  b.reload();
  assert.equal(b.stat('words', 'dog').seen, 0);
  assert.equal(b.stat('words', 'dog', 'session').seen, 0);
});
