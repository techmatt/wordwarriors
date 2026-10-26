/**
 * Item 085: carrier lines (tools/voice/carrier.ts). The short A is cut from
 * edge-tts's "Add": the build keeps the vowel, onset to where the loudness first
 * falls `keepDb` under its peak, and drops the D. Composed lines carry it.
 * `npx tsx --test tests/unit/carrier.test.ts`.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LETTER_BY_CHAR } from '../../content/phonics/letters';
import { CARRIER_CUT, vowelSpan } from '../../tools/voice/carrier';
import { fingerprintSource } from '../../tools/voice/build';
import { FINISH, SPLIT } from '../../tools/voice/split';
import { spokenFor } from '../../tools/voice/clips';
import { composeLines } from '../../tools/voice/compose';

const RATE = 24000;

/** Silence, a loud vowel, a quieter voiced closure (the D), silence. */
function carrierLike(): Float32Array {
  const parts: [number, number][] = [
    [0.1, 0],
    [0.3, 0.5],
    [0.15, 0.08],
    [0.1, 0],
  ];
  const x = new Float32Array(Math.round(parts.reduce((s, [d]) => s + d, 0) * RATE));
  let i = 0;
  for (const [d, amp] of parts) {
    for (let k = 0; k < Math.round(d * RATE); k++, i++) x[i] = amp * Math.sin((2 * Math.PI * 180 * i) / RATE);
  }
  return x;
}

test('vowelSpan keeps the vowel and drops the closing consonant', () => {
  const { start, end } = vowelSpan(carrierLike(), RATE, 6);
  assert.ok(Math.abs(start / RATE - 0.1) < 0.025, `starts at the onset (${(start / RATE).toFixed(3)} s)`);
  assert.ok(end / RATE > 0.37 && end / RATE <= 0.42, `ends at the vowel's end, before the D (${(end / RATE).toFixed(3)} s)`);
});

test('the short A line asks edge-tts for its carrier and keeps its placeholder text', () => {
  assert.ok(LETTER_BY_CHAR.a!.carrier, 'a has a carrier');
  const lines = composeLines();
  const line = lines.find((l) => l.id === 'letter_a_sound')!;
  assert.equal(line.text, 'Aah');
  assert.equal(spokenFor(line), 'Add.');
  assert.deepEqual(line.cut, { keepDb: LETTER_BY_CHAR.a!.carrier!.keepDb });
  const o = lines.find((l) => l.id === 'letter_o_sound')!;
  assert.equal(o.cut, undefined, 'short o needs no carrier: "Ah" is the O of HOT already');
});

test("a carrier line's fingerprint holds how it is cut; a plain line's is as it was (item 159)", () => {
  const lines = composeLines();
  const voice = { voice: 'en-US-GuyNeural' };
  const a = fingerprintSource(lines.find((l) => l.id === 'letter_a_sound')!, 'edge-tts', voice, null) as { cutBy?: typeof CARRIER_CUT };
  // By value: re-tuning any of these numbers changes the hash, so the next voice:build re-cuts.
  assert.deepEqual(a.cutBy, CARRIER_CUT);
  assert.deepEqual(CARRIER_CUT.split, SPLIT);
  assert.deepEqual(CARRIER_CUT.finish, FINISH);
  assert.equal(typeof CARRIER_CUT.onsetDb, 'number');
  // A line with no cut keeps its pre-159 fingerprint keys, in order, so no plain line rebuilds.
  const o = lines.find((l) => l.id === 'letter_o_sound')!;
  assert.deepEqual(Object.keys(fingerprintSource(o, 'edge-tts', voice, null)), ['source', 'speaker', 'voice', 'text', 'say', 'group']);
});
