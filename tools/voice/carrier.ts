/**
 * Carrier lines (item 085): a sound edge-tts cannot say alone, cut out of a
 * word it says well.
 *
 * edge-tts reads "Aah" as the O of HOT (F2 about 1,200 Hz), never the A of
 * CAT, and every other spelling of a bare short A came back as a letter name
 * or a diphthong (docs/engineering.md, *Letter sounds*). Said inside a word it
 * is right: the A of "Add" is a steady F1 800 / F2 1,700 Hz. So such a line
 * asks edge-tts for the carrier word (`say`, from `carrier` in
 * content/phonics/letters.ts) and keeps only its vowel (`cut`).
 *
 * The cut needs no table of times: the carrier starts on the vowel, so the
 * clip keeps from the onset to where the loudness first falls `keepDb` under
 * the vowel's peak, the start of the closing consonant. A recorded clip still
 * wins over all of this, as over any edge-tts line (build.ts).
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readWav } from './audio.js';
import { envelope } from './split.js';

/** From the peak back to the onset: frames down to this far under the peak are the vowel's attack. */
const ONSET_DB = 30;

const DECODER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'decode_mp3.py');

/** Samples `start`..`end` of the vowel: onset to the first frame `keepDb` under the peak after it. */
export function vowelSpan(x: Float32Array, rate: number, keepDb: number): { start: number; end: number } {
  const { env, hop, win } = envelope(x, rate);
  if (!env.length) return { start: 0, end: x.length };
  let peak = 0;
  for (let k = 1; k < env.length; k++) if (env[k]! > env[peak]!) peak = k;
  const top = env[peak]!;
  let first = peak;
  while (first > 0 && env[first - 1]! >= top - ONSET_DB) first--;
  let last = peak;
  while (last + 1 < env.length && env[last + 1]! >= top - keepDb) last++;
  return { start: first * hop, end: Math.min(x.length, last * hop + win) };
}

/** Decode an mp3 to mono samples at its own rate (tools/voice/decode_mp3.py, under uv). */
export function decodeMp3(mp3: Uint8Array): Promise<{ x: Float32Array; rate: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('uv', ['run', '--no-project', '--with', 'miniaudio', 'python', DECODER], { stdio: ['pipe', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    proc.stdout.on('data', (d: Buffer) => out.push(d));
    proc.stderr.on('data', (d: Buffer) => err.push(d));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`mp3 decode failed (${code}): ${Buffer.concat(err).toString().trim().split('\n').pop()}`));
      try {
        resolve(readWav(Buffer.concat(out)));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    proc.stdin.end(Buffer.from(mp3));
  });
}
