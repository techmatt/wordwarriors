/**
 * `npm run voice:clip -- <line-id> <audio.mp3> [seconds]`: put a recording in
 * place of a line.
 *
 * Copies the mp3 into content/voice/clips/ as `<id>.<hash8>.mp3` (the hash in
 * the name makes `voice:build` rebuild a re-record) and writes its index entry
 * with the hash of the line as it stands now, so the build uses it until the
 * line's text changes. The file it replaces, and a take `voice:import` kept
 * waiting for this line, are deleted. For single-word lines (letter sounds,
 * word confirmations) the one word spans the whole clip; pass its length in
 * seconds if known (default 0.5). Then run `npm run voice:build`.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { readLines, runMain } from '../shared.js';
import { CLIP_DIR, CLIP_INDEX, installClip, readClipIndex } from './clips.js';

export async function addClip(argv: string[]): Promise<void> {
  const [id, file, secs] = argv;
  if (!id || !file) throw new Error('usage: npm run voice:clip -- <line-id> <audio.mp3> [seconds]');
  const line = (await readLines()).find((l) => l.id === id);
  if (!line) throw new Error(`no line "${id}" in content/voice/lines.json`);
  const tokens = line.text.trim().split(/\s+/);
  if (tokens.length !== 1 && !secs) console.warn(`"${line.text}" has ${tokens.length} words; without an aligner they all share the clip evenly`);
  await mkdir(CLIP_DIR, { recursive: true });
  const index = await readClipIndex();
  await installClip(index, id, await readFile(file), Number(secs ?? 0.5), 'matt', path.basename(file), new Map([[id, line]]));
  await writeFile(CLIP_INDEX, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`clip: ${id} ← ${file}. Now run npm run voice:build.`);
}

runMain(import.meta.url, () => addClip(process.argv.slice(2)));
