/**
 * Item 149: the checker's retention (tests/qa/prune.ts) keeps the last three hunts, the
 * sweep starting now, what a kept hunt cites, and runs outside a hunt from the kept span.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cites, huntOf, huntSections, plan } from '../qa/prune';
import { scratchArg, scratchPath, SCRATCH } from '../../tools/scratch';
import { sheetFile } from '../../tools/art/alts';

const runs = [
  { tag: 'h7def', mtimeMs: 7 },
  { tag: 'h8a', mtimeMs: 8 },
  { tag: 'h8issues.py', mtimeMs: 8 },
  { tag: '087', mtimeMs: 6 },
  { tag: 'look1', mtimeMs: 9.5 },
  { tag: 'h9a', mtimeMs: 9 },
  { tag: 'h10a', mtimeMs: 10 },
  { tag: 'h11a', mtimeMs: 11 },
];

test('qa prune: a tag names its hunt', () => {
  assert.equal(huntOf('h11lenses'), 11);
  assert.equal(huntOf('h8issues.py'), 8);
  assert.equal(huntOf('087'), null);
  assert.equal(huntOf('look1'), null);
});

test('qa prune: the last three hunts and what came during them stay', () => {
  const { keep, prune } = plan(runs, undefined, () => '');
  assert.deepEqual(new Set(keep), new Set(['look1', 'h9a', 'h10a', 'h11a']));
  assert.deepEqual(new Set(prune), new Set(['h7def', 'h8a', 'h8issues.py', '087']));
});

test('qa prune: a new hunt starting counts, so the oldest kept one goes', () => {
  const { keep, prune } = plan(runs, 'h12a', () => '');
  assert.ok(keep.includes('h10a') && !keep.includes('h9a'));
  assert.ok(plan([...runs, { tag: 'h12a', mtimeMs: 12 }], 'h12a', () => '').keep.includes('h12a'));
  assert.ok(prune.includes('h9a'));
});

test('qa prune: a run a kept hunt cites stays', () => {
  const { keep } = plan(runs, undefined, () => 'as in `h7def`, and qa/087/s1/001.png');
  assert.ok(keep.includes('h7def') && keep.includes('087'));
  assert.ok(!keep.includes('h8a'));
});

test('qa prune: citations and sections', () => {
  assert.ok(cites('QA_TAG=h8a npm run qa', 'h8a'));
  assert.ok(cites('C:\\x\\qa\\h8a\\001.png', 'h8a'));
  assert.ok(!cites('qa/h8ab/001.png', 'h8a'));
  assert.ok(!cites('qa/h8a-2/001.png', 'h8a'));
  assert.ok(cites('QA_TAG=h8a. Then', 'h8a'));
  assert.ok(!cites('item 087 fixed it', '087'));
  const doc = '# QA\n\n## Hunt 8 (x)\nsaw `h7def`\n## Hunt 9 (y)\nsaw `087`\n## Language pass\n`h8a`\n';
  assert.equal(huntSections(doc, new Set([9])), '## Hunt 9 (y)\nsaw `087`\n');
});

test('scratch home: beside the main checkout, and `scratch/` arguments land in it', () => {
  assert.match(SCRATCH, /-scratch$/);
  assert.equal(scratchArg('scratch/x/y.txt'), scratchPath('x/y.txt'));
  assert.equal(scratchArg('other/y.txt'), 'other/y.txt');
  // Picker output stays inside the repo (Drive junction), even when given the old scratch path.
  assert.match(sheetFile('art_alts_150_x'), /^art-originals[\\/]picks[\\/]art_alts_150_x\.png$/);
  assert.match(sheetFile('scratch/art_alts_150_x.png'), /^art-originals[\\/]picks[\\/]art_alts_150_x\.png$/);
  assert.equal(sheetFile('elsewhere/s.png'), 'elsewhere/s.png');
});
