/**
 * The stored tier (item 127): a stored word is in no pool she is drawn from,
 * at any difficulty, and keeps its picture, word line, effect and (an action)
 * its move lines, so bringing it back is deleting its STORED_WHY line.
 */

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { MOVE_WORDS } from '../../content/battle/roster';
import { ACTIONS, BANK_BY_WORD, LIVE, STORED, STORED_WHY, THINGS } from '../../content/phonics/bank';
import { EFFECT_BY_WORD } from '../../content/phonics/effects';
import { FAMILIES } from '../../content/phonics/families';
import { FETCH_ITEMS } from '../../content/phonics/sentences';
import { PICTURE_WORDS, WORDS } from '../../content/phonics/words';
import { moveKey, narratorLine, wordLine } from '../../content/voice/ids';
import { BRIDGE_PICTURES, CROSS_WORDS } from '../../src/rules/bridge';
import { CHARGE_WORDS } from '../../src/rules/charge';
import { GRAB_WORDS } from '../../src/rules/grab';
import { BAG_WORDS } from '../../src/rules/bank';
import { SHIFT_WORDS } from '../../src/rules/shifter';
import { composeLines } from '../../tools/voice/compose';

test('stored words: every one is a bank word with its reason, and in no pool', () => {
  assert.ok(STORED.length > 0);
  assert.deepEqual(STORED.map((w) => w.word).sort(), Object.keys(STORED_WHY).sort());
  for (const w of Object.keys(STORED_WHY)) assert.ok(BANK_BY_WORD[w], `${w} is a bank word`);
  const pools: Record<string, readonly string[]> = {
    THINGS: THINGS.map((w) => w.word),
    ACTIONS: ACTIONS.map((w) => w.word),
    LIVE: LIVE.map((w) => w.word),
    MOVE_WORDS,
    PICTURE_WORDS: PICTURE_WORDS.map((w) => w.word),
    WORDS: WORDS.map((w) => w.word),
    GRAB_WORDS,
    BAG_WORDS,
    BRIDGE_PICTURES,
    CROSS_WORDS,
    CHARGE_WORDS,
    SHIFT_WORDS,
    FETCH_ITEMS: FETCH_ITEMS.map((f) => f.word),
    FAMILIES: FAMILIES.flatMap((f) => f.words),
  };
  for (const [name, pool] of Object.entries(pools)) for (const w of STORED) assert.ok(!pool.includes(w.word), `${w.word} is in ${name}`);
});

test('stored words keep their picture, word line, effect and move lines', () => {
  const lines = new Set(composeLines().map((l) => l.id));
  for (const w of STORED) {
    assert.ok(existsSync(`public/art/pic_${w.word}.png`), `pic_${w.word}`);
    assert.ok(lines.has(wordLine(w.word)), wordLine(w.word));
    assert.ok(EFFECT_BY_WORD[w.word], `${w.word} has an effect`);
    if (w.role !== 'thing') assert.ok(lines.has(narratorLine('dada_matt', moveKey('use_move', w.word))), `${w.word}'s move line`);
  }
});
