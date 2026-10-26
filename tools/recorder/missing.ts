/**
 * `npm run recorder:missing` (item 158): the phonics recorder's `?missing`,
 * derived. Every sound a live bank word sounds out (`LIVE`'s `sounds`) whose
 * `letter_<x>_sound` line has no good recording (no clip, or a stale one:
 * `clipStateFor`) goes into the page's `MISSING`, and every such sound the
 * page's full set has no card for gets one of its own in `EXTRA` (the word
 * from the bank, the sound's `record` tip from content/phonics/letters.ts).
 * It rewrites the page's `missing:begin` / `missing:end` block and prints
 * each missing sound with the live words that use it.
 *
 * `voice:lines` (a word added) and `voice:import` (a sound recorded) run it
 * too, and `tests/unit/recorder.test.ts` fails while the block is out of date.
 * The hosted copy of the page is synced by the planner after a change.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { LIVE, type BankWord } from '../../content/phonics/bank.js';
import { SOUND_BY_UNIT, canHold } from '../../content/phonics/letters.js';
import { letterSoundLine } from '../../content/voice/ids.js';
import { readLines, runMain } from '../shared.js';
import { clipStateFor, readClipIndex, type ClipIndex } from '../voice/clips.js';
import type { LineSpec } from '../voice/types.js';

export const RECORDER_PAGE = path.join('tools', 'recorder', 'phonics-recorder.html');
const BLOCK = /(\/\/ missing:begin[^\n]*\n)[\s\S]*?(\/\/ missing:end)/;
const CARDS = /\/\/ cards:begin\n([\s\S]*?)\/\/ cards:end/;
/** The recorder's card for a sound fills another's line too (voice:import's ALSO: the K card is CK). */
const SAME_AS: Record<string, string> = { ck: 'k' };

export interface RecorderEntry {
  id: string;
  word: string;
  snd: string;
  kind: 'hold' | 'short';
  tip: string;
}
export interface MissingSound {
  sound: string;
  /** `edge-tts`: no clip; `stale`: a clip of a line that has changed since. */
  state: 'edge-tts' | 'stale';
  words: string[];
}

/** The page's cards block, run: its full set and its card lookup. */
export function pageCards(html: string, search = ''): { ALL_GROUPS: RecorderEntry[][]; cards: { groups: RecorderEntry[][]; ids: string[]; tag: string; unknown: string[] } } {
  const m = CARDS.exec(html);
  if (!m) throw new Error(`${RECORDER_PAGE} has no cards:begin / cards:end block`);
  return new Function('search', `${m[1]}\nreturn { ALL_GROUPS, cards: cardsFor(search) };`)(search);
}

/** The live words' sounds, in SOUND_BY_UNIT's order, each with the words that sound it out. */
export function liveSounds(words: BankWord[] = LIVE): Map<string, string[]> {
  const by = new Map<string, string[]>();
  for (const w of words) for (const s of new Set(w.sounds)) if (s) by.set(s, [...(by.get(s) ?? []), w.word]);
  const order = Object.keys(SOUND_BY_UNIT);
  return new Map([...by].sort(([a], [b]) => order.indexOf(a) - order.indexOf(b)));
}

export function missingSounds(lines: LineSpec[], index: ClipIndex, words: BankWord[] = LIVE): MissingSound[] {
  const byId = new Map(lines.map((l) => [l.id, l]));
  const out: MissingSound[] = [];
  for (const [sound, ws] of liveSounds(words)) {
    const line = byId.get(letterSoundLine(sound));
    const state = line ? clipStateFor(line, index).state : 'missing';
    if (state !== 'fresh') out.push({ sound, state: state === 'stale' ? 'stale' : 'edge-tts', words: ws });
  }
  return out;
}

/** A card for a sound the full set lacks: the example word if live, else the first live word with it; the sound's letters lit. */
function extraEntry(sound: string, words: BankWord[]): RecorderEntry {
  const s = SOUND_BY_UNIT[sound]!;
  const w = words.find((x) => x.word === s.example && x.sounds.includes(sound)) ?? words.find((x) => x.sounds.includes(sound))!;
  const at = w.sounds.indexOf(sound);
  const word = w.units.map((u, i) => (i === at ? `[${u}]` : u)).join('').toUpperCase();
  const hold = canHold(sound);
  const where = at === 0 ? 'start' : at === w.units.length - 1 ? 'end' : 'middle';
  const tip = `the ${where} of ${w.word.toUpperCase()}${hold ? ', held' : ''}: ${s.record ?? s.note ?? s.say.toLowerCase()}`;
  return { id: sound, word, snd: s.say.toLowerCase(), kind: hold ? 'hold' : 'short', tip };
}

/** The page's generated block for these missing sounds. */
export function missingBlock(html: string, missing: MissingSound[], words: BankWord[] = LIVE): string {
  const full = pageCards(html).ALL_GROUPS;
  const inFull = new Set(full.flat().map((e) => e.id));
  const extras = [...liveSounds(words).keys()].filter((s) => !inFull.has(SAME_AS[s] ?? s));
  const ask = [...new Set(missing.map((m) => SAME_AS[m.sound] ?? m.sound))];
  const extraLines = extras.map((s, i) => `  ${s}: ${JSON.stringify({ card: full.length + 1 + i, e: extraEntry(s, words) })},`);
  return [`const MISSING = ${JSON.stringify(ask).replace(/","/g, '", "')};`, extraLines.length ? `const EXTRA = {\n${extraLines.join('\n')}\n};` : 'const EXTRA = {};'].join('\n') + '\n';
}

export function withMissingBlock(html: string, block: string): string {
  if (!BLOCK.test(html)) throw new Error(`${RECORDER_PAGE} has no missing:begin / missing:end block`);
  return html.replace(BLOCK, (_, begin: string, end: string) => `${begin}${block}${end}`);
}

/** Rewrite the page's block from the bank and the clip index; returns the missing sounds. */
export async function writeMissing(lines?: LineSpec[]): Promise<{ missing: MissingSound[]; changed: boolean }> {
  const missing = missingSounds(lines ?? (await readLines()), await readClipIndex());
  const html = await readFile(RECORDER_PAGE, 'utf8');
  const next = withMissingBlock(html, missingBlock(html, missing));
  if (next !== html) await writeFile(RECORDER_PAGE, next);
  return { missing, changed: next !== html };
}

export function describeMissing(missing: MissingSound[]): string[] {
  if (!missing.length) return ['recorder ?missing: nothing (every sound live words sound out is recorded)'];
  return [
    `recorder ?missing: ${missing.map((m) => m.sound).join(' ')}`,
    ...missing.map((m) => `  ${m.sound.padEnd(8)} ${m.state.padEnd(8)} ${m.words.join(' ').toUpperCase()}`),
  ];
}

runMain(import.meta.url, async () => {
  const { missing, changed } = await writeMissing();
  for (const l of describeMissing(missing)) console.log(l);
  console.log(changed ? `${RECORDER_PAGE}: rewritten (sync the hosted copy)` : `${RECORDER_PAGE}: already up to date`);
});
