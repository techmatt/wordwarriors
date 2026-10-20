/**
 * Item 056: the word bank's coverage rule (COVERAGE in content/phonics/bank.ts,
 * measured by src/rules/bankAudit.ts). A future edit that leaves a letter
 * sound, a vowel, a family, the bridge or a long vowel under its target fails
 * here, naming the row. `npm run bank:audit` prints the whole table.
 * `npx tsx --test tests/unit/coverage.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BANK_BY_WORD, COVERAGE, THINGS, soundOf, unitsOf } from '../../content/phonics/bank';
import { DIGRAPH_SOUNDS, LETTERS, SOUND_BY_UNIT } from '../../content/phonics/letters';
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
