/**
 * `npm run voice:build`: turn authored lines into audio files plus a manifest.
 *
 * Every word the game speaks is baked here, at content time, never at runtime.
 * The output is the game's entire knowledge of voice: one mp3 per line and
 * `public/voice-gen/manifest.json`. Ported from Seraphina's build.ts.
 *
 * `public/voice-gen/` is untracked: a junction to the Drive-synced folder, shared
 * by the main checkout and every worktree (README, "Storage"). Because it is
 * shared, mp3s of lines no longer in lines.json are kept (and listed) unless
 * `--prune` is passed: another checkout's branch may still speak them. So prune
 * only from main or a branch at main, never from one behind it. The manifest
 * and the build cache need no pruning: every build writes them from lines.json.
 *
 * Two things can fill a line in, chosen per line:
 * - **a recorded clip** under `content/voice/clips/`, used only while its hash
 *   still matches the line (see clips.ts);
 * - **edge-tts**, synthesised now: the fallback for a line never recorded and
 *   the *loud* fallback for one edited since it was. A line with `cut` (item
 *   085) is a carrier word edge-tts says, cut to its vowel (carrier.ts).
 *
 * Incremental: a line whose fingerprint (source, speaker, voice, text, say, cut) is
 * unchanged and whose mp3 is on disk is skipped. The speaker is in the
 * fingerprint because two speakers can share a voice config and still need
 * separate audio once one of them is re-tuned. `--force` rebuilds everything;
 * `--no-clips` ignores the clip store for a pure edge-tts build; `--prune`
 * deletes orphaned mp3s (those of no current line) and says how many and how big.
 */

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { exists, LINES_FILE, runMain } from '../shared.js';
import { align, isSpeakable } from './align.js';
import { decodeMp3, vowelSpan } from './carrier.js';
import { mp3Bytes } from './audio.js';
import { finish } from './split.js';
import { CLIP_DIR, clipStateFor, forgetMissingAudio, readClipIndex, spokenFor, type ClipIndex, type ClipRecord } from './clips.js';
import { trimMp3 } from './mp3.js';
import { EdgeTtsProvider } from './providers/edgeTts.js';
import type { LineSpec, ManifestLine, VoiceBook, VoiceConfig, VoiceManifest, VoiceProvider } from './types.js';

const MANIFEST_VERSION = 2;

/** Audio kept after the last word ends. See mp3.ts for why the tail is cut. */
const TAIL_SECONDS = 0.2;

const PROVIDERS: Record<string, () => VoiceProvider> = {
  'edge-tts': () => new EdgeTtsProvider(),
};

interface Options {
  lines: string;
  voices: string;
  clips: string;
  out: string;
  base: string;
  force: boolean;
  noClips: boolean;
  prune: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    lines: LINES_FILE,
    voices: path.join('content', 'voice', 'voices.json'),
    clips: CLIP_DIR,
    out: path.join('public', 'voice-gen'),
    base: 'voice-gen',
    force: false,
    noClips: false,
    prune: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const value = () => {
      const next = argv[++i];
      if (next === undefined) throw new Error(`${arg} needs a value`);
      return next;
    };
    if (arg === '--force') opts.force = true;
    else if (arg === '--no-clips') opts.noClips = true;
    else if (arg === '--prune') opts.prune = true;
    else if (arg === '--lines') opts.lines = value();
    else if (arg === '--voices') opts.voices = value();
    else if (arg === '--out') opts.out = value();
    else throw new Error(`unknown argument ${arg}`);
  }
  return opts;
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

function fingerprint(source: unknown): string {
  return createHash('sha256').update(JSON.stringify(source)).digest('hex').slice(0, 16);
}

function resolveVoice(line: LineSpec, book: VoiceBook): VoiceConfig {
  const speaker = book.speakers[line.speaker];
  if (!speaker) throw new Error(`line "${line.id}" has speaker "${line.speaker}", which voices.json lacks`);
  return {
    voice: speaker.voice,
    rate: line.rate ?? speaker.rate,
    pitch: line.pitch ?? speaker.pitch,
    volume: line.volume ?? speaker.volume,
  };
}

/** Run `fn` over `items` with at most `n` in flight. */
async function pooled<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]!);
    }),
  );
}

export async function buildVoice(argv: string[]): Promise<void> {
  const opts = parseArgs(argv);
  const lines = await readJson<LineSpec[]>(opts.lines);
  const book = await readJson<VoiceBook>(opts.voices);

  const makeProvider = PROVIDERS[book.provider];
  if (!makeProvider) throw new Error(`voices.json asks for provider "${book.provider}"`);

  const clipIndex: ClipIndex = opts.noClips ? { version: 1, clips: {} } : await readClipIndex(path.join(opts.clips, 'index.json'));
  for (const id of await forgetMissingAudio(clipIndex, opts.clips)) {
    console.log(`  ${id}: recorded, but its audio is not under ${opts.clips}; falling back`);
  }

  const ids = new Set<string>();
  for (const line of lines) {
    if (ids.has(line.id)) throw new Error(`duplicate line id "${line.id}"`);
    if (!line.group) throw new Error(`line "${line.id}" has no group`);
    ids.add(line.id);
    resolveVoice(line, book);
  }

  await mkdir(opts.out, { recursive: true });
  const cacheFile = path.join(opts.out, '.build-cache.json');
  // The cache holds only fingerprints; the entries themselves are read back from
  // the previous manifest, so the voice folder carries them once.
  const hashes: Record<string, string> = opts.force ? {} : await readJson<Record<string, string>>(cacheFile).catch(() => ({}));
  const previous = await readJson<VoiceManifest>(path.join(opts.out, 'manifest.json')).catch(() => null);
  const cache: Record<string, { hash: string; entry: ManifestLine }> = {};
  for (const entry of previous?.lines ?? []) {
    const hash = hashes[entry.id];
    if (hash) cache[entry.id] = { hash, entry };
  }

  let provider: VoiceProvider | null = null;
  const entries = new Map<string, ManifestLine>();
  const nextCache: typeof cache = {};
  const stale: { line: LineSpec; clip: ClipRecord }[] = [];
  const failed: { line: LineSpec; error: string }[] = [];
  let built = 0;
  let skipped = 0;
  let recorded = 0;

  const work: { line: LineSpec; hash: string; voice: VoiceConfig; clip: ClipRecord | null }[] = [];
  for (const line of lines) {
    const state = clipStateFor(line, clipIndex);
    if (state.state === 'stale') stale.push({ line, clip: state.clip });
    const clip = state.state === 'fresh' ? state.clip : null;
    if (clip && clip.provider !== 'simulated') recorded++;
    const voice = resolveVoice(line, book);
    const hash = clip
      ? fingerprint({ source: clip.provider, clip: clip.audio, spoken: clip.spokenHash, speaker: line.speaker, text: line.text, group: line.group })
      : fingerprint({ source: book.provider, speaker: line.speaker, voice, text: line.text, say: line.say ?? null, group: line.group, ...(line.cut ? { cut: line.cut } : {}) });
    const cached = cache[line.id];
    if (cached?.hash === hash && (await exists(path.join(opts.out, path.basename(cached.entry.audio))))) {
      // Re-based, so moving the folder (voice/ became voice-gen/) needs no rebuild.
      const reused = { hash, entry: { ...cached.entry, audio: `${opts.base}/${path.basename(cached.entry.audio)}` } };
      entries.set(line.id, reused.entry);
      nextCache[line.id] = reused;
      skipped++;
      continue;
    }
    work.push({ line, hash, voice, clip });
  }

  if (work.some((w) => !w.clip)) provider = makeProvider();
  let done = 0;
  await pooled(work, 4, async ({ line, hash, voice, clip }) => {
    try {
      const entry = clip ? await fromClip(opts, line, clip) : await fromProvider(opts, line, voice, provider!);
      entries.set(line.id, entry);
      nextCache[line.id] = { hash, entry };
      built++;
      done++;
      if (done % 25 === 0 || done === work.length) console.log(`  ${done}/${work.length} built`);
    } catch (error) {
      failed.push({ line, error: error instanceof Error ? error.message : String(error) });
    }
  });
  provider?.close?.();

  // Manifest in authored order, so a rebuild of nothing is no diff.
  const manifest: VoiceManifest = {
    version: MANIFEST_VERSION,
    provider: recorded ? `${book.provider}+clips` : book.provider,
    lines: lines.map((l) => entries.get(l.id)).filter((e): e is ManifestLine => Boolean(e)),
  };
  await writeFile(path.join(opts.out, 'manifest.json'), `${JSON.stringify(manifest)}\n`);
  const nextHashes = Object.fromEntries(lines.filter((l) => nextCache[l.id]).map((l) => [l.id, nextCache[l.id]!.hash]));
  await writeFile(cacheFile, `${JSON.stringify(nextHashes, null, 1)}\n`);

  // Item 078: audio of retired lines. The manifest and cache above already hold
  // only this checkout's lines; the mp3s stay until `--prune`, listed meanwhile.
  const orphans = (await readdir(opts.out)).filter((f) => f.endsWith('.mp3') && !ids.has(f.slice(0, -4))).sort();
  let orphanBytes = 0;
  for (const orphan of orphans) orphanBytes += (await stat(path.join(opts.out, orphan))).size;
  const mb = (orphanBytes / 1e6).toFixed(1);
  if (orphans.length && opts.prune) {
    for (const orphan of orphans) await unlink(path.join(opts.out, orphan));
    console.log(`\nPRUNED: ${orphans.length} mp3(s) of lines not in this checkout's lines.json, ${mb} MB.`);
    for (const orphan of orphans.slice(0, 20)) console.log(`  ${orphan}`);
    if (orphans.length > 20) console.log(`  … and ${orphans.length - 20} more`);
  } else if (orphans.length) {
    console.log(`\n${orphans.length} orphaned mp3(s), ${mb} MB, kept (shared folder; from main, voice:build -- --prune deletes them):`);
    for (const orphan of orphans.slice(0, 20)) console.log(`  ${orphan}`);
    if (orphans.length > 20) console.log(`  … and ${orphans.length - 20} more`);
  } else if (opts.prune) {
    console.log('  prune: no orphaned mp3s');
  }

  if (stale.length) {
    const rule = '='.repeat(72);
    console.log(`\n${rule}\nSTALE: ${stale.length} recorded line(s) no longer match their text; using edge-tts.\n${rule}`);
    for (const { line, clip } of stale) console.log(`  ${line.id}\n    recorded: ${clip.spoken}\n    now:      ${spokenFor(line)}`);
  }
  // Item 062: the manifest is shared, so a build from a checkout without some
  // lines (an older branch, a worktree cut before a merge) drops what another
  // checkout built, and that checkout's game then has no voice for them. Said
  // loudly; the fix is a voice:build in the checkout that plays.
  const dropped = (previous?.lines ?? []).filter((e) => !ids.has(e.id)).map((e) => e.id);
  if (dropped.length) {
    const rule = '='.repeat(72);
    console.log(`\n${rule}\nDROPPED: ${dropped.length} line(s) the shared manifest had are not in this checkout's lines.json.\nIf another checkout (main) still speaks them, run npm run voice:build there.\n${rule}`);
    for (const id of dropped.slice(0, 20)) console.log(`  ${id}`);
    if (dropped.length > 20) console.log(`  … and ${dropped.length - 20} more`);
  }
  if (failed.length) {
    console.log(`\nFAILED: ${failed.length} line(s) could not be built and are missing from the manifest (the game shows their text silently):`);
    for (const { line, error } of failed.slice(0, 30)) console.log(`  ${line.id}: ${error}`);
    process.exitCode = 1;
  }
  console.log(`voice: ${built} built, ${skipped} unchanged, ${recorded} from recordings, ${manifest.lines.length}/${lines.length} lines in manifest`);
}

async function fromClip(opts: Options, line: LineSpec, clip: ClipRecord): Promise<ManifestLine> {
  const words = align(line.text, clip.words.filter((w) => isSpeakable(w.word)), line.say !== undefined);
  await copyFile(path.join(opts.clips, clip.audio), path.join(opts.out, `${line.id}.mp3`));
  return entry(opts, line, `${line.id}.mp3`, words);
}

async function fromProvider(opts: Options, line: LineSpec, voice: VoiceConfig, provider: VoiceProvider): Promise<ManifestLine> {
  const result = await provider.synthesize(line.say ?? line.text, voice);
  const words = align(line.text, result.words, line.say !== undefined);
  const name = `${line.id}.${result.extension}`;
  if (line.cut && result.extension === 'mp3') {
    // Item 085: a carrier word, cut to its vowel (carrier.ts), finished like a recording.
    const { x, rate } = await decodeMp3(result.audio);
    const { start, end } = vowelSpan(x, rate, line.cut.keepDb);
    const { data } = finish(x.subarray(start, end), rate);
    await writeFile(path.join(opts.out, name), mp3Bytes(data, rate));
    const seconds = Math.round((data.length / rate) * 1000) / 1000;
    return entry(opts, line, name, words.length === 1 ? [{ word: words[0]!.word, start: 0, end: seconds }] : words);
  }
  const last = words.length ? words[words.length - 1]!.end : 0;
  const audio = result.extension === 'mp3' ? trimMp3(result.audio, last + TAIL_SECONDS) : result.audio;
  await writeFile(path.join(opts.out, name), audio);
  return entry(opts, line, name, words);
}

function entry(opts: Options, line: LineSpec, name: string, words: ManifestLine['words']): ManifestLine {
  return {
    id: line.id,
    speaker: line.speaker,
    group: line.group,
    text: words.map((w) => w.word).join(' '),
    audio: `${opts.base}/${name}`,
    words,
    duration: words.length ? words[words.length - 1]!.end : 0,
  };
}

runMain(import.meta.url, () => buildVoice(process.argv.slice(2)), 'voice build failed: ');
