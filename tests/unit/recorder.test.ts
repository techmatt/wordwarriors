/**
 * Item 158: the phonics recorder's targeted pages (tools/recorder/phonics-recorder.html):
 * `?only=<sound ids>`, one card per sound, and `?missing`, `?only=` with the
 * derived MISSING list (tools/recorder/missing.ts), which must be up to date
 * with the bank and the clip index; and a targeted take imports.
 * `npx tsx --test tests/unit/recorder.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { tag } from '../../content/phonics/bank';
import { readClipIndex, spokenHash, type ClipIndex } from '../../tools/voice/clips';
import { processTake } from '../../tools/voice/import';
import { missingBlock, missingSounds, pageCards, RECORDER_PAGE, withMissingBlock } from '../../tools/recorder/missing';
import { readLines } from '../../tools/shared';
import type { LineSpec } from '../../tools/voice/types';

const html = readFileSync(RECORDER_PAGE, 'utf8');
const cards = (search: string) => pageCards(html, search).cards;
const words = (search: string) => cards(search).groups.map((g) => g.map((e) => e.word));

test('recorder: ?only=f,a is two cards, F as FAN and A as CAT, the takes item 108\'s ?missing had', () => {
  const c = cards('?only=f,a');
  assert.deepEqual(words('?only=f,a'), [['[F]AN'], ['C[A]T']]);
  assert.deepEqual(c.ids, ['g02f', 'g07a']);
  assert.equal(c.tag, '-only-f-a');
  // Order as asked, any case, duplicates and spaces dropped; CK is the K card.
  assert.deepEqual(cards('?only=A, f,a').ids, ['g07a', 'g02f']);
  assert.deepEqual(cards('?only=ck,k').ids, ['g07k']);
});

test('recorder: ?missing is ?only= with MISSING, under its own zip name; the bare page is the full set', () => {
  const m = /const MISSING = (\[.*\]);/.exec(html)!;
  const missing = JSON.parse(m[1]!) as string[];
  const c = cards('?missing');
  assert.ok(missing.length > 0);
  assert.deepEqual(c.groups, cards(`?only=${missing.join(',')}`).groups);
  assert.deepEqual(c.ids, cards(`?only=${missing.join(',')}`).ids);
  assert.equal(c.tag, '-missing');
  const full = cards('');
  assert.equal(full.groups.length, 12);
  assert.deepEqual(full.ids, Array.from({ length: 12 }, (_, i) => `g${String(i + 1).padStart(2, '0')}`));
  assert.equal(full.tag, '');
  // Nothing known asked: the full page, naming what it did not know.
  const odd = cards('?only=zz,qq');
  assert.equal(odd.groups.length, 12);
  assert.deepEqual(odd.unknown, ['zz', 'qq']);
  assert.deepEqual(cards('?only=f,zz').unknown, ['zz']);
});

test('recorder: the page\'s ?missing is up to date with the bank and the clip index (npm run recorder:missing)', async () => {
  const block = missingBlock(html, missingSounds(await readLines(), await readClipIndex()));
  assert.equal(withMissingBlock(html, block), html, 'run npm run recorder:missing');
});

test('recorder: a sound is missing with no clip or a stale one; one the full set lacks gets its own card', () => {
  const live = [tag({ word: 'cat', role: 'thing' }), tag({ word: 'cow', role: 'thing', spelled: [['c', 'c'], ['ow', 'ow']] })];
  const line = (id: string, text: string): LineSpec => ({ id, speaker: 'phonics', group: 'letters', text });
  const lines = [line('letter_c_sound', 'Kuh.'), line('letter_t_sound', 'Tuh.'), line('letter_a_sound', 'Aah.')];
  const clip = (l: LineSpec, hash = spokenHash(l)) => ({ provider: 'matt', speaker: 'phonics', spoken: l.text, spokenHash: hash, audio: `${l.id}.mp3`, words: [], ingested: '2026-10-25' });
  const index: ClipIndex = { version: 1, clips: { letter_c_sound: clip(lines[0]!), letter_t_sound: clip(lines[1]!), letter_a_sound: clip(lines[2]!, 'stale') } };
  // C and T recorded, A's line changed since its clip, OW with no line yet.
  const missing = missingSounds(lines, index, live);
  assert.deepEqual(missing, [
    { sound: 'a', state: 'stale', words: ['cat'] },
    { sound: 'ow', state: 'edge-tts', words: ['cow'] },
  ]);
  const page = withMissingBlock(html, missingBlock(html, missing, live));
  const c = pageCards(page, '?missing').cards;
  assert.deepEqual(c.ids, ['g07a', 'g13ow']);
  assert.equal(c.groups[1]![0]!.word, 'C[OW]');
  assert.equal(c.groups[1]![0]!.kind, 'hold');
});

// ---- A targeted take imports ------------------------------------------------

const RATE = 48000;
/** One card of a targeted page: the word, then its sound three times, with pauses. */
function soloTake(): Float32Array {
  let r = 7;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const out: number[] = [];
  const quiet = (s: number) => {
    for (let i = 0; i < s * RATE; i++) out.push(0.0005 * rnd());
  };
  quiet(0.6);
  for (const s of [0.5, 0.8, 0.8, 0.8]) {
    const n = Math.round(s * RATE);
    for (let i = 0; i < n; i++) out.push(Math.min(1, i / (0.02 * RATE), (n - i) / (0.02 * RATE)) * 0.3 * Math.sin((2 * Math.PI * 180 * i) / RATE));
    quiet(0.7);
  }
  return Float32Array.from(out);
}

test('recorder: each ?only=f,a card, as its zip lists it, imports as one word and one sound', () => {
  const c = cards('?only=f,a');
  const ids = new Set(['word_fan', 'word_cat', 'letter_f_sound', 'letter_a_sound']);
  const got = c.groups.map((g, i) => {
    // The manifest's entries, as the page's downloadZip writes them.
    const entries = g.map((e) => ({ sound: e.id, word: e.word.replace(/[[\]]/g, '').toLowerCase(), kind: e.kind, repeats: 3 }));
    const r = processTake(c.ids[i]!, soloTake(), RATE, entries, ids);
    assert.equal(r.refused, undefined);
    return { card: r.card, targets: r.entries.map((e) => e.targets) };
  });
  assert.deepEqual(got, [
    { card: 2, targets: [['word_fan', 'letter_f_sound']] },
    { card: 7, targets: [['word_cat', 'letter_a_sound']] },
  ]);
});
