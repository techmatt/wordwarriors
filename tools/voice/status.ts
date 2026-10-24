/**
 * `npm run voice:status`: what is recorded, what is stale, what is still edge-tts.
 *
 * The letter sounds are listed by name first, because they are the lines that
 * matter most and the ones edge-tts cannot say properly (docs/recording.md).
 */

import { DIGRAPH_SOUNDS, LETTERS, LONG_VOWEL_SOUNDS } from '../../content/phonics/letters.js';
import { letterSoundLine } from '../../content/voice/ids.js';
import { readLines, runMain } from '../shared.js';
import { clipStateFor, readClipIndex } from './clips.js';

async function voiceStatus(): Promise<void> {
  const lines = await readLines();
  const index = await readClipIndex();
  const by = { fresh: [] as string[], stale: [] as string[], missing: [] as string[] };
  for (const l of lines) by[clipStateFor(l, index).state].push(l.id);

  // The sounds only, by their builder (compose.ts makes the same set), each listed by its key.
  const byId = new Map(lines.map((l) => [l.id, l]));
  const letters = [...LETTERS, ...DIGRAPH_SOUNDS, ...LONG_VOWEL_SOUNDS].flatMap((s) => {
    const line = byId.get(letterSoundLine(s.letter));
    return line ? [{ letter: s.letter, line }] : [];
  });
  const lettersLeft = letters.filter((l) => clipStateFor(l.line, index).state !== 'fresh').map((l) => l.letter);
  console.log(`voice: ${lines.length} lines; ${by.fresh.length} recorded, ${by.stale.length} stale, ${by.missing.length} on edge-tts`);
  console.log(`letter sounds still placeholder (${lettersLeft.length}/${letters.length}): ${lettersLeft.join(' ') || 'none'}`);
  if (by.stale.length) console.log(`stale (re-record): ${by.stale.join(', ')}`);
}

runMain(import.meta.url, () => voiceStatus());
