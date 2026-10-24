/**
 * Hunt 6, M28: the battle's opening run of fetched things (src/rules/volleys.ts).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fetchBeats } from '../../src/rules/volleys';

test('fetchBeats: a room\'s earlier words one volley, its last its own beat; the warm-up\'s word its own', () => {
  // The warm-up (LAMP), a bridge (3) and a Shape-Shifter (4): eight things, five beats.
  const fetched = ['lamp', 'sun', 'map', 'fish', 'bat', 'bag', 'bug', 'mug'];
  const rooms = [['sun', 'map', 'fish'], ['bat', 'bag', 'bug', 'mug']];
  assert.deepEqual(fetchBeats(fetched, rooms), [['lamp'], ['sun', 'map'], ['fish'], ['bat', 'bag', 'bug'], ['mug']]);
  // A one-word room (the sentence game) is its own beat.
  assert.deepEqual(fetchBeats(['lamp', 'net', 'cat'], [['net'], ['cat']]), [['lamp'], ['net'], ['cat']]);
  // A room fired whole (Charge the Spell's two words, hunt 11, M62) is one volley, its last word in it.
  assert.deepEqual(fetchBeats(['lamp', 'sun', 'map', 'fish', 'hat', 'pig'], [['sun', 'map', 'fish'], { words: ['hat', 'pig'], whole: true }]), [
    ['lamp'],
    ['sun', 'map'],
    ['fish'],
    ['hat', 'pig'],
  ]);
  // Words the plans do not know (a `?fetched=` URL) each keep their beat, as before.
  assert.deepEqual(fetchBeats(['hat', 'pig'], []), [['hat'], ['pig']]);
  // Every fetched word fires once, in order.
  assert.deepEqual(fetchBeats(fetched, rooms).flat(), fetched);
});
