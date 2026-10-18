/**
 * The clip store: recorded audio that overrides edge-tts, line by line.
 *
 * Ported from the clip-store half of Seraphina's `tools/voice/firefly.ts`
 * (`spokenFor`, `spokenHash`, `clipStateFor`, `readClipIndex`,
 * `forgetMissingAudio`). The recording loop itself (tasks, collect, ingest,
 * Firefly) is not ported yet; for now a clip is added by hand-writing an entry
 * into `content/voice/clips/index.json` next to its mp3. That is the path real
 * phoneme recordings will take to replace the letter-sound placeholders.
 *
 * Two fixes made in the port, both from the audit:
 * - The hash covers `text` as well as `say`. In Seraphina it was computed from
 *   `say ?? text`, so editing only `text` on a line with a `say` did not mark
 *   its recording stale.
 * - The build fingerprint includes the speaker id (see build.ts).
 *
 * The hash is the only guard: nothing here ever infers that a clip matches its
 * line. A mismatch means the line was edited after it was recorded, and the
 * build falls back to edge-tts, loudly.
 */

import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { LineSpec, TimedWord } from './types.js';

export const CLIP_DIR = path.join('content', 'voice', 'clips');
export const CLIP_INDEX = path.join(CLIP_DIR, 'index.json');

/** The text a recording must have said, as a pure function of the line. */
export function spokenFor(line: LineSpec): string {
  const raw = (line.say ?? line.text).trim().replace(/\s+/g, ' ');
  return /[.!?…]$/.test(raw) ? raw : `${raw}.`;
}

/** What the stored hash covers: the spoken text AND the display text. */
export function spokenHash(line: LineSpec): string {
  return createHash('sha256')
    .update(JSON.stringify({ spoken: spokenFor(line), text: line.text.trim() }))
    .digest('hex')
    .slice(0, 16);
}

export interface ClipRecord {
  /** Who made it: `matt`, `firefly`, `simulated`. Coverage counts only real ones. */
  provider: string;
  speaker: string;
  /** What was recorded, verbatim, and its hash. */
  spoken: string;
  spokenHash: string;
  /** File name inside CLIP_DIR. */
  audio: string;
  /**
   * Word spans. A single-phoneme clip needs no aligner: one word, the whole clip.
   */
  words: TimedWord[];
  ingested: string;
}

export interface ClipIndex {
  version: number;
  clips: Record<string, ClipRecord>;
}

export async function readClipIndex(file = CLIP_INDEX): Promise<ClipIndex> {
  try {
    const index = JSON.parse(await readFile(file, 'utf8')) as ClipIndex;
    index.clips ??= {};
    return index;
  } catch {
    return { version: 1, clips: {} };
  }
}

export type ClipState =
  | { state: 'fresh'; clip: ClipRecord }
  | { state: 'stale'; clip: ClipRecord }
  | { state: 'missing' };

export function clipStateFor(line: LineSpec, index: ClipIndex): ClipState {
  const clip = index.clips[line.id];
  if (!clip) return { state: 'missing' };
  // A line moved to another speaker is stale too: the recording is the wrong voice.
  return clip.spokenHash === spokenHash(line) && clip.speaker === line.speaker ? { state: 'fresh', clip } : { state: 'stale', clip };
}

/** Forget clips whose audio was deleted by hand, so they read as gaps, not errors. */
export async function forgetMissingAudio(index: ClipIndex, dir = CLIP_DIR): Promise<string[]> {
  const dropped: string[] = [];
  for (const [id, clip] of Object.entries(index.clips)) {
    const there = await stat(path.join(dir, clip.audio)).then(
      () => true,
      () => false,
    );
    if (!there) {
      delete index.clips[id];
      dropped.push(id);
    }
  }
  return dropped;
}

/** Was this module the one that was run, rather than imported? */
export function isMain(url: string): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && path.resolve(entry!) === path.resolve(fileURLToPath(url));
}
