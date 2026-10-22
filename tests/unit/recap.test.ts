/**
 * The victory recap's cut (src/rules/recap.ts): which words stay on its nine
 * cards when she read more.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { recapWords } from '../../src/rules/recap';

test('recap (hunt 6): a bridge and a Shape-Shifter (twelve words read) keep the gift, every move word, the counter and each room\'s last word', () => {
  const read = ['egg', 'map', 'mug', 'cat', 'bat', 'bag', 'bug', 'zap', 'hop', 'hat', 'dig', 'run'];
  const words = recapWords({ read, gift: 'zap', moves: ['zap', 'hop', 'dig', 'run'], counter: 'hat', keys: ['mug', 'bug'] });
  assert.equal(words.length, 9);
  for (const w of ['zap', 'hop', 'hat', 'dig', 'run', 'mug', 'bug']) assert.ok(words.includes(w), w);
  // In the order she read them, the earliest of the rest first.
  assert.deepEqual(words, read.filter((w) => words.includes(w)));
  assert.deepEqual(words.slice(0, 2), ['egg', 'map']);
});

test('recap: nine words or fewer are all shown', () => {
  const read = ['cat', 'zap', 'hop', 'hat'];
  assert.deepEqual(recapWords({ read, gift: 'zap', moves: ['zap', 'hop'], counter: 'hat', keys: ['cat'] }), read);
});
