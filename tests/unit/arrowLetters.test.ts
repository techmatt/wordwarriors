/**
 * Item 172: what Ember Lark's arrows spell over her head (src/rules/arrowLetters.ts), and
 * the roster rules for a rider: her art's big box, her arrows, no letters baked into a prompt.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { ART_BY_ID, cardArt, charArt } from '../../content/art/assets';
import { ART_PROMPTS } from '../../content/art/prompts';
import { CHARACTER_BY_ID } from '../../content/battle/roster';
import { arrowLetters } from '../../src/rules/arrowLetters';

test('letter arrows: a volley spells a word she has read, a box a sound unit, in turn', () => {
  assert.deepEqual(arrowLetters(['cat', 'ship'], 0), ['C', 'A', 'T']);
  assert.deepEqual(arrowLetters(['cat', 'ship'], 1), ['SH', 'I', 'P']);
  assert.deepEqual(arrowLetters(['cat', 'ship'], 2), ['C', 'A', 'T']);
});

test('letter arrows: nothing still to read, no word too long for a row, her name with no word', () => {
  assert.deepEqual(arrowLetters(['cat', 'ship'], 0, (w) => w === 'cat'), ['SH', 'I', 'P']);
  assert.deepEqual(arrowLetters(['umbrella'], 0), ['L', 'A', 'R', 'K']);
  assert.deepEqual(arrowLetters([], 3), ['L', 'A', 'R', 'K']);
});

test('Ember Lark: drawn big so the rider is not a third of a cast-sized sprite, on foot where a card is small', () => {
  const c = CHARACTER_BY_ID.ember_lark!;
  const good = ART_BY_ID[charArt(c.id, false)]!;
  assert.ok(good.w * good.h >= 200 * 250 * 2, 'a wider box than the cast');
  assert.equal(c.good.size, 1.7);
  assert.ok(ART_BY_ID[cardArt(c.id)], 'her on-foot art is an asset');
  assert.equal(cardArt('julia'), charArt('julia', false), 'anyone else keeps their picture');
  assert.equal(cardArt(c.id, true), charArt(c.id, true), 'the villain has no on-foot art');
});

test('Ember Lark: every arrow is art with no letters in it; the game writes them', () => {
  const c = CHARACTER_BY_ID.ember_lark!;
  const arts = new Set([...c.good.abilities, c.good.ultimate].map((a) => a.art).filter(Boolean));
  assert.ok(arts.size >= 3);
  for (const id of arts) assert.match(ART_PROMPTS[id!]!, /no letters/i, id!);
  assert.ok(c.good.abilities.some((a) => a.letters), 'her arrows spell');
});
