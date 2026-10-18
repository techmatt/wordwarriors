/**
 * `npm run voice:status`: what is recorded, what is stale, what is still edge-tts.
 *
 * The letter sounds are listed by name first, because they are the lines that
 * matter most and the ones edge-tts cannot say properly (docs/recording.md).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { clipStateFor, isMain, readClipIndex } from './clips.js';
import type { LineSpec } from './types.js';

export async function voiceStatus(): Promise<void> {
  const lines = JSON.parse(await readFile(path.join('content', 'voice', 'lines.json'), 'utf8')) as LineSpec[];
  const index = await readClipIndex();
  const by = { fresh: [] as string[], stale: [] as string[], missing: [] as string[] };
  for (const l of lines) by[clipStateFor(l, index).state].push(l.id);

  const letters = lines.filter((l) => l.id.startsWith('letter_'));
  const lettersLeft = letters.filter((l) => clipStateFor(l, index).state !== 'fresh').map((l) => l.id.slice(7, 8));
  console.log(`voice: ${lines.length} lines; ${by.fresh.length} recorded, ${by.stale.length} stale, ${by.missing.length} on edge-tts`);
  console.log(`letter sounds still placeholder (${lettersLeft.length}/26): ${lettersLeft.join(' ') || 'none'}`);
  if (by.stale.length) console.log(`stale (re-record): ${by.stale.join(', ')}`);
}

if (isMain(import.meta.url)) {
  voiceStatus().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
