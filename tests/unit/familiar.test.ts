/**
 * Only familiar words where she matches a word to a picture (item 040: the
 * bank's `odd` flag), and the episode's line variants (wake-up, bedroom
 * taunt, sorry, victory line).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTIONS, BANK, BANK_BY_WORD, DROPPED, LIVE, THINGS } from '../../content/phonics/bank';
import { ROSTER } from '../../content/battle/roster';
import { FAMILY_WORDS } from '../../content/phonics/families';
import { FETCH_ITEMS } from '../../content/phonics/sentences';
import { PICTURE_WORDS } from '../../content/phonics/words';
import { WAKE_LINES, WAKE_VARIANTS, wakeVariant } from '../../content/voice/script';
import { WAKERS, reformedLine, wakeLine } from '../../content/voice/ids';
import { GRAB_WORDS } from '../../src/rules/grab';
import { BAG_WORDS } from '../../src/rules/sentences';
import { BEDROOM_TAUNTS, DEFAULT_LINES, drawLines } from '../../src/rules/story';

const odd = (w: string) => Boolean(BANK_BY_WORD[w]?.odd);

test('familiar words: no odd word is a picture to match', () => {
  for (const [what, ws] of [
    ['things', THINGS.map((w) => w.word)],
    ['the warm-up', GRAB_WORDS],
    ['the word bag (rooms and the counter)', BAG_WORDS],
    ['the word machine', FAMILY_WORDS],
    ['fetched items', FETCH_ITEMS.map((f) => f.word)],
    ['pictured words', PICTURE_WORDS.map((w) => w.word)],
  ] as const) {
    for (const w of ws) assert.ok(!odd(w), `${what}: ${w} is odd`);
  }
  for (const c of ROSTER) assert.ok(!odd(c.counter.word), `${c.id}'s counter ${c.counter.word} is odd`);
});

test('familiar words: an odd word keeps its action role, or drops out of play', () => {
  for (const w of BANK.filter((b) => b.odd)) {
    if (w.role === 'thing') assert.ok(DROPPED.includes(w) && !LIVE.includes(w), w.word);
    else assert.ok(ACTIONS.includes(w) && LIVE.includes(w), w.word);
  }
  for (const w of ['yak', 'vat', 'cog']) assert.ok(odd(w), w);
  for (const w of ['ram', 'jet']) assert.ok(ACTIONS.some((a) => a.word === w), w);
});

test('line variants: the default cast says variant 1 of each; a drawn episode any of three', () => {
  assert.deepEqual(drawLines('tiamat', Math.random, true), DEFAULT_LINES);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const seen: Record<string, Set<number>> = {};
  for (let i = 0; i < 300; i++) {
    for (const [k, n] of Object.entries(drawLines('tiamat', rand, false))) (seen[k] ??= new Set()).add(n);
  }
  for (const k of Object.keys(DEFAULT_LINES)) assert.deepEqual([...seen[k]!].sort(), [1, 2, 3], k);
});

test('line variants: every wake variant, taunt, sorry and victory line exists and is voiced', () => {
  const lines = JSON.parse(readFileSync('content/voice/lines.json', 'utf8')) as { id: string }[] | { lines: { id: string }[] };
  const ids = new Set((Array.isArray(lines) ? lines : lines.lines).map((l) => l.id));
  for (const key of ['up', 'good', 'door']) {
    for (let n = 1; n <= WAKE_VARIANTS; n++) assert.ok(WAKE_LINES.some((t) => t.key === wakeVariant(key, n)), `${key} ${n}`);
  }
  for (const w of WAKERS) {
    for (let n = 1; n <= WAKE_VARIANTS; n++) {
      assert.ok(ids.has(wakeLine(w, wakeVariant('up', n))), `${w} up ${n}`);
      assert.ok(ids.has(wakeLine(w, wakeVariant('door', n))), `${w} door ${n}`);
      assert.ok(ids.has(wakeLine(w, wakeVariant('good_julia', n))), `${w} good ${n}`);
    }
  }
  for (const c of ROSTER) {
    assert.ok(c.evil.taunts.length >= BEDROOM_TAUNTS, c.id);
    for (const r of [...c.reformed.sorry, ...c.reformed.ending]) assert.ok(ids.has(reformedLine(c.id, r.key)), `${c.id} ${r.key}`);
  }
});
