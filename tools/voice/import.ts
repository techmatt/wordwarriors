/**
 * `npm run voice:import -- <zip> [--take gNN] [--allow-short] [--dry]`: put a phonics-recorder
 * zip (tools/recorder/phonics-recorder.html) into the game.
 *
 * Each take (a card: three words, each followed by its sound three times) is
 * split by `split.ts`, checked, and cut into clips: the word, and of the three
 * sound repeats the most typical one (the medoid) that passes the bridge's
 * hold check (src/audio/holdSound.ts), falling back to the next closest. Clips
 * are faded, normalised and padded, encoded as mono MP3, and installed as
 * `content/voice/clips/<id>.<hash8>.mp3` for `letter_<x>_sound` and, where the
 * game has the word, `word_<word>`; the hash in the name makes `voice:build`
 * rebuild a re-record. A take that is empty or doesn't count out writes
 * nothing and says which card to re-record.
 *
 * Every run writes `voice-import/review.html` in the scratch home (`tools/scratch.ts`): each take's envelope
 * with its cuts, every clip with a player and its target id, and the bridge's
 * cut of each repeat. `--dry` writes only that. Then run `npm run voice:build`.
 *
 * `--allow-short` (item 161, Matt's call): a held sound none of whose repeats
 * passes the hold check still goes in, as the repeat with the longest steady
 * part that the bridge does hold, rather than being skipped (Matt's F, 0.09 s
 * against MIN_STEADY_S's 0.1 s). He judges it by ear on `?scene=listen`.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';

import { bridgeMode } from '../../content/phonics/letters.js';
import { letterSoundLine, wordLine } from '../../content/voice/ids.js';
import { holdPlan, holdSamples, type HoldMode } from '../../src/audio/holdSound.js';
import { describeMissing, writeMissing } from '../recorder/missing.js';
import { scratchArg, scratchPath } from '../scratch.js';
import { readLines, runMain } from '../shared.js';
import { mp3Bytes, readWav, wavBytes } from './audio.js';
import { CLIP_DIR, CLIP_INDEX, clipRecord, dropUnused, installClip, readClipIndex, type ClipIndex } from './clips.js';
import { FINISH, MIN_STEADY_S, SPLIT, countReason, finish, highpass, rankRepeats, splitTake, type Cut, type Entry, type TakeSplit } from './split.js';
import type { LineSpec } from './types.js';

const FORMATS = ['phonics-recorder/1', 'phonics-recorder/2'];
/** Format 1 had no required name; every format-1 zip so far is Matt's. */
const DEFAULT_RECORDER = 'Matt';
/** Sounds recorded once that the game has more lines for: the K card is the C-K sound too. */
const ALSO = { k: ['ck'] } as Record<string, string[]>;
const REVIEW_DIR = scratchPath('voice-import');
const REVIEW = path.join(REVIEW_DIR, 'review.html');
const REVIEW_AUDIO = path.join(REVIEW_DIR, 'review');

interface Manifest {
  format: string;
  recorder: string | null;
  takes: { file: string; group: string; seconds?: number; entries: Entry[] }[];
  missing?: string[];
}

// ---- Reading the zip -------------------------------------------------------

/** The files in a zip, stored or deflated (the recorder stores; a re-zip deflates). */
export function unzip(buf: Buffer): Map<string, Buffer> {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(e + 10);
  let at = buf.readUInt32LE(e + 16);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(at) !== 0x02014b50) throw new Error('a broken zip (central directory)');
    const method = buf.readUInt16LE(at + 10);
    const size = buf.readUInt32LE(at + 20);
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    const local = buf.readUInt32LE(at + 42);
    const name = buf.toString('utf8', at + 46, at + 46 + nameLen);
    const data = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(data, data + size);
    if (method === 0) out.set(name, raw);
    else if (method === 8) out.set(name, inflateRawSync(raw));
    else throw new Error(`${name}: zip compression method ${method} is not handled`);
    at += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

// ---- One take --------------------------------------------------------------

export interface HoldCheck {
  mode: HoldMode;
  asked: HoldMode;
  playedS: number;
  steadyS?: number;
  ok: boolean;
}

/** What the bridge makes of a clip: a held sound needs a steady part of MIN_STEADY_S or more; a whole one (F, item 162) is taken as it is. */
export function holdCheck(x: Float32Array, rate: number, asked: HoldMode): HoldCheck {
  const p = holdPlan(x, rate, asked);
  const steadyS = p.steadyStart === undefined ? undefined : (p.end - p.steadyStart) / rate;
  const ok = asked !== 'hold' ? p.mode === asked : p.mode === 'hold' && (steadyS ?? 0) >= MIN_STEADY_S;
  return { mode: p.mode, asked, playedS: (p.end - p.start) / rate, ...(steadyS === undefined ? {} : { steadyS }), ok };
}

interface Clip {
  /** The line it goes to, or null for a repeat that wasn't picked. */
  id: string | null;
  data: Float32Array;
  seconds: number;
  gainDb: number;
  label: string;
  hold?: HoldCheck;
  distance?: number;
  picked?: boolean;
  /** For the review: the bridge's cut, as it plays. */
  preview?: Float32Array;
}

interface TakeResult {
  group: string;
  card: number;
  name: string;
  split: TakeSplit;
  rate: number;
  take: Float32Array;
  /** Plain words: why nothing was installed, or what was skipped. */
  refused?: string;
  notes: string[];
  entries: { entry: Entry; word: Clip; repeats: Clip[]; targets: string[] }[];
}

const cardOf = (group: string) => Number(group.replace(/\D/g, '')) || 0;

/** The bridge's cut, as the bridge plays it: once (item 090: nothing loops). */
function preview(x: Float32Array, rate: number, mode: HoldMode): Float32Array {
  return holdSamples(x, holdPlan(x, rate, mode), rate);
}

export function processTake(group: string, raw: Float32Array, rate: number, entries: Entry[], lineIds: Set<string>, allowShort = false): TakeResult {
  const card = cardOf(group);
  const name = entries.map((e) => e.word.toUpperCase()).join(' · ');
  const x = highpass(raw, rate);
  const split = splitTake(x, rate, entries);
  const res: TakeResult = { group, card, name, split, rate, take: x, notes: [], entries: [] };
  if (split.status === 'empty') {
    res.refused = `re-record card ${card} (${name}): no sound (its loudest moment is ${split.peakDbfs < -150 ? 'digital silence' : `${split.peakDbfs.toFixed(0)} dBFS`})`;
    return res;
  }
  if (split.status === 'count') {
    res.refused = `re-record card ${card} (${name}): ${countReason(split)}`;
    return res;
  }
  let k = 0;
  const clip = (c: Cut, label: string): Clip => {
    const f = finish(x.subarray(c.start, c.end), rate);
    return { id: null, data: f.data, seconds: f.data.length / rate, gainDb: f.gainDb, label };
  };
  for (const e of entries) {
    const cuts = split.cuts.slice(k, k + 1 + e.repeats);
    k += 1 + e.repeats;
    const word = clip(cuts[0]!, e.word.toUpperCase());
    const asked = bridgeMode(e.sound);
    if ((e.kind === 'hold') !== (asked === 'hold')) res.notes.push(`card ${card}: the recorder asked for ${e.sound} as ${e.kind}, the game plays it ${asked}`);
    const repeats = cuts.slice(1).map((c, n) => {
      const r = clip(c, `${e.sound} r${n + 1}`);
      r.hold = holdCheck(r.data, rate, asked);
      r.preview = preview(r.data, rate, asked);
      return r;
    });
    const { order, distance } = rankRepeats(cuts.slice(1).map((c) => ({ seg: x.subarray(c.start, c.end), coreS: c.core[1] - c.core[0] })));
    repeats.forEach((r, n) => (r.distance = distance[n]));
    let pick = order.find((n) => repeats[n]!.hold!.ok);
    let short = false;
    if (pick === undefined && allowShort && asked === 'hold') {
      // The longest steady part among the repeats the bridge holds at all.
      const held = order.filter((n) => repeats[n]!.hold!.mode === 'hold');
      if (held.length) {
        pick = held.reduce((a, b) => ((repeats[b]!.hold!.steadyS ?? 0) > (repeats[a]!.hold!.steadyS ?? 0) ? b : a));
        short = true;
      }
    }
    const failed = repeats.filter((r) => !r.hold!.ok).map((r) => r.label.split(' ')[1]);
    const targets: string[] = [];
    if (lineIds.has(wordLine(e.word))) {
      word.id = wordLine(e.word);
      targets.push(word.id);
    } else res.notes.push(`card ${card}: the game has no word ${e.word.toUpperCase()}, so its word clip is not used`);
    if (pick === undefined) {
      const best = Math.max(...repeats.map((r) => r.hold!.steadyS ?? 0));
      res.notes.push(
        `card ${card}: no repeat of ${e.sound.toUpperCase()} holds on the bridge (its longest steady part is ${best.toFixed(2)} s, it needs ${MIN_STEADY_S} s): the sound is skipped; re-record it stretched, half a second or so of the sound itself`,
      );
    } else {
      const r = repeats[pick]!;
      r.picked = true;
      r.id = letterSoundLine(e.sound);
      targets.push(r.id, ...(ALSO[e.sound] ?? []).map(letterSoundLine));
      if (short) res.notes.push(`card ${card}: ${e.sound.toUpperCase()} holds only ${r.hold!.steadyS!.toFixed(2)} s (under ${MIN_STEADY_S} s); ${r.label.split(' ')[1]} is used anyway (--allow-short)`);
      else if (failed.length) res.notes.push(`card ${card}: ${e.sound.toUpperCase()} ${failed.join(', ')} fail the hold check; ${r.label.split(' ')[1]} is used${pick === order[0] ? '' : ' (not the closest repeat)'}`);
    }
    res.entries.push({ entry: e, word, repeats, targets });
  }
  return res;
}

// ---- Installing ------------------------------------------------------------

/**
 * Waiting clips whose line now exists move into `clips`. A line that already
 * has a clip (recorded since, by `voice:clip` or a later import) keeps it, and
 * the older waiting take is dropped.
 */
async function promoteWaiting(index: ClipIndex, lines: Map<string, LineSpec>): Promise<string[]> {
  const moved: string[] = [];
  for (const [id, w] of Object.entries(index.waiting ?? {})) {
    const line = lines.get(id);
    if (!line) continue;
    delete index.waiting![id];
    if (index.clips[id]) {
      await dropUnused(index, [w.audio]);
      continue;
    }
    index.clips[id] = clipRecord(line, w.audio, w.seconds, w.provider);
    moved.push(id);
  }
  if (index.waiting && !Object.keys(index.waiting).length) delete index.waiting;
  return moved;
}

// ---- The review page -------------------------------------------------------

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const COLOURS = ['#3b82f6', '#f59e0b', '#10b981'];

function waveform(t: TakeResult): string {
  const W = 1100;
  const H = 150;
  const lo = -90;
  const hi = -15;
  const { env } = t.split;
  const secs = t.split.seconds;
  const xOf = (s: number) => (s / secs) * W;
  const yOf = (d: number) => H - ((Math.max(lo, Math.min(hi, d)) - lo) / (hi - lo)) * (H - 20);
  const pts = Array.from(env, (v, i) => `${xOf(i * SPLIT.hopS).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const p = [`<svg width="${W}" height="${H + 18}" style="background:#111;border-radius:6px">`];
  const labels = t.entries.length
    ? t.entries.flatMap((e, i) => [[e.entry.word.toUpperCase(), COLOURS[i % 3]!], ...e.repeats.map((r) => [r.label, COLOURS[i % 3]!])])
    : t.split.cuts.map((_, k) => [`#${k + 1}`, '#ef4444']);
  t.split.cuts.forEach((c, k) => {
    const [label, col] = labels[k] ?? [`#${k + 1}`, '#ef4444'];
    const x0 = xOf(c.start / t.rate);
    const x1 = xOf(c.end / t.rate);
    p.push(`<rect x="${x0.toFixed(1)}" y="0" width="${(x1 - x0).toFixed(1)}" height="${H}" fill="${col}" opacity="0.22"/>`);
    p.push(`<line x1="${x0.toFixed(1)}" x2="${x0.toFixed(1)}" y1="0" y2="${H}" stroke="${col}"/><line x1="${x1.toFixed(1)}" x2="${x1.toFixed(1)}" y1="0" y2="${H}" stroke="${col}"/>`);
    p.push(`<text x="${(x0 + 2).toFixed(1)}" y="12" fill="#eee" font-size="11">${esc(label!)}</text>`);
  });
  for (const d of t.split.dropped) {
    const x0 = xOf(d.start);
    p.push(`<rect x="${x0.toFixed(1)}" y="0" width="${Math.max(2, xOf(d.end) - x0).toFixed(1)}" height="${H}" fill="#ef4444" opacity="0.5"><title>dropped: ${d.why}, ${d.peakDb.toFixed(0)} dB</title></rect>`);
  }
  for (const [label, d, col] of [['threshold', t.split.threshDb, '#f87171'], ['floor', t.split.floorDb, '#666']] as const) {
    if (d === undefined) continue;
    p.push(`<line x1="0" x2="${W}" y1="${yOf(d).toFixed(1)}" y2="${yOf(d).toFixed(1)}" stroke="${col}" stroke-dasharray="4 3"/>`);
    p.push(`<text x="${W - 4}" y="${(yOf(d) - 3).toFixed(1)}" fill="${col}" font-size="10" text-anchor="end">${label} ${d.toFixed(0)} dB</text>`);
  }
  p.push(`<polyline points="${pts}" fill="none" stroke="#e5e7eb" stroke-width="1"/>`);
  for (let s = 0; s <= secs; s++) p.push(`<text x="${xOf(s).toFixed(1)}" y="${H + 14}" fill="#888" font-size="10">${s}s</text>`);
  p.push('</svg>');
  return p.join('');
}

async function writeReview(zip: string, manifest: Manifest, recorder: string, results: TakeResult[], dry: boolean): Promise<void> {
  await rm(REVIEW_AUDIO, { recursive: true, force: true });
  await mkdir(REVIEW_AUDIO, { recursive: true });
  const audio = async (file: string, x: Float32Array, rate: number, mp3 = true) => {
    const name = `${file}.${mp3 ? 'mp3' : 'wav'}`;
    await writeFile(path.join(REVIEW_AUDIO, name), mp3 ? mp3Bytes(x, rate) : wavBytes(x, rate));
    return `<audio controls preload="none" src="review/${esc(name)}"></audio>`;
  };
  const h = [
    '<!doctype html><meta charset=utf-8><title>Voice import review</title>',
    '<style>body{font:14px system-ui;background:#1b1b1f;color:#ddd;margin:24px;max-width:1150px}h2{margin-top:36px}table{border-collapse:collapse;margin:8px 0}td,th{padding:4px 10px;border-bottom:1px solid #333;text-align:left;vertical-align:middle}code{color:#93c5fd}.pick{background:#14532d55}.bad{color:#f87171}.ok{color:#4ade80}.note{color:#999;font-size:12px}audio{height:30px}</style>',
    `<h1>Voice import review: ${esc(path.basename(zip))}</h1>`,
    `<p>Recorded by ${esc(recorder)}. ${dry ? '<b>Dry run</b>: nothing was installed.' : 'Clips marked with a target id were installed into <code>content/voice/clips/</code>.'}</p>`,
    // The numbers are split.ts's, so tuning it keeps this page true.
    `<p class=note>Each card: its envelope (${Math.round(SPLIT.winS * 1000)} ms RMS in dB, after an ${SPLIT.highpassHz} Hz high-pass) with each cut shaded, the detection threshold and the floor. Then each entry: the word clip and the three sound repeats, each with what the Stretchy Bridge makes of it (src/audio/holdSound.ts) and a <b>bridge</b> preview: the cut as the bridge plays it, once. The picked repeat is green. Clips are trimmed, faded, normalised to ${FINISH.targetRmsDb} dBFS RMS (peak at most ${FINISH.peakCeilDb} dBFS) and padded with ${Math.round(FINISH.padS * 1000)} ms of silence.</p>`,
    `<p class=note>Cards missing from this zip: ${esc((manifest.missing ?? []).join(', ') || 'none')}.</p>`,
  ];
  for (const t of results) {
    h.push(`<h2>Card ${t.card} (${t.group}): ${esc(t.name)} <span class=${t.refused ? 'bad' : 'ok'}>${t.refused ? 'refused' : 'OK'}</span></h2>`);
    if (t.refused) h.push(`<p class=bad>${esc(t.refused)}</p>`);
    for (const n of t.notes) h.push(`<p class=note>${esc(n)}</p>`);
    const s = t.split;
    h.push(`<p class=note>${s.seconds.toFixed(1)} s at ${t.rate} Hz, peak ${s.peakDbfs < -150 ? 'digital silence' : `${s.peakDbfs.toFixed(1)} dBFS`}, expected ${s.expected} sounds, found ${s.found}${s.dropped.length ? `; dropped ${s.dropped.map((d) => `${d.start.toFixed(2)} s (${d.why})`).join(', ')}` : ''}</p>`);
    if (s.status === 'empty') continue;
    h.push(waveform(t));
    let peak = 0;
    for (const v of t.take) peak = Math.max(peak, Math.abs(v));
    h.push(`<p>Whole card (peak-normalised): ${await audio(`${t.group}_take`, t.take.map((v) => (v / Math.max(peak, 1e-9)) * 0.9), t.rate)}</p>`);
    for (const e of t.entries) {
      h.push(`<h3>${esc(e.entry.word.toUpperCase())} / ${esc(e.entry.sound)} <span class=note>(${esc(e.entry.kind)}; installs ${esc(e.targets.join(', ') || 'nothing')})</span></h3><table>`);
      h.push('<tr><th>target id</th><th>clip</th><th>length</th><th>gain</th><th>bridge cut</th><th>bridge</th></tr>');
      const w = e.word;
      h.push(`<tr><td>${w.id ? `<code>${w.id}</code>` : '<span class=note>not in the game</span>'}</td><td>${await audio(`${t.group}_${e.entry.word}`, w.data, t.rate)}</td><td>${w.seconds.toFixed(2)} s</td><td>${w.gainDb >= 0 ? '+' : ''}${w.gainDb.toFixed(1)} dB</td><td></td><td></td></tr>`);
      for (const r of e.repeats) {
        const hd = r.hold!;
        const desc = `${hd.mode}, plays ${hd.playedS.toFixed(2)} s${hd.steadyS === undefined ? '' : `, steady ${hd.steadyS.toFixed(2)} s`} <span class=${hd.ok ? 'ok' : 'bad'}>${hd.ok ? 'ok' : 'fails'}</span>`;
        const tag = r.picked ? `<code>${e.targets.filter((id) => id !== w.id).join('</code>, <code>')}</code> ← picked` : `<span class=note>${esc(r.label)}</span>`;
        const file = `${t.group}_${e.entry.sound}_${r.label.split(' ')[1]}`;
        h.push(
          `<tr class=${r.picked ? 'pick' : ''}><td>${tag}</td><td>${await audio(file, r.data, t.rate)}</td><td>${r.seconds.toFixed(2)} s</td><td>${r.gainDb >= 0 ? '+' : ''}${r.gainDb.toFixed(1)} dB</td><td>${desc}<br><span class=note>distance ${r.distance!.toFixed(2)}</span></td><td>${await audio(`${file}_bridge`, r.preview!, t.rate, false)}</td></tr>`,
        );
      }
      h.push('</table>');
    }
  }
  await writeFile(REVIEW, `${h.join('\n')}\n`);
}

// ---- The command -----------------------------------------------------------

export async function voiceImport(argv: string[]): Promise<void> {
  let zip: string | undefined;
  let only: string | undefined;
  let dry = false;
  let allowShort = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--dry') dry = true;
    else if (a === '--allow-short') allowShort = true;
    else if (a === '--take') {
      only = argv[++i];
      if (!only || only.startsWith('--')) throw new Error('voice:import: --take needs a card, e.g. --take g04 (or 4)');
    }
    else if (!a.startsWith('--') && !zip) zip = scratchArg(a);
    else throw new Error(`voice:import: what is "${a}"?`);
  }
  if (!zip) throw new Error('usage: npm run voice:import -- <zip> [--take gNN] [--allow-short] [--dry]');
  if (only && /^\d+$/.test(only)) only = `g${only.padStart(2, '0')}`;
  const files = unzip(await readFile(zip));
  const mf = files.get('manifest.json');
  if (!mf) throw new Error(`${zip} has no manifest.json: is it a phonics-recorder zip?`);
  const manifest = JSON.parse(mf.toString('utf8')) as Manifest;
  if (!FORMATS.includes(manifest.format)) throw new Error(`${zip} is format "${manifest.format}"; this importer reads ${FORMATS.join(', ')}`);
  const recorder = manifest.recorder?.trim() || (manifest.format === 'phonics-recorder/1' ? DEFAULT_RECORDER : null);
  if (!recorder) throw new Error(`${zip} names nobody as its recorder`);
  // Who made it, as the clips' provider: any name's letters, never quietly someone else's.
  const provider = recorder.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
  if (!provider) throw new Error(`${zip}: the recorder's name "${recorder}" has no letters in it`);
  const takes = manifest.takes.filter((t) => !only || t.group === only);
  if (!takes.length) throw new Error(only ? `${zip} has no take ${only} (it has ${manifest.takes.map((t) => t.group).join(', ')})` : `${zip} has no takes`);

  const lines = new Map((await readLines()).map((l) => [l.id, l]));
  const ids = new Set(lines.keys());
  const results: TakeResult[] = [];
  for (const t of takes) {
    const wav = files.get(t.file);
    if (!wav) throw new Error(`${zip} lists ${t.file} but doesn't have it`);
    const { x, rate } = readWav(wav);
    results.push(processTake(t.group, x, rate, t.entries, ids, allowShort));
  }
  await writeReview(zip, manifest, recorder, results, dry);

  const index = await readClipIndex();
  const report: string[] = [];
  if (!dry) await mkdir(CLIP_DIR, { recursive: true });
  for (const t of results) {
    if (t.refused) {
      report.push(`  card ${String(t.card).padStart(2)} ${t.name}: REFUSED. ${t.refused}`);
      continue;
    }
    const done: string[] = [];
    for (const e of t.entries) {
      const clips = [e.word, ...e.repeats.filter((r) => r.picked)];
      for (const c of clips) {
        const targets = c === e.word ? (c.id ? [c.id] : []) : e.targets.filter((id) => id !== e.word.id);
        for (const id of targets) {
          const how = dry ? 'would install' : await installClip(index, id, mp3Bytes(c.data, t.rate), c.seconds, provider, `${e.entry.word} ${e.entry.sound}`, lines);
          done.push(how === 'installed' ? id : `${id} (${how})`);
        }
      }
    }
    report.push(`  card ${String(t.card).padStart(2)} ${t.name}: ${done.join(', ')}`);
  }
  const moved = dry ? [] : await promoteWaiting(index, lines);
  if (!dry) await writeFile(CLIP_INDEX, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`voice:import ${path.basename(zip)} (recorded by ${recorder})${dry ? ', dry run: nothing installed' : ''}`);
  for (const r of report) console.log(r);
  for (const t of results) for (const n of t.notes) console.log(`  note: ${n}`);
  if (moved.length) console.log(`  waiting clips now in the game: ${moved.join(', ')}`);
  console.log(`review: ${REVIEW}`);
  const refused = results.filter((t) => t.refused).length;
  if (refused) console.log(`${refused} card${refused > 1 ? 's' : ''} to re-record (above); the rest are in.`);
  // A sound recorded leaves the recorder's ?missing (item 158).
  if (!dry) {
    const { missing, changed } = await writeMissing();
    if (changed) for (const l of describeMissing(missing)) console.log(l);
  }
  if (!dry && results.some((t) => !t.refused)) console.log('Now run npm run voice:build.');
}

runMain(import.meta.url, () => voiceImport(process.argv.slice(2)));
