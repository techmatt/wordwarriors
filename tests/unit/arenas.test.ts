/**
 * Item 134: every arena a battle can use names its own ambience (the type
 * requires one; the fallback is only for a key outside ARENAS), and the
 * ambience candidates each play in a real arena.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FIGHTS } from '../../content/battle/fights';
import { AMBIENCE_TRIALS, ARENAS, ROSTER } from '../../content/battle/roster';

test('arenas: every arena a battle uses is an ARENAS key with an ambience', () => {
  const used = new Set([...ROSTER.map((c) => c.arena), ...FIGHTS.flatMap((f) => (f.arena ? [f.arena] : []))]);
  for (const a of used) {
    assert.ok(ARENAS[a], `${a} is an ARENAS key`);
    assert.ok(ARENAS[a]!.ambience.tint.length, `${a}: its ambience has a tint`);
  }
});

test('arenas: ambience candidates play in an ARENAS arena, two or three each', () => {
  const per = new Map<string, number>();
  for (const [id, t] of Object.entries(AMBIENCE_TRIALS)) {
    assert.ok(ARENAS[t.arena], `${id}: arena ${t.arena} is an ARENAS key`);
    assert.match(id, new RegExp(`^${t.arena}_\\d+$`), `${id}: named <arena>_<n>`);
    per.set(t.arena, (per.get(t.arena) ?? 0) + 1);
  }
  for (const [a, n] of per) assert.ok(n >= 2 && n <= 3, `${a}: ${n} candidates`);
});
