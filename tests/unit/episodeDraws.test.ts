/**
 * The episode's cast draw and its remembering (src/episode/draws.ts, item
 * 076: split from Episode.ts so it runs in node). Only what was drawn freely
 * is her rotation: the default cast and an override remember nothing of
 * theirs, and a cast is remembered once per episode.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { personOf } from '../../content/battle/roster';
import { EPISODE_DEFAULTS } from '../../src/config';
import { castEpisode, rememberCast, remembered, resetEpisode, setCastOptions } from '../../src/episode/draws';
import { episode } from '../../src/episode/state';
import { seededRand } from '../../src/rules/random';
import { progress } from '../../src/state/progress';
import { housePlan } from '../../src/episode/plans';

test('the default cast remembers no ally, form or variant; its fixed villain is not met', () => {
  progress.reset();
  setCastOptions({ fixed: true, rand: seededRand(3) });
  assert.equal(episode.villain, EPISODE_DEFAULTS.villain);
  assert.equal(episode.villainWasRandom, false);
  remembered.cast = false;
  rememberCast();
  assert.deepEqual(progress.snapshot().recent, {});
});

test('a drawn cast is remembered once: its villain, ally, the dads it meets and its variants', () => {
  progress.reset();
  setCastOptions({ fixed: false, rand: seededRand(12) });
  resetEpisode();
  assert.equal(remembered.cast, false);
  rememberCast();
  assert.equal(remembered.cast, true);
  assert.deepEqual(progress.recentOf('villain'), [personOf(episode.villain)]);
  if (episode.ally) assert.deepEqual(progress.recentOf('ally'), [personOf(episode.ally)]);
  // Each dad she meets in a drawn form (seed 12: both dads, one waking her, one there too).
  const dads = [episode.primary, episode.secondary].filter((id): id is string => Boolean(id));
  assert.ok(dads.length > 0, 'seed 12 draws a dad');
  for (const id of dads) assert.deepEqual(progress.recentOf(`form_${personOf(id)}`), [id], id);
  const keys = Object.keys(progress.snapshot().recent);
  assert.ok(keys.some((k) => k.startsWith('quest_')), keys.join(' '));
  assert.ok(keys.includes('line_up'), keys.join(' '));
  // Once per episode: a second call (another step's advance) changes nothing.
  const before = JSON.stringify(progress.snapshot().recent);
  castEpisode();
  rememberCast();
  assert.equal(JSON.stringify(progress.snapshot().recent), before);
});

test('an overridden ally is not her rotation', () => {
  progress.reset();
  setCastOptions({ fixed: false, rand: seededRand(5), overrides: { ally: 'ellie' } });
  resetEpisode();
  rememberCast();
  assert.equal(personOf(episode.ally!), 'ellie');
  assert.deepEqual(progress.recentOf('ally'), []);
  assert.equal(progress.recentOf('villain').length, 1);
  setCastOptions({ overrides: {}, fixed: !EPISODE_DEFAULTS.randomCast });
});

test('solo lasts the session (hunt 7, M34): the next episode starts solo, until Dad presses', () => {
  episode.solo = true;
  resetEpisode();
  assert.equal(episode.solo, true, 'the next episode starts solo');
  episode.solo = false;
  resetEpisode();
  assert.equal(episode.solo, false);
});

test('door b (item 126): the Shape-Shifter about half the drawn episodes, else a sentence frame or the word machine', () => {
  const random = Math.random;
  Math.random = seededRand(126);
  try {
    progress.reset();
    setCastOptions({ fixed: false, rand: Math.random, overrides: {} });
    const doorB: string[] = [];
    for (let e = 0; e < 24; e++) {
      resetEpisode();
      rememberCast();
      const b = housePlan()[1]!;
      doorB.push(b.game);
      progress.episodeDone();
    }
    const shifters = doorB.filter((g) => g === 'shifter').length;
    assert.ok(shifters >= 8 && shifters <= 16, `${shifters} of 24: ${doorB.join(' ')}`);
    for (const g of doorB) assert.ok(g === 'shifter' || g === 'word_machine' || g.startsWith('sentence:'), g);
    assert.ok(doorB.some((g) => g.startsWith('sentence:')) && doorB.includes('word_machine'), doorB.join(' '));
  } finally {
    Math.random = random;
    setCastOptions({ overrides: {}, fixed: !EPISODE_DEFAULTS.randomCast });
  }
});
