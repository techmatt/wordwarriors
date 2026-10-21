/**
 * Item 059: Matt's bug-hunt categories that a static scan can hold for every
 * line (American spelling), and the checker's own checks (tests/qa/wording.ts)
 * on the examples he found.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { britishIn, clippedIn, giveawayIssues } from '../qa/wording';

const LINES: { id: string; text: string; say?: string }[] = JSON.parse(readFileSync('content/voice/lines.json', 'utf8'));

test('spelling: no line says or shows a British spelling (item 059: PRACTISE)', () => {
  assert.deepEqual(britishIn('Time to PRACTISE your favourite colour!'), ['PRACTISE → practice', 'favourite → favorite', 'colour → color']);
  const bad = LINES.flatMap((l) => britishIn(`${l.text} ${l.say ?? ''}`).map((b) => `${l.id}: ${b}`));
  assert.deepEqual(bad, []);
});

test('clipped lines: TOO STRONG, LET GO is clipped; whole sentences and everyday exclamations are not', () => {
  assert.ok(clippedIn('Too strong, let go!'));
  assert.equal(clippedIn("It's too strong! Let's go and get ready!"), null);
  assert.equal(clippedIn('Wow! You did it!'), null);
  assert.equal(clippedIn('Now read the whole spell!'), null);
  assert.equal(clippedIn("Before we head out, let's grab the..."), null);
});

test('giveaway: a picture with its own word printed beside it is a bug (item 059: the entry hall\'s VAN)', () => {
  const layout = {
    texts: [{ scene: 'Entry', text: 'VAN', b: [100, 210, 160, 240] as [number, number, number, number], depth: 300, group: 1, size: 28 }],
    images: [{ scene: 'Entry', key: 'pic_van', b: [80, 100, 180, 200] as [number, number, number, number], depth: 300 }],
    spots: [],
    targets: [],
    covers: [],
    hudDepth: 1000,
  };
  assert.equal(giveawayIssues(layout, 'Entry').length, 1);
  assert.equal(giveawayIssues({ ...layout, texts: [] }, 'Entry').length, 0);
  // The victory recap shows the words she read beside their pictures on purpose.
  assert.equal(giveawayIssues(layout, 'Victory').length, 0);
});
