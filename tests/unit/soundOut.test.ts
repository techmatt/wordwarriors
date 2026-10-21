/**
 * Sounding a word out by sound unit (item 085, src/rules/soundOut.ts): KING is
 * K, I, NG. A multi-letter unit (NG SH CH TH CK QU MB, LL SS FF ZZ GG PP,
 * EE OA AY OO EY...) is said once, as its one sound, and its letters are
 * never said apart: not "N, G", not "N, G" and then "NG". Checked over every
 * word in the bank, through every place that sounds one out (the shared
 * helper, the entry hall's clue at every level, the bridge and Charge plans,
 * the word machine's onsets), and every line it says exists.
 * `npx tsx --test tests/unit/soundOut.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BANK, BANK_BY_WORD, unitsOf } from '../../content/phonics/bank';
import { FAMILIES, onsetOf } from '../../content/phonics/families';
import { SOUND_BY_UNIT } from '../../content/phonics/letters';
import { letterSoundLine } from '../../content/voice/ids';
import { CROSS_WORDS } from '../../src/rules/bridge';
import { CHARGE_WORDS } from '../../src/rules/charge';
import { clue } from '../../src/rules/grab';
import { soundOut } from '../../src/rules/soundOut';
import { composeLines } from '../../tools/voice/compose';

/** Two letters that are one sound wherever they stand together in a short word. */
const PAIRS = ['sh', 'ch', 'th', 'ck', 'ng', 'qu', 'ff', 'll', 'ss', 'zz', 'gg'];

test('every bank word: its units spell it, and no multi-letter unit is ever split into its letters', () => {
  const split: string[] = [];
  for (const w of BANK) {
    const steps = soundOut(w.word);
    assert.equal(steps.map((s) => s.unit).join(''), w.word, w.word);
    assert.deepEqual(steps.map((s) => s.unit), w.units, w.word);
    // Each step covers its own letters, end to end.
    let at = 0;
    for (const s of steps) {
      assert.equal(s.index, at, `${w.word}: ${s.unit} at ${s.index}`);
      assert.equal(s.span, s.unit.length);
      at += s.span;
    }
    // Two one-letter steps side by side never make a digraph or a doubled letter (a split NG of KING).
    for (let i = 1; i < steps.length; i++) {
      const pair = steps[i - 1]!.unit + steps[i]!.unit;
      if (steps[i - 1]!.span === 1 && steps[i]!.span === 1 && PAIRS.includes(pair)) split.push(`${w.word}: ${pair}`);
    }
    // A word the bank does not hand-spell is split the one way, by `unitsOf`.
    if (!w.spelled) assert.deepEqual(w.units, unitsOf(w.word), w.word);
  }
  assert.deepEqual(split, []);
});

test('every bank word: each unit says one line, its own sound, and the line exists', () => {
  const ids = new Set(composeLines().map((l) => l.id));
  for (const w of BANK) {
    for (const s of soundOut(w.word)) {
      // A silent letter (KITE's E) only lights; anything else has its sound's line, and it exists.
      if (s.sound === '') assert.equal(s.id, '', `${w.word}: ${s.unit}`);
      else {
        assert.ok(SOUND_BY_UNIT[s.sound], `${w.word}: ${s.unit} has no sound ${s.sound}`);
        assert.equal(s.id, letterSoundLine(s.sound));
        assert.ok(ids.has(s.id), `${w.word}: no line ${s.id}`);
      }
    }
  }
  // The digraphs each have a line of their own.
  for (const d of ['sh', 'ch', 'th', 'ck', 'ng']) assert.ok(ids.has(letterSoundLine(d)), d);
});

test('KING, SHIP, DUCK, BELL, QUEST, SHEEP: one sound per unit', () => {
  const said = (w: string) => soundOut(w).map((s) => s.sound);
  assert.deepEqual(said('king'), ['k', 'i', 'ng']);
  assert.deepEqual(said('ship'), ['sh', 'i', 'p']);
  assert.deepEqual(said('duck'), ['d', 'u', 'ck']);
  assert.deepEqual(said('bell'), ['b', 'e', 'l']);
  assert.deepEqual(said('quest'), ['q', 'e', 's', 't']);
  assert.deepEqual(said('sheep'), ['sh', 'long_e', 'p']);
  // A word not in the bank splits the same way.
  assert.deepEqual(said('shock'), ['sh', 'o', 'ck']);
  assert.deepEqual(said('hill'), ['h', 'i', 'l']);
});

test('the entry hall clue, every word, every level: a multi-letter unit is one sound step lighting all its letters, never a letter name or sound inside it', () => {
  for (const w of BANK) {
    const units = soundOut(w.word).filter((s) => s.span > 1);
    for (const level of [1, 2, 3] as const) {
      for (const help of [false, true]) {
        const steps = clue(w.word, level, help);
        for (const u of units) {
          const inside = steps.filter((s) => s.index < u.index + u.span && s.index + s.span > u.index);
          const where = `${w.word} level ${level}${help ? ' help' : ''}: ${u.unit}`;
          assert.equal(inside.length, 1, `${where}: ${inside.map((s) => s.id).join(', ')}`);
          assert.deepEqual([inside[0]!.kind, inside[0]!.index, inside[0]!.span, inside[0]!.id], ['sound', u.index, u.span, u.id], where);
        }
        // Every sound step is a unit's own line, in order.
        assert.deepEqual(steps.filter((s) => s.kind === 'sound').map((s) => s.id), soundOut(w.word).filter((s) => s.id || s.sound === '').map((s) => s.id), `${w.word} level ${level}`);
      }
    }
  }
});

test('the bridge, Charge the Spell and the word machine sound by the same units', () => {
  // A bridge stone, a Charge rune: one per unit, its sound the unit's.
  for (const w of [...CROSS_WORDS, ...CHARGE_WORDS]) {
    const b = BANK_BY_WORD[w]!;
    assert.deepEqual(soundOut(w).map((s) => s.sound), b.sounds, w);
  }
  // The word machine's tiles are one-letter onsets (the rime is its own line): no digraph is ever a tile's letters.
  for (const f of FAMILIES) for (const w of f.all) assert.equal(onsetOf(w), BANK_BY_WORD[w]!.units[0], w);
  for (const f of FAMILIES) for (const w of f.all) assert.equal(onsetOf(w).length, 1, w);
});
