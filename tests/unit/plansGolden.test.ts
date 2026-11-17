/**
 * Every seeded draw comes out as plansGolden.json pins it: same rooms, games,
 * words and order, and the same store after. A refactor of the draw must leave
 * every case as it is; a deliberate draw change regenerates the JSON (`npm run golden`).
 * The cases: tests/unit/plansGolden.ts.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { goldenDraws } from './plansGolden';

const EXPECTED: Record<string, string> = JSON.parse(readFileSync(new URL('./plansGolden.json', import.meta.url), 'utf8'));

test('seeded draws: episodePlans and drawGames draw exactly as plansGolden.json pins, every kind behind every door', () => {
  const got = goldenDraws();
  assert.deepEqual(Object.keys(got), Object.keys(EXPECTED));
  for (const [k, v] of Object.entries(EXPECTED)) assert.equal(got[k], v, k);
});
