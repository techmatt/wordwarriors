/**
 * Every seeded draw comes out as it did before the pool was refactored by kind
 * (item 091): same rooms, games, words and order, and the same store after.
 * The cases: tests/unit/plansGolden.ts; the expected draws: plansGolden.json.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { goldenDraws } from './plansGolden';

const EXPECTED: Record<string, string> = JSON.parse(readFileSync(new URL('./plansGolden.json', import.meta.url), 'utf8'));

test('seeded draws: episodePlans and drawGames draw exactly as before, every kind behind every door', () => {
  const got = goldenDraws();
  assert.deepEqual(Object.keys(got), Object.keys(EXPECTED));
  for (const [k, v] of Object.entries(EXPECTED)) assert.equal(got[k], v, k);
});
