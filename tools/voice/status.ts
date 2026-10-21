/**
 * `npm run voice:status`: what is recorded, what is stale, what is still edge-tts.
 *
 * The letter sounds are listed by name first, because they are the lines that
 * matter most and the ones edge-tts cannot say properly (docs/recording.md).
 */

import { isMain, readLines } from '../shared.js';
import { clipStateFor, readClipIndex } from './clips.js';

export async function voiceStatus(): Promise<void> {
  const lines = await readLines();
  const index = await readClipIndex();
  const by = { fresh: [] as string[], stale: [] as string[], missing: [] as string[] };
  for (const l of lines) by[clipStateFor(l, index).state].push(l.id);

  // The sounds only: the letter names (item 033, `letter_<x>_name`) are ordinary lines.
  const letters = lines.filter((l) => l.id.startsWith('letter_') && l.id.endsWith('_sound'));
  // The sound key, whole: `letter_long_a_sound` is long_a, not l.
  const lettersLeft = letters.filter((l) => clipStateFor(l, index).state !== 'fresh').map((l) => l.id.slice('letter_'.length, -'_sound'.length));
  console.log(`voice: ${lines.length} lines; ${by.fresh.length} recorded, ${by.stale.length} stale, ${by.missing.length} on edge-tts`);
  console.log(`letter sounds still placeholder (${lettersLeft.length}/${letters.length}): ${lettersLeft.join(' ') || 'none'}`);
  if (by.stale.length) console.log(`stale (re-record): ${by.stale.join(', ')}`);
}

if (isMain(import.meta.url)) {
  voiceStatus().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
