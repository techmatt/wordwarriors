import assert from 'node:assert/strict';
import { test } from 'node:test';

import { testStringFor } from '../../src/ui/glyphMetrics.js';

const BASE = '|MÉqgy';

test('text without emoji keeps the test string it had', () => {
  assert.equal(testStringFor(BASE, 'THE CAT SAT'), BASE);
  assert.equal(testStringFor(BASE, ''), BASE);
});

test('emoji join the test string once each, sequences whole', () => {
  assert.equal(testStringFor(BASE, '\u{1F3F0}'), `${BASE}\u{1F3F0}`);
  assert.equal(testStringFor(BASE, '⚔\uFE0F GO ⚔\uFE0F \u{1F3C6}'), `${BASE}⚔\uFE0F\u{1F3C6}`);
  assert.equal(testStringFor(BASE, '\u{1F468}\u200D\u{1F373}'), `${BASE}\u{1F468}\u200D\u{1F373}`);
});
