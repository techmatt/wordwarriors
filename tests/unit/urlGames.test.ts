/**
 * Item 122: which URLs pick the rooms' games (src/episode/plans.ts
 * `urlPicksGames`), so the house plan's games are not remembered as her
 * rotation. `?games=all` is the real draw.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { urlPicksGames } from '../../src/episode/plans';

test('urlPicksGames: a narrowed or forced pick is the URL\'s; the real draw is not', () => {
  for (const q of ['games=sentence', 'game=word_machine', 'room=charge', 'room=bridge', 'room=shifter', 'cast=default&room=charge']) {
    assert.equal(urlPicksGames(new URLSearchParams(q)), true, q);
  }
  for (const q of ['', 'games=all', 'cast=default', 'room=attic', 'room=toString', 'game=nope']) {
    assert.equal(urlPicksGames(new URLSearchParams(q)), false, q);
  }
});
