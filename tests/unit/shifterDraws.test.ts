/**
 * The Shape-Shifter's 200 seeded draws (hunt 6), from tests/unit/shifter.test.ts: about 3 s,
 * the unit run's longest test, so its own file runs beside the rest (item 105).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NUMBER_WORDS, lookalikesOf } from '../../content/phonics/sentences';
import { NO_ARTICLE } from '../../src/rules/sentences';
import { planShifter } from '../../src/rules/shifter';
import { ProgressStore } from '../../src/state/ProgressStore';
import { memory, seeded, spread } from './seeds';

test('planShifter (hunt 6): no link joins two look-alikes, no read-it picture is a look-alike of the word read, and it never starts as a number', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const p = planShifter(new ProgressStore(memory()), { avoid: [], taken: [] }, seeded(spread(seed)))!;
    for (const l of p.links) {
      assert.ok(!lookalikesOf(l.from).includes(l.to), `seed ${seed}: ${l.from} to ${l.to}`);
      if (l.beat === 'read') for (const o of l.options) assert.ok(!lookalikesOf(l.to).includes(o), `seed ${seed}: ${o} beside ${l.to}`);
    }
    // "It starts as a...": never a number (M23) or a word that takes no A.
    assert.ok(!NUMBER_WORDS.has(p.start) && !NO_ARTICLE.has(p.start), `seed ${seed}: starts as a ${p.start}`);
  }
});
