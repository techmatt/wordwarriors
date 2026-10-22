/**
 * Item 086: minigame debug mode's sandbox. Between `hold()` and `release()`
 * the store records (the game reads it) but saves nothing, and `release()`
 * puts lifetime and session back. `npx tsx --test tests/unit/debugHold.test.ts`.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ProgressStore, STORE_KEY, type StorageLike } from '../../src/state/ProgressStore';

function memory(): StorageLike {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

test('a held store records and draws as usual, saves nothing, and release puts it back as it was', () => {
  const storage = memory();
  const store = new ProgressStore(storage);
  store.record('words', 'cat', true, 0);
  store.refillBag(['cat', 'dog', 'sun']);
  const blob = storage.getItem(STORE_KEY);
  const lifetime = store.snapshot();
  const session = store.sessionSnapshot();

  store.hold();
  store.record('words', 'dog', false, 2);
  store.record('frames', 'go_get_the', true, 0);
  store.takeFromBag('dog');
  store.remember('games', 'charge');
  store.setBridgeLevel('dog', 3);
  assert.equal(store.stat('words', 'dog').seen, 1, 'the game under test reads what it recorded');
  assert.equal(storage.getItem(STORE_KEY), blob, 'nothing saved while held');

  store.release();
  assert.deepEqual(store.snapshot(), lifetime);
  assert.deepEqual(store.sessionSnapshot(), session, 'the grown-ups page\'s today column too');
  assert.equal(storage.getItem(STORE_KEY), blob);
  // Saving again after the release.
  store.record('words', 'sun', true, 0);
  assert.notEqual(storage.getItem(STORE_KEY), blob);
});
