/**
 * Item 037: the word bank's tags, and the one weighting every draw goes
 * through (src/rules/bank.ts): the level gate, coverage, and distractors
 * chosen for reading.
 * `npx tsx --test tests/unit/bank.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ACTIONS, BANK, BANK_BY_WORD, LIVE, THINGS, tag, unitsOf } from '../../content/phonics/bank';
import { SOUND_BY_UNIT } from '../../content/phonics/letters';
import { BANK_DRAW } from '../../src/config';
import { coverage, coverageTable, distractorsFor, drawWords, isFirm, levelGate, sharesSound } from '../../src/rules/bank';
import { ProgressStore, type StorageLike } from '../../src/state/ProgressStore';

function memory(): StorageLike {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

function seeded(seed = 1): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Read `word` right first time `n` times. */
function solid(store: ProgressStore, word: string, n = 4): void {
  for (let i = 0; i < n; i++) store.record('words', word, true, 0);
}

test('tags come from the spelling: units, level, vowel, onset, rime', () => {
  assert.deepEqual(unitsOf('ship'), ['sh', 'i', 'p']);
  assert.deepEqual(unitsOf('duck'), ['d', 'u', 'ck']);
  assert.deepEqual(unitsOf('frog'), ['f', 'r', 'o', 'g']);
  assert.deepEqual(unitsOf('chick'), ['ch', 'i', 'ck']);
  const t = (w: string) => {
    const b = BANK_BY_WORD[w]!;
    return [b.level, b.vowel, b.onset, b.rime];
  };
  assert.deepEqual(t('cat'), [1, 'a', 'c', 'at']);
  assert.deepEqual(t('frog'), [2, 'o', 'fr', 'og']);
  assert.deepEqual(t('jump'), [2, 'u', 'j', 'ump']);
  assert.deepEqual(t('ant'), [2, 'a', '', 'ant']);
  assert.deepEqual(t('ship'), [3, 'i', 'sh', 'ip']);
  assert.deepEqual(t('duck'), [3, 'u', 'd', 'uck']);
  assert.throws(() => tag({ word: 'rain', role: 'thing' }), /one-short-vowel/);
});

test('the bank: unique words, every vowel and level present, things and actions split by role; every unit has a sound', () => {
  assert.equal(new Set(BANK.map((w) => w.word)).size, BANK.length);
  for (const v of ['a', 'e', 'i', 'o', 'u']) assert.ok(THINGS.some((w) => w.vowel === v), `a pictured short ${v}`);
  for (const l of [1, 2, 3]) assert.ok(THINGS.some((w) => w.level === l), `a pictured level ${l} word`);
  for (const w of BANK) {
    // Item 040: an `odd` word (YAK) is no picture to match.
    assert.equal(THINGS.includes(w), w.role !== 'action' && !w.odd, w.word);
    assert.equal(ACTIONS.includes(w), w.role !== 'thing', w.word);
    for (const u of w.units) assert.ok(SOUND_BY_UNIT[u], `${w.word}: no sound for ${u}`);
  }
});

test('level gate: level 1 always open; blends open as CVC firms up, digraphs as blends do', () => {
  const store = new ProgressStore(memory());
  assert.equal(levelGate(store, 1), 1);
  assert.equal(levelGate(store, 2), 0);
  assert.equal(levelGate(store, 3), 0);
  const cvc = BANK.filter((w) => w.level === 1);
  // A few solid CVC words: blends begin to open, a little.
  const some = Math.ceil(cvc.length * (BANK_DRAW.levels[2].start + 0.05));
  for (const w of cvc.slice(0, some)) solid(store, w.word);
  const partly = levelGate(store, 2);
  assert.ok(partly > 0 && partly < 1, `partly open: ${partly}`);
  assert.equal(levelGate(store, 3), 0);
  for (const w of cvc) solid(store, w.word);
  assert.equal(levelGate(store, 2), 1);
  assert.equal(levelGate(store, 3), 0, 'digraphs wait for blends');
  for (const w of BANK.filter((b) => b.level === 2)) solid(store, w.word);
  assert.equal(levelGate(store, 3), 1);
});

test('drawWords: a fresh store draws only CVC; a shut level comes up only when nothing else can', () => {
  const store = new ProgressStore(memory());
  const pool = THINGS.map((w) => w.word);
  const rand = seeded(3);
  for (let i = 0; i < 100; i++) assert.equal(BANK_BY_WORD[drawWords(store, pool, 1, rand)[0]!]!.level, 1);
  assert.deepEqual(drawWords(store, ['frog'], 1, rand), ['frog']);
});

test('coverage favours unmet vowels and first sounds', () => {
  const store = new ProgressStore(memory());
  // Lots of short A, nothing else.
  for (const w of ['cat', 'hat', 'bat', 'map', 'van', 'can']) solid(store, w, 5);
  assert.ok(coverage(store, 'pig') > coverage(store, 'rat'), 'short I over short A');
  assert.ok(coverage(store, 'dog') > coverage(store, 'cap'), 'D over C, O over A');
  // So a draw leans away from A.
  let a = 0;
  const rand = seeded(9);
  const pool = ['rat', 'pig', 'dog', 'bug', 'hen'];
  for (let i = 0; i < 300; i++) if (drawWords(store, pool, 1, rand)[0] === 'rat') a++;
  assert.ok(a < 300 / pool.length, `short A drawn ${a}/300`);
});

test('distractorsFor: a new word gets other first letters; a firm word one sharing its onset or rime; banned never', () => {
  const pool = THINGS.map((w) => w.word);
  const store = new ProgressStore(memory());
  const rand = seeded(5);
  assert.equal(isFirm(store, 'cat'), false);
  for (let i = 0; i < 50; i++) {
    const d = distractorsFor(store, 'cat', pool, 2, rand, ['hat']);
    assert.equal(d.length, 2);
    assert.ok(!d.includes('cat') && !d.includes('hat'));
    for (const w of d) assert.notEqual(w[0], 'c', `${w} beside a new CAT`);
  }
  solid(store, 'cat');
  assert.ok(isFirm(store, 'cat'));
  for (let i = 0; i < 50; i++) {
    const d = distractorsFor(store, 'cat', pool, 2, rand, ['hat']);
    assert.equal(d.filter((w) => sharesSound('cat', w)).length >= 1, true, d.join(' '));
    assert.ok(d.filter((w) => w[0] === 'c').length <= 1, `${d.join(' ')}: at most the one shares the C`);
    assert.ok(!d.includes('hat'));
  }
  // The share is by sound unit: SHIP's onset is SH, so SOCK does not share it, SHED does.
  assert.equal(sharesSound('ship', 'sock'), false);
  assert.equal(sharesSound('ship', 'shed'), true);
  assert.equal(sharesSound('frog', 'log'), true);
  // ANT has no onset: only its rime counts.
  assert.equal(sharesSound('ant', 'ash'), false);
  // Too small a pool: the rule gives way rather than come up short.
  assert.equal(distractorsFor(new ProgressStore(memory()), 'cat', ['cap', 'can', 'dog'], 2, rand).length, 2);
});

test('coverageTable: per level, vowel and first sound, words · read · solid add up to the bank', () => {
  const store = new ProgressStore(memory());
  solid(store, 'cat');
  store.record('words', 'frog', false, 1);
  const t = coverageTable(store);
  for (const rows of [t.level, t.vowel, t.onset]) {
    assert.equal(rows.reduce((n, r) => n + r.words, 0), LIVE.length);
    assert.equal(rows.reduce((n, r) => n + r.readWords, 0), 2);
    assert.equal(rows.reduce((n, r) => n + r.solid, 0), 1);
  }
  assert.deepEqual(t.level.map((r) => r.tag), ['1', '2', '3']);
  assert.equal(t.level[1]!.readWords, 1);
  assert.equal(t.level[1]!.solid, 0, 'a missed FROG is read, not solid');
  assert.equal(t.vowel.find((r) => r.tag === 'a')!.solid, 1);
});
