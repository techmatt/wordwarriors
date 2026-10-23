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
