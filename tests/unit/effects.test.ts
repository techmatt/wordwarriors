/**
 * Every bank word's battle effect (item 037): one each, well formed.
 * `npx tsx --test tests/unit/effects.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MINIONS } from '../../content/battle/roster';
import { ABILITY_KINDS, type Status } from '../../content/battle/types';
import { BANK, BANK_BY_WORD } from '../../content/phonics/bank';
import { EFFECTS, EFFECT_BY_WORD } from '../../content/phonics/effects';

// Every key of CASTS in src/battle/abilities.ts (a Record over the kinds, so it casts each).
const KINDS: readonly string[] = ABILITY_KINDS;
const STATUSES: Status[] = ['freeze', 'pig', 'stun', 'burn', 'bubble'];

test('every bank word has exactly one effect, and every effect is a bank word', () => {
  for (const w of BANK) {
    assert.equal(EFFECTS.filter((e) => e.word === w.word).length, 1, `${w.word}: effects`);
  }
  for (const e of EFFECTS) assert.ok(BANK_BY_WORD[e.word], `${e.word} is not in the bank`);
});

test('ability ids are unique: item_<w> for things, word_<w> for actions', () => {
  const ids = EFFECTS.map((e) => e.ability.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const e of EFFECTS) {
    const role = BANK_BY_WORD[e.word]!.role;
    assert.equal(e.ability.id, role === 'action' ? `word_${e.word}` : `item_${e.word}`, e.word);
  }
});

test('effects use real kinds, statuses and minions, at a fetched-item power', () => {
  for (const { word, look, ability: ab } of EFFECTS) {
    assert.ok(KINDS.includes(ab.kind), `${word}: kind ${ab.kind}`);
    assert.ok(look.length > 0, `${word}: look`);
    assert.ok(ab.power >= 2 && ab.power <= 3, `${word}: power ${ab.power}`);
    if (ab.status) assert.ok(STATUSES.includes(ab.status), `${word}: status ${ab.status}`);
    if (ab.kind === 'summon') assert.ok(ab.minion && MINIONS[ab.minion], `${word}: minion ${ab.minion}`);
    if (ab.art) assert.match(ab.art, /^(pic|fx|prop)_/, `${word}: art ${ab.art}`);
    // The banner is the word: an effect never claims a move-choice word of its own.
    assert.equal(ab.words, undefined, word);
  }
});

test('EFFECT_BY_WORD indexes every effect', () => {
  assert.equal(Object.keys(EFFECT_BY_WORD).length, EFFECTS.length);
});
