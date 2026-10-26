/**
 * The side rooms' backdrops (`SideRoomSpec.pictures`): what a room's art plainly paints. Hunt 12, M85: the
 * hideout, the shared secret room of the places after the first eight, paints a treasure chest, and its
 * counter sentence asked for CHEST (JORMUNGANDR DOES NOT LIKE THE CHEST) with the answer on screen. Matt's
 * call (a): a counter room's pictured things are never the attic's counter there, as the doors' signs.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_SIDE_ROOMS, COUNTER_ROOM, PLACES, SIDE_ROOM_BY_ID } from '../../content/house/house';
import { EPISODE_DEFAULTS } from '../../src/config';
import { rememberCast, resetEpisode, setCastOptions } from '../../src/episode/draws';
import { housePlan } from '../../src/episode/plans';
import { episode } from '../../src/episode/state';
import { BAG_WORDS } from '../../src/rules/bank';
import { seededRand } from '../../src/rules/random';
import { episodePlans } from '../../src/rules/rooms';
import { ProgressStore } from '../../src/state/ProgressStore';
import { progress } from '../../src/state/progress';
import { memory, seeded, spread } from './seeds';

const COUNTER_ROOMS = [COUNTER_ROOM, ...PLACES.map((p) => p.secret.id)];

test('M85: the hideout\'s backdrop pictures its treasure chest; every pictured thing is a bag word; every counter room is listed', () => {
  assert.ok(SIDE_ROOM_BY_ID.secret_hideout!.pictures?.includes('chest'));
  for (const r of ALL_SIDE_ROOMS) for (const w of r.pictures ?? []) assert.ok(BAG_WORDS.includes(w), `${r.id}: ${w} is no bag word, so it keeps nothing out`);
  // The ones whose art paints a bank word (from the art, M85): a new secret room's list is a choice, not a miss.
  for (const id of ['attic', 'secret_hideout', 'tower_room', 'rainbow_room', 'star_observatory', 'treetop_lookout', 'waterfall_cave', 'crystal_vault', 'sweet_cellar']) {
    assert.ok(COUNTER_ROOMS.includes(id) && SIDE_ROOM_BY_ID[id]!.pictures?.length, id);
  }
});

test('M85: the counter word is never a thing its room\'s backdrop paints (`notCounter`), every room with pictures', () => {
  const fill = { villain: 'smaug', helper: 'ellie', hero: 'julia' };
  // Her bag holds only the room's pictured things, so the draw reaches for them first.
  const counters = (room: string, pictures: string[], notCounter?: string[]) => {
    const out: string[] = [];
    for (let seed = 1; seed <= 10; seed++) {
      const store = new ProgressStore(memory());
      store.refillBag(pictures);
      const plans = episodePlans(store, { fill, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: room, ...(notCounter ? { notCounter } : {}) }, seeded(spread(seed)));
      out.push(plans[2].key);
    }
    return out;
  };
  for (const r of ALL_SIDE_ROOMS.filter((s) => s.pictures?.length)) {
    // Without the rule the counter there draws a pictured thing (the hideout: CHEST): the test bites.
    assert.ok(counters(r.id, r.pictures!).some((w) => r.pictures!.includes(w)), `${r.id}: without it, a pictured thing comes up`);
    const got = counters(r.id, r.pictures!, r.pictures);
    for (const w of r.pictures!) assert.ok(!got.includes(w), `${r.id}: ${w} drawn as the counter`);
  }
});

test('M85: away at a place whose secret room is the hideout, the house plan never draws CHEST as the counter', () => {
  const random = Math.random;
  Math.random = seededRand(85);
  try {
    progress.reset();
    setCastOptions({ fixed: false, rand: Math.random, overrides: {} });
    const places = PLACES.filter((p) => p.secret.id === 'secret_hideout').map((p) => p.id);
    assert.ok(places.length > 0);
    const got: string[] = [];
    for (let e = 0; e < 20; e++) {
      resetEpisode();
      rememberCast();
      episode.place = places[e % places.length]!;
      episode.house.plan = null;
      // Her bag holds only the hideout's pictured things: without `planInput`'s `notCounter` they come up.
      progress.refillBag(SIDE_ROOM_BY_ID.secret_hideout!.pictures!);
      const counter = housePlan()[2]!;
      assert.equal(counter.room, 'secret_hideout');
      got.push(counter.key);
      progress.episodeDone();
    }
    for (const w of SIDE_ROOM_BY_ID.secret_hideout!.pictures!) assert.ok(!got.includes(w), `${w} in ${got.join(' ')}`);
  } finally {
    Math.random = random;
    setCastOptions({ overrides: {}, fixed: !EPISODE_DEFAULTS.randomCast });
  }
});
