/**
 * The clip store: recorded audio that overrides edge-tts, line by line.
 *
 * Ported from the clip-store half of Seraphina's `tools/voice/firefly.ts`
 * (`spokenFor`, `spokenHash`, `clipStateFor`, `readClipIndex`,
 * `forgetMissingAudio`). The Firefly recording loop (tasks, collect, ingest) was
 * never ported. Clips come from `npm run voice:clip` (one mp3 by hand,
 * addClip.ts) and `npm run voice:import` (a phonics-recorder zip, import.ts),
 * both through `installClip` here: each is `<id>.<hash8>.mp3` in
 * `content/voice/clips/` with its entry in `index.json`. A recording for a line
 * the game doesn't have yet waits in the index's `waiting` until the line exists.
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
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { exists } from '../shared.js';
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
  /** Who recorded it: `matt` from `voice:clip`, or the recorder's name slug from `voice:import`. */
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

/** A recording `voice:import` made for a line the game doesn't have yet. */
interface WaitingClip {
  provider: string;
  /** What was asked for: the recorder's word and sound. */
  recorded: string;
  audio: string;
  seconds: number;
  ingested: string;
}

export interface ClipIndex {
  version: number;
  clips: Record<string, ClipRecord>;
  /** By the line id it is for; `voice:import` moves each into `clips` once that line exists. */
  waiting?: Record<string, WaitingClip>;
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

type ClipState =
  | { state: 'fresh'; clip: ClipRecord }
  | { state: 'stale'; clip: ClipRecord }
  | { state: 'missing' };

export function clipStateFor(line: LineSpec, index: ClipIndex): ClipState {
  const clip = index.clips[line.id];
  if (!clip) return { state: 'missing' };
  // A line moved to another speaker is stale too: the recording is the wrong voice.
  return clip.spokenHash === spokenHash(line) && clip.speaker === line.speaker ? { state: 'fresh', clip } : { state: 'stale', clip };
}

/**
 * A line's clip entry: the hash of the line as it stands, and its words
 * spread evenly over `seconds` (one word, a letter sound or a word
 * confirmation, spans the whole clip).
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

const hash8 = (b: Uint8Array) => createHash('sha256').update(b).digest('hex').slice(0, 8);

/**
 * Write the clip as `<id>.<hash8>.mp3` (the hash in the name makes
 * `voice:build` rebuild a re-record) and point its line (or, with no line yet,
 * its waiting entry) at it; a file it replaces is deleted unless something
 * else still uses it. `recorded` says what was asked for, for a waiting entry.
 */
export async function installClip(index: ClipIndex, id: string, mp3: Uint8Array, seconds: number, provider: string, recorded: string, lines: Map<string, LineSpec>): Promise<'installed' | 'kept (no line yet)'> {
  const audio = `${id}.${hash8(mp3)}.mp3`;
  await writeFile(path.join(CLIP_DIR, audio), mp3);
  const before = [index.clips[id]?.audio, index.waiting?.[id]?.audio];
  const line = lines.get(id);
  if (line) {
    index.clips[id] = clipRecord(line, audio, seconds, provider);
    if (index.waiting) delete index.waiting[id];
  } else (index.waiting ??= {})[id] = { provider, recorded, audio, seconds, ingested: new Date().toISOString().slice(0, 10) };
  await dropUnused(index, before);
  return line ? 'installed' : 'kept (no line yet)';
}

/** Delete these clip files unless something in the index still uses them. */
export async function dropUnused(index: ClipIndex, files: (string | undefined)[]): Promise<void> {
  for (const f of new Set(files)) if (f && !usedBy(index, f)) await rm(path.join(CLIP_DIR, f), { force: true });
}

const usedBy = (index: ClipIndex, audio: string) => [...Object.values(index.clips), ...Object.values(index.waiting ?? {})].some((c) => c.audio === audio);

/** Forget clips whose audio was deleted by hand, so they read as gaps, not errors. */
export async function forgetMissingAudio(index: ClipIndex, dir = CLIP_DIR): Promise<string[]> {
  const dropped: string[] = [];
  for (const [id, clip] of Object.entries(index.clips)) {
    if (!(await exists(path.join(dir, clip.audio)))) {
      delete index.clips[id];
      dropped.push(id);
    }
  }
  return dropped;
}
