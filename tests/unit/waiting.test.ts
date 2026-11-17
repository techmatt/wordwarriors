/**
 * Waiting for art (item 191): a word without a picture of its own is never
 * drawn, and nobody writes that down. content/art/waiting.ts is derived from
 * public/art/ (tools/art/waiting.ts; `art:pick` rewrites it), and the bank
 * stores every word on it.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { WAITING_FOR_ART } from '../../content/art/waiting';
import { BANK, BANK_BY_WORD, LIVE, STORED, WAITING_WHY } from '../../content/phonics/bank';
import { waitingSource, waitingWords } from '../../tools/art/waiting';

test('waiting for art: content/art/waiting.ts is what public/art/ says (run `npx tsx tools/art/waiting.ts` if not)', async () => {
  const words = await waitingWords();
  assert.deepEqual([...WAITING_FOR_ART], words);
  assert.equal(readFileSync('content/art/waiting.ts', 'utf8'), waitingSource(words));
});

test('waiting for art: every waiting word is stored for it, and no live word lacks a picture of its own', () => {
  for (const w of WAITING_FOR_ART) {
    assert.ok(BANK_BY_WORD[w], `${w} is a bank word`);
    assert.ok(STORED.includes(BANK_BY_WORD[w]!), `${w} waits for art, so it is stored`);
  }
  const mark = Buffer.from('tEXtWordWarriors\0placeholder', 'latin1');
  const byHash = new Map<string, string>();
  for (const w of LIVE) {
    const f = `public/art/pic_${w.word}.png`;
    assert.ok(existsSync(f), `${w.word} is live with no ${f}`);
    const png = readFileSync(f);
    assert.ok(!png.includes(mark), `${w.word} is live on its painted placeholder`);
    const h = createHash('md5').update(png).digest('hex');
    assert.ok(!byHash.has(h), `${w.word} is live on ${byHash.get(h)}'s picture`);
    byHash.set(h, w.word);
  }
  // A stored word for art says so; a word stored for a real reason keeps that reason.
  for (const w of BANK.filter((b) => b.stored === WAITING_WHY)) assert.ok(WAITING_FOR_ART.includes(w.word), w.word);
});
