/**
 * Item 025: the random cast, the dads' forms, the quests and the minigame pool.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FORMS } from '../../content/battle/forms';
import { CHARACTER_BY_ID, PERSONS, ROSTER, formsOf, personOf } from '../../content/battle/roster';
import { HOME, PLACES, PLACE_BY_ID, SIDE_ROOM_BY_ID, hubArt } from '../../content/house/house';
import { QUESTS, questFor } from '../../content/house/quests';
import { ART_BY_ID } from '../../content/art/assets';
import { ACTIVE_CAST, CAST_ODDS } from '../../src/config';
import { DADS, drawCast, seededRand, wakerOf } from '../../src/rules/cast';
import { MINIGAMES, drawGames } from '../../src/rules/minigames';
import { episodePlans } from '../../src/rules/sentences';
import { ProgressStore, type StorageLike } from '../../src/state/ProgressStore';

function memory(): StorageLike {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

const N = 4000;

test('cast: every role is filled with roster ids, and nobody plays two roles', () => {
  const rand = seededRand(1);
  for (let i = 0; i < N; i++) {
    const c = drawCast({ hero: 'julia' }, rand);
    for (const id of [c.ally, c.villain, c.primary, c.secondary]) if (id) assert.ok(CHARACTER_BY_ID[id], id);
    const persons = [c.hero, c.ally, c.villain, c.primary, c.secondary].filter((x): x is string => Boolean(x)).map(personOf);
    assert.equal(new Set(persons).size, persons.length, `one role each: ${JSON.stringify(c)}`);
    // Somebody wakes her, and it is a dad.
    assert.ok((DADS as readonly string[]).includes(personOf(wakerOf(c))), JSON.stringify(c));
    if (c.secondary) assert.ok(c.primary, 'a secondary dad only beside a primary one');
  }
});

test('cast: Dada Matt is primary 60% of the time when both dads are free; the other dad comes in half the time', () => {
  const rand = seededRand(2);
  let free = 0;
  let matt = 0;
  let second = 0;
  for (let i = 0; i < N; i++) {
    const c = drawCast({ hero: 'julia' }, rand);
    const busy = [c.ally, c.villain].filter(Boolean).map((id) => personOf(id!));
    if (DADS.some((d) => busy.includes(d))) continue;
    free++;
    if (c.primary && personOf(c.primary) === 'dada_matt') matt++;
    if (c.secondary) second++;
  }
  assert.ok(Math.abs(matt / free - CAST_ODDS.mattPrimary) < 0.04, `Matt primary ${matt}/${free}`);
  assert.ok(Math.abs(second / free - CAST_ODDS.secondary) < 0.04, `secondary ${second}/${free}`);
});

test('cast: with the whole roster switched on, villains and allies come from all of it, dads in every form', () => {
  const rand = seededRand(3);
  const everybody = PERSONS.map((c) => c.id);
  const villains = new Set<string>();
  const allies = new Set<string>();
  const primaries = new Set<string>();
  for (let i = 0; i < N; i++) {
    const c = drawCast({ hero: 'julia' }, rand, { allies: everybody, villains: everybody });
    villains.add(c.villain);
    if (c.ally) allies.add(c.ally);
    if (c.primary) primaries.add(c.primary);
  }
  // Every roster character (forms included) can be the villain; every one but the hero can be the ally.
  for (const c of ROSTER) {
    if (c.id === 'julia') continue;
    assert.ok(villains.has(c.id), `villain ${c.id}`);
    assert.ok(allies.has(c.id), `ally ${c.id}`);
  }
  for (const d of DADS) for (const f of formsOf(d)) assert.ok(primaries.has(f.id), `primary ${f.id}`);
});

test('cast: the active cast (item 028) draws only its allies and villains, every pair of them, dads in every form', () => {
  const rand = seededRand(11);
  const pairs = new Set<string>();
  for (let i = 0; i < N; i++) {
    const c = drawCast({ hero: 'julia' }, rand);
    assert.ok(ACTIVE_CAST.villains.includes(personOf(c.villain)), `villain ${c.villain}`);
    assert.ok(c.ally && ACTIVE_CAST.allies.includes(personOf(c.ally)), `ally ${c.ally}`);
    pairs.add(`${c.ally}+${c.villain}`);
  }
  const allyForms = ACTIVE_CAST.allies.flatMap((p) => formsOf(p).map((f) => f.id));
  assert.equal(allyForms.length, 9, 'four Dada Matts, three Dada Jasons, Scar and Ellie');
  for (const a of allyForms) for (const v of ACTIVE_CAST.villains) assert.ok(pairs.has(`${a}+${v}`), `${a} + ${v}`);
  // Anybody off the list is still a fixed override away.
  assert.equal(drawCast({ hero: 'julia', overrides: { ally: 'anna', villain: 'rilla' } }, rand).villain, 'rilla');
  // An ally who is the only active villain leaves the rest of the roster.
  const lone = drawCast({ hero: 'julia', overrides: { ally: 'smaug' } }, rand, { allies: ['ellie'], villains: ['smaug'] });
  assert.ok(lone.villain && personOf(lone.villain) !== 'smaug');
});

test("cast: never last episode's villain, and none of the last few while others are left", () => {
  const rand = seededRand(4);
  const everybody = PERSONS.map((c) => c.id);
  const recent: string[] = [];
  for (let i = 0; i < 300; i++) {
    const c = drawCast({ hero: 'julia', recent }, rand, { allies: everybody, villains: everybody });
    const p = personOf(c.villain);
    assert.ok(!recent.includes(p), `${p} again after ${recent.join(', ')}`);
    recent.push(p);
    if (recent.length > 4) recent.shift();
  }
  // Four active villains (item 028): the last two sit out, so two are left to choose from, not a fixed rotation.
  const four = seededRand(12);
  const seen: string[] = [];
  const nexts = new Set<string>();
  for (let i = 0; i < 400; i++) {
    const p = personOf(drawCast({ hero: 'julia', recent: seen.slice(-4) }, four).villain);
    assert.ok(!seen.slice(-2).includes(p), `${p} again after ${seen.slice(-2).join(', ')}`);
    if (i > 4) nexts.add(`${seen.slice(-2).join('+')}>${p}`);
    seen.push(p);
  }
  assert.ok(nexts.size > ACTIVE_CAST.villains.length * 2, 'more than one villain can follow the same two');
});

test('cast: overrides fix any part; a dad picked by person plays his own form', () => {
  const rand = seededRand(5);
  const c = drawCast({ hero: 'julia', overrides: { ally: 'dada_jason', villain: 'tiamat', primary: 'dada_matt', secondary: false, forms: { dada_matt: 'lifter' } } }, rand);
  assert.deepEqual(c, { hero: 'julia', ally: 'dada_jason', villain: 'tiamat', primary: 'dada_matt_lifter', secondary: null });
  const w = drawCast({ hero: 'julia', overrides: { ally: 'dada_jason_warlock', villain: 'dada_matt_cyber' } }, rand);
  assert.equal(w.primary, null, 'both dads are busy: nobody else wakes her');
  assert.equal(wakerOf(w), 'dada_jason_warlock', 'the ally dad wakes her');
  const none = drawCast({ hero: 'julia', overrides: { ally: null } }, rand);
  assert.equal(none.ally, null);
});

test('cast: a fixed primary dad drawn as the villain hands the waking to the other dad', () => {
  const c = drawCast({ hero: 'julia', overrides: { ally: 'ellie', villain: 'dada_matt_lifter', primary: 'dada_matt', secondary: false } }, seededRand(10));
  assert.equal(personOf(c.primary!), 'dada_jason');
  assert.equal(personOf(wakerOf(c)), 'dada_jason');
  // Even with no primary at all, the villain never wakes her.
  assert.equal(wakerOf({ hero: 'julia', ally: 'ellie', primary: null, villain: 'dada_matt' }), 'dada_jason');
});

test('cast: the same seed draws the same episodes', () => {
  const a = seededRand(9);
  const b = seededRand(9);
  for (let i = 0; i < 20; i++) assert.deepEqual(drawCast({ hero: 'julia' }, a), drawCast({ hero: 'julia' }, b));
});

test('forms: every dad form has its good, evil and face art, and its outfits are drawn', () => {
  for (const c of ROSTER.filter((x) => x.person)) {
    for (const id of [`char_${c.id}_good`, `char_${c.id}_evil`, `face_${c.id}`, `item_${c.counter.id}`]) assert.ok(ART_BY_ID[id], id);
  }
  for (const list of Object.values(FORMS)) for (const f of list) assert.ok(ART_BY_ID[f.art] && (!f.face || ART_BY_ID[f.face]), f.id);
});

test('quests: every possible ally has one; places and their rooms exist with art', () => {
  for (const c of ROSTER) {
    const q = questFor(c.id);
    assert.ok(q.place === HOME || PLACE_BY_ID[q.place], `${c.id}: ${q.place}`);
  }
  for (const id of Object.keys(QUESTS)) assert.ok(CHARACTER_BY_ID[id], `quest owner ${id} is in the roster`);
  // Every dad form and Ellie have a quest of their own (Matt, item 025).
  for (const id of [...ROSTER.filter((c) => DADS.includes(personOf(c.id) as never)).map((c) => c.id), 'ellie']) assert.ok(QUESTS[id], id);
  for (const p of PLACES) {
    assert.ok(ART_BY_ID[hubArt(p.id)], hubArt(p.id));
    assert.equal(p.rooms.length, 2, p.id);
    for (const r of [...p.rooms, p.secret]) {
      assert.ok(SIDE_ROOM_BY_ID[r.id], r.id);
      assert.ok(ART_BY_ID[`room_side_${r.id}`], r.id);
    }
  }
  assert.ok(PERSONS.length < ROSTER.length);
});

test('minigames: three different games a episode, fetch twice then the counter, weighted, from the pool', () => {
  const store = new ProgressStore(memory());
  const rand = seededRand(6);
  const seen = new Set<string>();
  for (let i = 0; i < 400; i++) {
    const [a, b, c] = drawGames(store, rand);
    assert.notEqual(a.id, b.id);
    assert.ok(a.slots.includes('fetch') && b.slots.includes('fetch') && c.slots.includes('counter'));
    for (const g of [a, b, c]) seen.add(g.id);
  }
  assert.equal(seen.size, MINIGAMES.length, 'every game in the pool comes up');
  // The plans carry the drawn game and its scene, in the place's rooms.
  const plans = episodePlans(store, { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', spell: 'pop', rooms: ['bubble_baths', 'toy_cloud'], counterRoom: 'rainbow_room' }, rand);
  assert.deepEqual(plans.map((p) => p.room), ['bubble_baths', 'toy_cloud', 'rainbow_room']);
  for (const p of plans) assert.equal(p.scene, p.kind === 'machine' ? 'WordMachine' : 'SentenceRoom');
});

test("minigames: a game's weight leans the draw", () => {
  const store = new ProgressStore(memory());
  const rand = seededRand(8);
  const heavy = MINIGAMES.filter((g) => g.slots.includes('fetch'))[0]!;
  const pool = MINIGAMES.map((g) => (g.id === heavy.id ? { ...g, weight: 20 } : g));
  let hits = 0;
  for (let i = 0; i < 300; i++) if (drawGames(store, rand, pool).slice(0, 2).some((g) => g.id === heavy.id)) hits++;
  assert.ok(hits > 270, `heavy game drawn ${hits}/300`);
});
