/**
 * Item 043: a familiar picture for every first sound (KEY for K, YOYO for Y,
 * special words like MICE), and PIN familiar again (the -IN family).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BANK_BY_WORD, LIVE, THINGS } from '../../content/phonics/bank';
import { FAMILY_BY_RIME, FAMILY_WORDS } from '../../content/phonics/families';
import { FETCH_BY_WORD, lookalikesOf } from '../../content/phonics/sentences';
import { WORD_BY_ID } from '../../content/phonics/words';
import { EFFECT_BY_WORD } from '../../content/phonics/effects';
import { ALL_SIDE_ROOMS } from '../../content/house/house';
import { letterSoundLine } from '../../content/voice/ids';
import { GRAB_WORDS, clue } from '../../src/rules/grab';
import { BAG_WORDS } from '../../src/rules/sentences';
import { phonicsFace } from '../../src/rules/cast';

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

test('special words: level 1, no vowel, never in a family, the hint sounds only the first letter', () => {
  for (const w of ['key', 'yoyo']) {
    const b = BANK_BY_WORD[w]!;
    assert.ok(b.special, w);
    assert.equal(b.level, 1);
    assert.equal(b.vowel, null);
    assert.deepEqual(b.units, [w.charAt(0)]);
    assert.equal(WORD_BY_ID[w]?.decodable, false, `${w} is not decodable (SentenceRoom sounds only its first letter)`);
    assert.ok(!FAMILY_WORDS.includes(w), w);
    for (const level of [1, 2, 3] as const) {
      const sounds = clue(w, level).filter((s) => s.kind === 'sound');
      assert.deepEqual(sounds.map((s) => s.id), [letterSoundLine(w.charAt(0))], `${w} level ${level}`);
    }
  }
  assert.ok(lookalikesOf('yoyo').includes('top'));
});

test('no door sign shows a key: the secret door is a compass, so KEY stays readable', () => {
  for (const r of ALL_SIDE_ROOMS) assert.notEqual(r.glyph, BANK_BY_WORD.key!.glyph, r.id);
});

test('PIN is familiar again (Matt, item 043): the -IN family builds PIN and BIN', () => {
  assert.ok(!BANK_BY_WORD.pin!.odd);
  assert.deepEqual([...FAMILY_BY_RIME.in!.words].sort(), ['bin', 'pin']);
  assert.ok(!FAMILY_BY_RIME.ig, '-IG has one familiar picture (PIG) only');
});

test('M2: the phonics voice shows Dada Matt only when he is in the episode on her side', () => {
  const base = { hero: 'julia', ally: 'ellie', primary: null, secondary: null };
  assert.equal(phonicsFace({ ...base, primary: 'dada_matt_cyber' }), 'dada_matt');
  assert.equal(phonicsFace({ ...base, primary: 'dada_jason', secondary: 'dada_matt' }), 'dada_matt');
  assert.equal(phonicsFace({ ...base, primary: 'dada_jason_warrior' }), null, 'Jason woke her, no Matt: no face');
  assert.equal(phonicsFace({ ...base, ally: 'scar', primary: null }), null);
});
