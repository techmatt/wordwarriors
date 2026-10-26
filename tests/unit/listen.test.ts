/**
 * The listen-through page's words (item 161, src/listen/words.ts): together they
 * sound out every sound a live word sounds out, the hard sounds at least twice,
 * the newest takes' words first, and every line they play exists.
 * `npx tsx --test tests/unit/listen.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { LIVE } from '../../content/phonics/bank';
import { SOUND_BY_UNIT } from '../../content/phonics/letters';
import { letterSoundLine, wordLine } from '../../content/voice/ids';
import { FIRST, HARD, HARD_TIMES, listenWords, liveSoundKeys, loneSoundKeys } from '../../src/listen/words';

const words = listenWords();
const heard = (s: string) => words.filter((w) => w.steps.some((x) => x.sound === s)).length;

test('the words cover every live sound, and the lone list every other sound with a line', () => {
  for (const s of liveSoundKeys()) assert.ok(heard(s) >= 1, `${s} is in no listen word`);
  assert.deepEqual([...liveSoundKeys(), ...loneSoundKeys()].sort(), Object.keys(SOUND_BY_UNIT).sort());
});

test('the hard sounds are heard more than once, the newest takes first, and the set stays short', () => {
  // As often as live words have it: OW is in COW alone.
  for (const s of HARD) {
    const can = LIVE.filter((w) => w.sounds.includes(s)).length;
    assert.ok(heard(s) >= Math.min(HARD_TIMES, can), `${s} heard ${heard(s)} times`);
  }
  assert.deepEqual(words.slice(0, FIRST.length).map((w) => w.word), FIRST);
  assert.ok(words.length <= 30, `${words.length} words`);
});

test('every line the page plays exists', () => {
  const lines = new Set((JSON.parse(readFileSync('content/voice/lines.json', 'utf8')) as { id: string }[]).map((l) => l.id));
  for (const w of words) {
    assert.ok(lines.has(wordLine(w.word)), wordLine(w.word));
    for (const s of w.steps) if (s.id) assert.ok(lines.has(s.id), s.id);
  }
  for (const s of loneSoundKeys()) assert.ok(lines.has(letterSoundLine(s)), letterSoundLine(s));
});
