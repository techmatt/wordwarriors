/**
 * `?seed=N` (src/episode/draws.ts `seedRands`): with the same progress, the
 * same seed replays the whole episode's draws, the cast's and the house's
 * (rooms, games, words, the warm-up, the pads, the victory scene); another
 * seed draws another episode.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resetEpisode, seedRands, setCastOptions } from '../../src/episode/draws';
import { drawEnding, giftWord, grabPlan, housePlan, movePlan } from '../../src/episode/plans';
import { episode } from '../../src/episode/state';
import { progress } from '../../src/state/progress';

/** One drawn episode from a fresh store, everything a seed should replay. */
function drawEpisode(seed: number): string {
  progress.reset();
  setCastOptions({ fixed: false, overrides: {}, ...seedRands(seed) });
  resetEpisode();
  const plan = housePlan();
  return JSON.stringify({
    cast: [episode.hero, episode.ally, episode.villain, episode.primary, episode.secondary, episode.place],
    rooms: plan.map((p) => [p.room, p.game, p.key, p.fetches]),
    gift: giftWord(),
    grab: grabPlan(),
    moves: movePlan(),
    fight: episode.fight,
    ending: drawEnding(),
  });
}

test('the same seed and store draw the same episode twice; another seed another', () => {
  const a = drawEpisode(7);
  assert.equal(drawEpisode(7), a);
  assert.notEqual(drawEpisode(8), a);
  // The house's stream on its own: the same cast stream, another house seed, another house.
  progress.reset();
  setCastOptions({ fixed: false, overrides: {}, rand: seedRands(7).rand, planRand: seedRands(8).planRand });
  resetEpisode();
  const rooms = (s: string) => JSON.stringify(JSON.parse(s).rooms);
  assert.notEqual(JSON.stringify(housePlan().map((p) => [p.room, p.game, p.key, p.fetches])), rooms(a));
});
