/**
 * Item 037: the word bank's tags, and the one weighting every draw goes
 * through (src/rules/bank.ts): every level in play and the recency lean
 * (item 067), coverage, and distractors chosen for reading.
 * `npx tsx --test tests/unit/bank.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { ACTIONS, BANK, BANK_BY_WORD, LIVE, THINGS, tag, unitsOf } from '../../content/phonics/bank';
import { SOUND_BY_UNIT } from '../../content/phonics/letters';
import { DIFFICULTY, VARIETY } from '../../src/config';
import { coverage, coverageTable, distractorsFor, drawWords, isFirm, recentWords, sharesSound, wordWeight } from '../../src/rules/bank';
import { setDifficulty } from '../../src/rules/difficulty';
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
    // Item 056: a silent letter (the E of KITE) has no sound, ``.
    for (const u of w.sounds) assert.ok(u === '' || SOUND_BY_UNIT[u], `${w.word}: no sound for ${u}`);
  }
});

test('drawWords (item 067): every level is in play from a fresh store, long words like OCTOPUS included', () => {
  const store = new ProgressStore(memory());
  const pool = THINGS.map((w) => w.word);
  const rand = seeded(3);
  const levels = new Set<number>();
  const drawn = new Set<string>();
  for (let i = 0; i < 400; i++) {
    const w = drawWords(store, pool, 1, rand)[0]!;
    levels.add(BANK_BY_WORD[w]!.level);
    drawn.add(w);
  }
  assert.deepEqual([...levels].sort(), [1, 2, 3]);
  assert.ok([...drawn].some((w) => BANK_BY_WORD[w]!.units.length >= 5), 'a long word comes up');
  assert.deepEqual(drawWords(store, ['octopus'], 1, rand), ['octopus']);
});

test('recency (item 067): a word read right first time lately weighs VARIETY.wordWeight; a miss restores it', () => {
  const store = new ProgressStore(memory());
  const before = wordWeight(store, 'cat');
  store.record('words', 'cat', true, 0);
  const shakyAfter = store.shakiness('words', 'cat');
  assert.ok(recentWords(store).has('cat'));
  assert.ok(Math.abs(wordWeight(store, 'cat') - shakyAfter * coverage(store, 'cat') * VARIETY.wordWeight) < 1e-9);
  assert.ok(wordWeight(store, 'cat') < before);
  store.record('words', 'cat', false, 1);
  assert.ok(!recentWords(store).has('cat'), 'a miss leaves the recent list');
  // The list keeps only the latest VARIETY.words.
  for (const w of THINGS.slice(0, VARIETY.words + 5)) store.record('words', w.word, true, 0);
  assert.equal(store.recentOf('words').length, VARIETY.words);
});

test('isFirm (item 067): never at base difficulty, from difficulty 2 as before', () => {
  const store = new ProgressStore(memory());
  solid(store, 'cat');
  assert.equal(isFirm(store, 'cat'), false);
  setDifficulty(2);
  try {
    assert.equal(isFirm(store, 'cat'), true);
  } finally {
    setDifficulty(DIFFICULTY);
  }
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

test('distractorsFor: a new word gets other first letters; a firm word (from difficulty 2) one sharing its onset or rime; banned never', () => {
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
  // At base (item 067) a solid CAT still gets other first letters.
  for (let i = 0; i < 20; i++) for (const w of distractorsFor(store, 'cat', pool, 2, rand, ['hat'])) assert.notEqual(w[0], 'c', `${w} beside CAT at base`);
  setDifficulty(2);
  after(() => setDifficulty(DIFFICULTY));
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
  setDifficulty(DIFFICULTY);
});

test('coverageTable: per level, vowel and first sound, words · read · solid add up to the bank', () => {
  const store = new ProgressStore(memory());
  solid(store, 'cat');
  store.record('words', 'frog', false, 1);
  const t = coverageTable(store);
  for (const rows of [t.level, t.vowel, t.onset]) {
    // A long-vowel word (KEY) has no vowel row.
    assert.equal(rows.reduce((n, r) => n + r.words, 0), LIVE.filter((w) => rows !== t.vowel || w.vowel).length);
    assert.equal(rows.reduce((n, r) => n + r.readWords, 0), 2);
    assert.equal(rows.reduce((n, r) => n + r.solid, 0), 1);
  }
  assert.deepEqual(t.level.map((r) => r.tag), ['1', '2', '3']);
  assert.equal(t.level[1]!.readWords, 1);
  assert.equal(t.level[1]!.solid, 0, 'a missed FROG is read, not solid');
  assert.equal(t.vowel.find((r) => r.tag === 'a')!.solid, 1);
});
