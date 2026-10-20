/**
 * `npm run voice:clip -- <line-id> <audio.mp3> [seconds]`: put a recording in
 * place of a line.
 *
 * Copies the mp3 into content/voice/clips/ and writes its index entry with
 * the hash of the line as it stands now, so the build uses it until the line's
 * text changes. For single-word lines (letter sounds, word confirmations) the
 * one word spans the whole clip; pass its length in seconds if known (default
 * 0.5). Then run `npm run voice:build`.
 */

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { CLIP_DIR, CLIP_INDEX, isMain, readClipIndex, spokenFor, spokenHash, type ClipRecord } from './clips.js';
import type { LineSpec } from './types.js';

export const readLines = async () => JSON.parse(await readFile(path.join('content', 'voice', 'lines.json'), 'utf8')) as LineSpec[];

/**
 * A line's clip entry: the hash of the line as it stands, and its words
 * spread evenly over `seconds` (one word, a letter sound or a word
 * confirmation, spans the whole clip). `voice:import` installs through this too.
 */
export function clipRecord(line: LineSpec, audio: string, seconds: number, provider = 'matt'): ClipRecord {
  const tokens = line.text.trim().split(/\s+/);
  return {
    provider,
    speaker: line.speaker,
    spoken: spokenFor(line),
    spokenHash: spokenHash(line),
    audio,
    words: tokens.map((w, i) => ({ word: w.replace(/[^\p{L}\p{N}'-]/gu, ''), start: (seconds * i) / tokens.length, end: (seconds * (i + 1)) / tokens.length })),
    ingested: new Date().toISOString().slice(0, 10),
  };
}

export async function addClip(argv: string[]): Promise<void> {
  const [id, file, secs] = argv;
  if (!id || !file) throw new Error('usage: npm run voice:clip -- <line-id> <audio.mp3> [seconds]');
  const line = (await readLines()).find((l) => l.id === id);
  if (!line) throw new Error(`no line "${id}" in content/voice/lines.json`);
  const tokens = line.text.trim().split(/\s+/);
  if (tokens.length !== 1 && !secs) console.warn(`"${line.text}" has ${tokens.length} words; without an aligner they all share the clip evenly`);
  await mkdir(CLIP_DIR, { recursive: true });
  const audio = `${id}.mp3`;
  await copyFile(file, path.join(CLIP_DIR, audio));
  const index = await readClipIndex();
  index.clips[id] = clipRecord(line, audio, Number(secs ?? 0.5));
  await writeFile(CLIP_INDEX, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`clip: ${id} ← ${file}. Now run npm run voice:build.`);
}

if (isMain(import.meta.url)) {
  addClip(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
