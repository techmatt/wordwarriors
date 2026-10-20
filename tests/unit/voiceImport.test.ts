/**
 * Item 057: `voice:import` (tools/voice/import.ts, split.ts) and the phonics
 * recorder's live count (tools/recorder/phonics-recorder.html), which ports the
 * importer's detector: the page's copy is run here beside the importer's, so
 * a take the page counts out is one the importer takes, and the reverse.
 * `npx tsx --test tests/unit/voiceImport.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deflateRawSync } from 'node:zlib';

import { mp3Bytes, processTake, readWav, unzip, wavBytes } from '../../tools/voice/import';
import { RAN_TOGETHER_S, SPLIT, countReason, finish, highpass, splitTake, type Entry } from '../../tools/voice/split';

interface PageCount {
  status: 'ok' | 'empty' | 'count';
  found: number;
  expected: number;
}
interface Page {
  SPLIT: typeof SPLIT;
  RAN_TOGETHER_S: number;
  countTake: (x: Float32Array, rate: number, expected: number) => PageCount;
  countReason: (c: PageCount) => string;
}

/** The recorder page's detector: the plain JS between its markers. */
function page(): Page {
  const html = readFileSync('tools/recorder/phonics-recorder.html', 'utf8');
  const m = /\/\/ detector:begin\n([\s\S]*?)\/\/ detector:end/.exec(html);
  assert.ok(m, 'the recorder has its detector:begin / detector:end block');
  return new Function(`${m[1]}\nreturn { SPLIT, RAN_TOGETHER_S, countTake, countReason };`)() as Page;
}

const RATE = 48000;
const ENTRIES: Entry[] = [
  { sound: 'u', word: 'bug', kind: 'hold', repeats: 3 },
  { sound: 'sh', word: 'ship', kind: 'hold', repeats: 3 },
  { sound: 'ch', word: 'chop', kind: 'short', repeats: 3 },
];

/** A take: each utterance a tone or a hiss (seconds, kind), with `gap` of quiet room between. */
function take(parts: [number, 'tone' | 'hiss', number?][], gap: number, room = 0.0005): Float32Array {
  let r = 11;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const out: number[] = [];
  const quiet = (s: number) => {
    for (let i = 0; i < s * RATE; i++) out.push(room * rnd());
  };
  quiet(0.6);
  for (const [s, kind, amp = 0.3] of parts) {
    const n = Math.round(s * RATE);
    for (let i = 0; i < n; i++) {
      const env = Math.min(1, i / (0.02 * RATE), (n - i) / (0.02 * RATE));
      out.push(env * (kind === 'tone' ? amp * Math.sin((2 * Math.PI * 180 * i) / RATE) : amp * 0.5 * rnd()) + room * rnd());
    }
    quiet(gap);
  }
  return Float32Array.from(out);
}
const card = (): [number, 'tone' | 'hiss', number?][] => [
  [0.5, 'tone'], [0.8, 'tone'], [0.8, 'tone'], [0.8, 'tone'],
  [0.5, 'tone'], [0.8, 'hiss', 0.2], [0.8, 'hiss', 0.2], [0.8, 'hiss', 0.2],
  [0.5, 'tone'], [0.3, 'hiss', 0.3], [0.3, 'hiss', 0.3], [0.3, 'hiss', 0.3],
];
const ids = new Set(['letter_u_sound', 'letter_sh_sound', 'letter_ch_sound', 'word_bug', 'word_ship', 'word_chop', 'letter_k_sound', 'letter_ck_sound']);

test('voice import: the recorder counts with the importer\'s own numbers', () => {
  const p = page();
  assert.deepEqual(p.SPLIT, SPLIT);
  assert.equal(p.RAN_TOGETHER_S, RAN_TOGETHER_S);
});

test('voice import: a card with clear pauses counts out, on the page and in the importer, and installs each clip', () => {
  const x = take(card(), 0.7);
  const p = page().countTake(x, RATE, 12);
  const s = splitTake(highpass(x, RATE), RATE, ENTRIES);
  assert.equal(s.status, 'ok');
  assert.equal(p.status, 'ok');
  assert.equal(p.found, s.found);
  const r = processTake('g09', x, RATE, ENTRIES, ids);
  assert.equal(r.refused, undefined);
  assert.deepEqual(r.entries.map((e) => e.targets), [['word_bug', 'letter_u_sound'], ['word_ship', 'letter_sh_sound'], ['word_chop', 'letter_ch_sound']]);
  // The held sounds hold on the bridge: a steady tone, a steady hiss.
  for (const e of r.entries.slice(0, 2)) assert.ok(e.repeats.every((q) => q.hold!.ok), `${e.entry.sound} holds`);
});

test('voice import: a card whose pauses are too short is refused, saying where, and the page says the same', () => {
  const x = take(card(), 0.18);
  const s = splitTake(highpass(x, RATE), RATE, ENTRIES);
  const p = page().countTake(x, RATE, 12);
  assert.equal(s.status, 'count');
  assert.equal(p.status, 'count');
  assert.equal(p.found, s.found);
  assert.equal(page().countReason(p), countReason(s));
  assert.match(countReason(s), /ran together at .* leave about a second/);
  const r = processTake('g09', x, RATE, ENTRIES, ids);
  assert.match(r.refused!, /^re-record card 9 \(BUG · SHIP · CHOP\): found \d+ sounds, expected 12/);
  assert.deepEqual(r.entries, []);
});

test('voice import: a silent card is refused as empty; an extra sound is refused too', () => {
  const silent = new Float32Array(RATE * 3);
  assert.equal(page().countTake(silent, RATE, 12).status, 'empty');
  assert.match(processTake('g04', silent, RATE, ENTRIES, ids).refused!, /^re-record card 4 \(BUG · SHIP · CHOP\): no sound/);
  const extra = take([...card(), [0.4, 'tone']], 0.7);
  assert.equal(page().countTake(extra, RATE, 12).found, 13);
  assert.match(processTake('g09', extra, RATE, ENTRIES, ids).refused!, /found 13 sounds, expected 12: an extra sound/);
});

test('voice import: the K card is the CK sound too; a word the game lacks is not installed', () => {
  const entries: Entry[] = [
    { sound: 'k', word: 'key', kind: 'short', repeats: 3 },
    { sound: 'u', word: 'bug', kind: 'hold', repeats: 3 },
    { sound: 'sh', word: 'ship', kind: 'hold', repeats: 3 },
  ];
  const r = processTake('g07', take(card(), 0.7), RATE, entries, ids);
  assert.deepEqual(r.entries[0]!.targets, ['letter_k_sound', 'letter_ck_sound']);
  assert.ok(r.notes.some((n) => /no word KEY/.test(n)));
});

test('voice import: a clip is normalised to -17 dBFS RMS under a -1 dBFS peak, between 30 ms of digital silence', () => {
  const tone = Float32Array.from({ length: RATE / 2 }, (_, i) => 0.02 * Math.sin((2 * Math.PI * 200 * i) / RATE));
  const { data, peakDbfs } = finish(tone, RATE);
  const pad = Math.floor(0.03 * RATE);
  assert.ok(data.subarray(0, pad).every((v) => v === 0) && data.subarray(data.length - pad).every((v) => v === 0));
  const mid = data.subarray(pad + RATE / 10, data.length - pad - RATE / 10);
  const rms = 10 * Math.log10(mid.reduce((a, v) => a + v * v, 0) / mid.length);
  assert.ok(Math.abs(rms - -17) < 0.5, `RMS ${rms.toFixed(1)} dBFS`);
  assert.ok(peakDbfs <= -1 + 1e-9);
});

test('voice import: zips stored or deflated, WAVs 16-bit or float, MP3 frames out', () => {
  const x = Float32Array.from({ length: 4800 }, (_, i) => 0.5 * Math.sin(i / 10));
  const wav = wavBytes(x, RATE);
  // A two-file zip: one stored (as the recorder writes), one deflated (as a re-zip does).
  const files: [string, Buffer, number][] = [['manifest.json', Buffer.from('{"a":1}'), 0], ['takes/g01.wav', wav, 8]];
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let off = 0;
  for (const [name, data, method] of files) {
    const body = method ? deflateRawSync(data) : data;
    const n = Buffer.from(name);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(method, 8);
    h.writeUInt32LE(body.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(n.length, 26);
    local.push(h, n, body);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(method, 10);
    c.writeUInt32LE(body.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(n.length, 28);
    c.writeUInt32LE(off, 42);
    central.push(c, n);
    off += 30 + n.length + body.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(off, 16);
  const got = unzip(Buffer.concat([...local, cd, end]));
  assert.equal(got.get('manifest.json')!.toString(), '{"a":1}');
  const back = readWav(got.get('takes/g01.wav')!);
  assert.equal(back.rate, RATE);
  assert.ok(Math.abs(back.x[100]! - x[100]!) < 1e-4);
  const mp3 = mp3Bytes(x, RATE);
  assert.equal(mp3[0], 0xff);
  assert.equal(mp3[1]! & 0xe0, 0xe0);
});
