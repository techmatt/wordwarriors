/**
 * Item 134: every arena a battle can use names its own ambience (the type
 * requires one; the fallback is only for a key outside ARENAS); item 136: the
 * nursery and the street play Matt's picks, not the meadow's sparkles.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FIGHTS } from '../../content/battle/fights';
import { ARENAS, ROSTER } from '../../content/battle/roster';

test('arenas: every arena a battle uses is an ARENAS key with an ambience', () => {
  const used = new Set([...ROSTER.map((c) => c.arena), ...FIGHTS.flatMap((f) => (f.arena ? [f.arena] : []))]);
  for (const a of used) {
    assert.ok(ARENAS[a], `${a} is an ARENAS key`);
    assert.ok(ARENAS[a]!.ambience.tint.length, `${a}: its ambience has a tint`);
  }
});

test("arenas: the nursery's toy blocks and the street's leaves (Matt's picks from item 134's round)", () => {
  assert.equal(ARENAS.nursery!.ambience.tex, 'block');
  assert.equal(ARENAS.street!.ambience.tex, 'leaf');
  assert.ok(ARENAS.street!.ambience.fromLeft, 'the leaves blow in on a breeze');
});
