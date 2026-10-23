/**
 * Item 056: the word bank's coverage rule (COVERAGE in content/phonics/bank.ts,
 * measured by src/rules/bankAudit.ts). A future edit that leaves a letter
 * sound, a vowel, a family, the bridge or a long vowel under its target fails
 * here, naming the row. `npm run bank:audit` prints the whole table.
 * `npx tsx --test tests/unit/coverage.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BANK, BANK_BY_WORD, COVERAGE, THINGS, soundOf, unitsOf } from '../../content/phonics/bank';
import { DIGRAPH_SOUNDS, LETTERS, LONG_VOWEL_SOUNDS, SOUND_BY_UNIT, UNTAUGHT_SOUNDS } from '../../content/phonics/letters';
import { coverageGaps, coverageRows } from '../../src/rules/bankAudit';

test('coverage: every row of the audit meets its target', () => {
  const gaps = coverageGaps().map((r) => `${r.tag}: ${r.words.length}/${r.target} (${r.words.join(' ') || 'none'})`);
  assert.deepEqual(gaps, [], 'under target; add familiar pictured words, or lower the target in COVERAGE with its reason');
});

test('coverage: every letter sound and digraph has a first-sound row; a target under the usual one says why', () => {
  const tags = new Set(coverageRows().map((r) => r.tag));
  for (const s of [...LETTERS, ...DIGRAPH_SOUNDS]) assert.ok(tags.has(`first ${s.letter}`), s.letter);
  for (const t of [COVERAGE.first, COVERAGE.bridge]) {
    for (const [k, v] of Object.entries(t)) if (v.target < COVERAGE.firstTarget) assert.ok(v.why, `${k} needs a why`);
  }
  for (const t of [COVERAGE.last, COVERAGE.long]) for (const [k, v] of Object.entries(t)) if (v.target < 2) assert.ok(v.why, `${k} needs a why`);
});

test('coverage: a word dropping out shows as a gap (the check bites)', () => {
  const without = THINGS.filter((w) => w.word !== 'king' && w.word !== 'kite');
  assert.ok(coverageGaps(without).some((r) => r.tag === 'first k'), 'K without KING and KITE');
});

test('units (item 056): QU and NG are units, doubled letters one sound, silent E none', () => {
  assert.deepEqual(unitsOf('quest'), ['qu', 'e', 's', 't']);
  assert.deepEqual(unitsOf('king'), ['k', 'i', 'ng']);
  assert.deepEqual(unitsOf('egg'), ['e', 'gg']);
  assert.equal(soundOf('qu'), 'q');
  assert.equal(soundOf('ll'), 'l');
  const t = (w: string) => {
    const b = BANK_BY_WORD[w]!;
    return [b.level, b.vowel, b.onset, b.rime, b.sounds.join(' ')];
  };
  assert.deepEqual(t('quest'), [3, 'e', 'qu', 'est', 'q e s t']);
  assert.deepEqual(t('bell'), [1, 'e', 'b', 'ell', 'b e l']);
  assert.deepEqual(t('egg'), [1, 'e', '', 'egg', 'e g']);
  assert.deepEqual(t('king'), [3, 'i', 'k', 'ing', 'k i ng']);
  assert.deepEqual(t('thumb'), [3, 'u', 'th', 'umb', 'th u m']);
  assert.deepEqual(t('kite'), [3, null, 'k', 'ite', 'k long_i t ']);
  assert.deepEqual(t('key'), [1, null, 'k', 'ey', 'k long_e']);
  for (const s of ['q', 'ng', 'th_voiced', 'long_a', 'long_i', 'long_u']) assert.ok(SOUND_BY_UNIT[s], s);
});

test('untaught sounds (item 058): a word holding one is a late long-path word; X-RAY (stored, item 127) would count for X', () => {
  const t = (w: string) => {
    const b = BANK_BY_WORD[w]!;
    return [b.level, b.vowel, b.sounds.join(' ')];
  };
  assert.deepEqual(t('zoo'), [3, null, 'z long_oo']);
  assert.deepEqual(t('zebra'), [3, null, 'z long_e b r schwa']);
  assert.deepEqual(t('apple'), [3, null, 'a p l ']);
  assert.deepEqual(t('igloo'), [3, null, 'i g l long_oo']);
  assert.deepEqual(t('octopus'), [3, null, 'o c t schwa p schwa s']);
  assert.deepEqual(t('umbrella'), [3, null, 'u m b r e l schwa']);
  assert.deepEqual(t('xray'), [3, null, 'x_name r long_a']);
  assert.deepEqual(t('cow'), [3, null, 'c ow']);
  for (const s of UNTAUGHT_SOUNDS) assert.ok(SOUND_BY_UNIT[s.letter] && LONG_VOWEL_SOUNDS.includes(s), `${s.letter} has its own line`);
  const row = (tag: string) => coverageRows().find((r) => r.tag === tag)!.words;
  assert.ok(coverageRows(BANK.filter((w) => THINGS.includes(w) || w.word === 'xray')).find((r) => r.tag === 'first x')!.words.includes('xray'), 'X-RAY counts for X');
  assert.ok(!row('first x').includes('xray'), 'X-RAY is stored');
  assert.ok(!coverageRows().some((r) => r.tag.startsWith('long ') && UNTAUGHT_SOUNDS.some((s) => r.tag === `long ${s.letter}`)), 'no long row for an untaught sound');
});
