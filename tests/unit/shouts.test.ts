/**
 * Hunt 8: the battle's floating shouts are text on screen, so none may be a
 * word she reads later (item 121 made BLOCK a bank word while a shielded hit
 * still floated BLOCK! in battle 1, before the attic's counter word; it had
 * already turned SPLASH! into SPLOOSH!). The hit words BAM and ZAP are bank
 * words on purpose: BattleScene filters them through `textGivesAway`.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { BANK } from '../../content/phonics/bank';
import { withStems } from '../../src/rules/bank';

/** Every `.ts` file under `dir`. */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sources(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : []));
}

/** The hit words BattleScene shows only where `textGivesAway` lets it. */
const FILTERED = new Set(['pow', 'bam', 'zap', 'boom', 'wham']);

test('no floating shout is a bank word (hunt 8: BLOCK! before BLOCK was read)', () => {
  const bank = new Set(BANK.map((w) => w.word));
  const bad: string[] = [];
  for (const file of sources('src')) {
    for (const m of readFileSync(file, 'utf8').matchAll(/floatText\([^;]*?'([A-Z][A-Z !'?]+)'/g)) {
      const words = m[1]!.toLowerCase().split(/[^a-z]+/).filter(Boolean);
      for (const w of withStems(words).filter((x) => bank.has(x) && !FILTERED.has(x))) bad.push(`${path.basename(file)}: ${m[1]} (${w})`);
    }
  }
  assert.deepEqual(bad, []);
});

/**
 * Hunt 9: the same for every fixed upper-case string the game prints (all
 * text in the game is upper case; the grown-ups page may stay mixed case, and
 * the bug-hunt probe is not the game). THE END printed DAD: PRESS 2 TO PLAY
 * AGAIN every episode after item 126 made DAD a bank word (item 126 had taken
 * DAD off the yes / no cue and the dad-lock badge for that reason).
 */
test('no fixed upper-case text the game prints is a bank word (hunt 9: DAD at THE END)', () => {
  const bank = new Set(BANK.map((w) => w.word));
  const skip = (f: string) => /ParentScene\.ts$|[\\/]qa[\\/]/.test(f);
  const bad: string[] = [];
  for (const file of sources('src').filter((f) => !skip(f))) {
    const code = readFileSync(file, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\/?\*)/.test(l)).join('\n');
    // Quoted strings of two or more upper-case words or a word and a mark: what is printed, not ids.
    for (const m of code.matchAll(/(['`])((?:<[^>]*>|[A-Z0-9][A-Z0-9!?.,:' ]*|\s|&nbsp;|[✗✓🔒]|\$\{[^}]*\})+)\1/g)) {
      const text = m[2]!.replace(/<[^>]*>|&nbsp;|\$\{[^}]*\}/g, ' ');
      if (!/[A-Z]{2,}/.test(text)) continue;
      const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
      for (const w of withStems(words).filter((x) => bank.has(x) && !FILTERED.has(x))) bad.push(`${path.basename(file)}: ${text.trim()} (${w})`);
    }
  }
  assert.deepEqual(bad, []);
});
