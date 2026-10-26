/**
 * The hub doors' signs (src/scenes/HubScene.ts `plaque`: the room's glyph as emoji text on a disc).
 * A sign is no letter (hunt 12, M84) and pictures no bank word, so it shows no reading answer.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BANK } from '../../content/phonics/bank';
import { SIDE_ROOM_BY_ID } from '../../content/house/house';

test('M84: the bakery door\'s sign is a cupcake, not the croissant that read as a letter C, and pictures no bank word', () => {
  const glyph = SIDE_ROOM_BY_ID.bakery!.glyph;
  assert.equal(glyph, '🧁');
  assert.notEqual(glyph, '🥐');
  const pictured = BANK.filter((w) => w.glyph === glyph).map((w) => w.word);
  assert.deepEqual(pictured, [], 'a bank word drawn as the sign would be shown before she reads it');
});
