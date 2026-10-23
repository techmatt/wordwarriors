/**
 * A familiar picture for every first sound (item 043: KEY for K, YOYO for Y),
 * the secret door's sign clear of KEY, and PIN familiar again (the -IN
 * family). Item 048: KEY and YOYO sound out in full, long vowels and all, and
 * may be the counter.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BANK_BY_WORD, LIVE, THINGS } from '../../content/phonics/bank';
import { SOUND_BY_UNIT } from '../../content/phonics/letters';
import { FAMILY_BY_RIME, FAMILY_WORDS } from '../../content/phonics/families';
import { FETCH_BY_WORD, lookalikesOf } from '../../content/phonics/sentences';
import { WORD_BY_ID } from '../../content/phonics/words';
import { EFFECT_BY_WORD } from '../../content/phonics/effects';
import { ALL_SIDE_ROOMS } from '../../content/house/house';
import { letterSoundLine } from '../../content/voice/ids';
import { GRAB_WORDS, clue } from '../../src/rules/grab';
import { BAG_WORDS } from '../../src/rules/bank';

test('K and Y: a familiar pictured word each, in the rooms, the warm-up and the bag', () => {
  for (const letter of ['k', 'y']) {
    const ws = THINGS.filter((w) => w.onset === letter).map((w) => w.word);
    assert.ok(ws.length > 0, `a pictured ${letter.toUpperCase()} word`);
    for (const w of ws) {
      assert.ok(GRAB_WORDS.includes(w) && BAG_WORDS.includes(w) && FETCH_BY_WORD[w] && EFFECT_BY_WORD[w], w);
      assert.ok(LIVE.some((l) => l.word === w), w);
    }
  }
});

test('KEY and YOYO (item 048): level 1, no short vowel, never in a family, every unit sounded, long vowels their own lines', () => {
  const want: Record<string, { units: string[]; sounds: string[]; index: number[] }> = {
    key: { units: ['k', 'ey'], sounds: ['k', 'long_e'], index: [0, 1] },
    yoyo: { units: ['y', 'o', 'y', 'o'], sounds: ['y', 'long_o', 'y', 'long_o'], index: [0, 1, 2, 3] },
  };
  for (const [w, x] of Object.entries(want)) {
    const b = BANK_BY_WORD[w]!;
    assert.equal(b.level, 1);
    assert.equal(b.vowel, null);
    assert.deepEqual(b.units, x.units);
    assert.deepEqual(b.sounds, x.sounds);
    assert.equal(WORD_BY_ID[w]?.decodable, true, `${w} sounds out (SentenceRoom sounds every unit)`);
    assert.ok(!FAMILY_WORDS.includes(w), w);
    for (const level of [1, 2, 3] as const) {
      const sounds = clue(w, level).filter((s) => s.kind === 'sound');
      assert.deepEqual(sounds.map((s) => s.id), x.sounds.map(letterSoundLine), `${w} level ${level}`);
      assert.deepEqual(sounds.map((s) => s.index), x.index, `${w} level ${level}: which letters each sound lights`);
    }
  }
  // KEY's EY lights both letters; the long vowels are not the short ones' lines.
  assert.equal(clue('key', 3)[1]!.span, 2);
  assert.ok(SOUND_BY_UNIT.long_e && SOUND_BY_UNIT.long_o);
  assert.notEqual(letterSoundLine('long_o'), letterSoundLine('o'));
  assert.ok(lookalikesOf('yoyo').includes('top'));
});

test('no door sign shows a key: the secret door is a compass, so KEY stays readable', () => {
  for (const r of ALL_SIDE_ROOMS) assert.notEqual(r.glyph, BANK_BY_WORD.key!.glyph, r.id);
});

test('PIN is familiar again (Matt, item 043); BIN is stored (item 127), so -IN is no family', () => {
  assert.ok(!BANK_BY_WORD.pin!.odd);
  assert.ok(BANK_BY_WORD.bin!.stored);
  assert.ok(!FAMILY_BY_RIME.in, '-IN has one familiar picture (PIN) only');
  assert.ok(!FAMILY_BY_RIME.ig, '-IG has one familiar picture (PIG) only');
});
