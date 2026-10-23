/**
 * The Shape-Shifter's 200 seeded draws (hunt 6), from tests/unit/shifter.test.ts: about 3 s,
 * the unit run's longest test, so its own file runs beside the rest (item 105).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NO_ARTICLE, NUMBER_WORDS, lookalikesOf } from '../../content/phonics/sentences';
import { planShifter, shifterWords } from '../../src/rules/shifter';
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

test('planShifter (hunt 7, fix 125): her recent reads spread the chains across episodes, at full length', () => {
  // Six episodes back to back, each chain's words read right first time: a later chain holds at
  // most one word read lately where four links allow it (45 of 100 shared a word with the
  // episode before, MAT MAN PAN three in four; 25 since).
  let shared = 0;
  let pairs = 0;
  let links = 0;
  for (let run = 1; run <= 10; run++) {
    const store = new ProgressStore(memory());
    const rand = seeded(spread(run));
    let before: string[] = [];
    for (let e = 0; e < 6; e++) {
      const p = planShifter(store, { avoid: [], taken: [] }, rand)!;
      const words = shifterWords(p);
      links += words.length;
      if (e > 0) {
        pairs++;
        if (words.some((w) => before.includes(w))) shared++;
      }
      for (const w of words) store.record('words', w, true, 0);
      before = words;
    }
  }
  assert.ok(shared / pairs <= 0.35, `${shared} of ${pairs} episodes shared a chain word with the one before`);
  assert.equal(links, 10 * 6 * 4, 'every chain four links');
});
