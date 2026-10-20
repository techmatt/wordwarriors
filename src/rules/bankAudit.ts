/**
 * The word bank's phonics coverage (item 056): how many familiar pictured
 * words (THINGS: a `thing` or `both`, never `odd`) carry each letter sound as
 * their first and last sound, each short vowel, each word-machine family, the
 * Stretchy Bridge's same-start trios (MAT MAP MAN: three early words with
 * one first sound, so the far bank can show two that start like the word and
 * differ later; `trioGroups` the tighter two-sound groups) and each long vowel, measured against
 * COVERAGE in content/phonics/bank.ts. Pure: the unit test fails on any gap
 * (tests/unit/coverage.test.ts), and `npm run bank:audit` prints the table.
 */

import { COVERAGE, THINGS, VOWEL_LIST, type BankWord } from '../../content/phonics/bank.js';
import { FAMILIES } from '../../content/phonics/families.js';
import { DIGRAPH_SOUNDS, LETTERS, LONG_VOWEL_SOUNDS } from '../../content/phonics/letters.js';

export interface CoverageRow {
  /** What is counted: `first m`, `last ng`, `vowel a`, `family at`, `bridge m`, `long long_a`. */
  tag: string;
  /** The familiar pictured words counted, in bank order. */
  words: string[];
  target: number;
  /** Why the target is under the usual one, if it is. */
  why?: string;
}

/** Every sound a word can start or end on: the letters (C and K apart), the digraphs, QU's Q. */
const SOUNDS = [...LETTERS, ...DIGRAPH_SOUNDS].map((s) => s.letter);

const firstSound = (w: BankWord) => w.sounds[0]!;
/** The last sound heard: CHEESE ends on Z, its E silent. */
const lastSound = (w: BankWord) => w.sounds.filter(Boolean).at(-1)!;

/** A word the bridge can cross early: a familiar short-vowel thing at level 1 or 2. */
const early = (w: BankWord) => w.vowel !== null && w.level <= 2;

/** Groups of early words sharing their first two sounds (MAT MAP MAN): the bridge's trios where a group has three. */
export function trioGroups(words: BankWord[] = THINGS): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const w of words.filter(early)) {
    if (w.sounds.length < 3) continue;
    (out[`${w.sounds[0]}${w.sounds[1]}`] ??= []).push(w.word);
  }
  return out;
}

/** Every row of the audit, with its target. */
export function coverageRows(words: BankWord[] = THINGS): CoverageRow[] {
  const rows: CoverageRow[] = [];
  const row = (tag: string, ws: BankWord[], t: { target: number; why?: string }) =>
    rows.push({ tag, words: ws.map((w) => w.word), target: t.target, ...(t.why ? { why: t.why } : {}) });
  for (const s of SOUNDS) row(`first ${s}`, words.filter((w) => firstSound(w) === s), COVERAGE.first[s] ?? { target: COVERAGE.firstTarget });
  for (const s of [...SOUNDS, ...LONG_VOWEL_SOUNDS.map((l) => l.letter)]) {
    const t = COVERAGE.last[s];
    if (t) row(`last ${s}`, words.filter((w) => lastSound(w) === s), t);
  }
  for (const v of VOWEL_LIST) row(`vowel ${v}`, words.filter((w) => w.vowel === v), { target: COVERAGE.vowelTarget });
  for (const f of FAMILIES) row(`family ${f.rime}`, words.filter((w) => f.words.includes(w.word)), { target: COVERAGE.familyTarget });
  for (const rime of COVERAGE.families) {
    if (!FAMILIES.some((f) => f.rime === rime)) row(`family ${rime}`, [], { target: COVERAGE.familyTarget, why: 'lost its family' });
  }
  // The bridge's far bank: early words sharing a first sound, so two pictures beside the word start like it and differ later.
  for (const s of COVERAGE.bridgeStarts) row(`bridge ${s}`, words.filter((w) => early(w) && firstSound(w) === s), COVERAGE.bridge[s] ?? { target: COVERAGE.bridgeTarget });
  for (const l of LONG_VOWEL_SOUNDS) row(`long ${l.letter}`, words.filter((w) => w.sounds.includes(l.letter)), COVERAGE.long[l.letter] ?? { target: 1 });
  return rows;
}

/** The rows under their target. */
export function coverageGaps(words: BankWord[] = THINGS): CoverageRow[] {
  return coverageRows(words).filter((r) => r.words.length < r.target);
}
