/**
 * Item 025: the random cast, the dads' forms, the quests and the minigame pool;
 * the phonics voice's face (Matt's ruling M2, item 043).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OUTFITS } from '../../content/battle/outfits';
import { CHARACTER_BY_ID, DEFAULT_COMBO, PERSONS, ROSTER, comboFor, formsOf, personOf } from '../../content/battle/roster';
import { HOME, PLACES, PLACE_BY_ID, SIDE_ROOM_BY_ID, hubArt } from '../../content/house/house';
import { HOME_QUEST, QUESTS, questFor, questSetup } from '../../content/house/quests';
import { ANY_SCENES, CASTERS, HUB_SCENES, hubStory, type GiftSpot } from '../../content/house/scenes';
import { ART_BY_ID } from '../../content/art/assets';
import { ACTIVE_CAST, CAST_ODDS } from '../../src/config';
import { DADS, drawCast, phonicsFace, wakerOf } from '../../src/rules/cast';
import { seededRand } from '../../src/rules/random';
import { drawStory } from '../../src/rules/story';
import { MINIGAMES, drawGames } from '../../src/rules/minigames';
import { episodePlans } from '../../src/rules/rooms';
import { ProgressStore } from '../../src/state/ProgressStore';
import { castId, podiumCheer, podiumSecond } from '../../src/episode/cast';
import type { EpisodeState } from '../../src/episode/state';
import { memory } from './seeds';

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
  assert.equal(allyForms.length, 16, 'four Dada Matts, three Dada Jasons, Scar, Ellie, Seraphina, Elsa, Anna, Jasmine, Ozymandias, Moriarty and Bluerilla');
  // Item 115: Elsa, Ozymandias and Moriarty are both, and nobody is her own villain.
  for (const a of allyForms) for (const v of ACTIVE_CAST.villains) if (personOf(a) !== v) assert.ok(pairs.has(`${a}+${v}`), `${a} + ${v}`);
  for (const p of pairs) {
    const [a, v] = p.split('+');
    assert.notEqual(personOf(a!), personOf(v!), `${p}: one person, two roles`);
  }
  // Every active villain is drawn, the three of item 115 included.
  const drawn = new Set([...pairs].map((p) => personOf(p.split('+')[1]!)));
  assert.deepEqual([...drawn].sort(), [...ACTIVE_CAST.villains].sort());
  // Anybody off the list is still a fixed override away.
  assert.equal(drawCast({ hero: 'julia', overrides: { ally: 'anna', villain: 'rilla' } }, rand).villain, 'rilla');
  // An ally who is the only active villain leaves the rest of the roster.
  const lone = drawCast({ hero: 'julia', overrides: { ally: 'smaug' } }, rand, { allies: ['ellie'], villains: ['smaug'] });
  assert.ok(lone.villain && personOf(lone.villain) !== 'smaug');
  // A dad as the only active villain, with the other dad as hero, would leave nobody to wake her: the rest of the roster.
  const noWaker = drawCast({ hero: 'dada_jason' }, rand, { allies: ['ellie'], villains: ['dada_matt'] });
  assert.ok(noWaker.villain && !DADS.includes(personOf(noWaker.villain) as (typeof DADS)[number]), `villain ${noWaker.villain}`);
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
  // Seven active villains (item 115; four since item 028): the last four sit out, so three are left to choose from, not a fixed rotation.
  const four = seededRand(12);
  const seen: string[] = [];
  const nexts = new Set<string>();
  for (let i = 0; i < 400; i++) {
    const p = personOf(drawCast({ hero: 'julia', recent: seen.slice(-4) }, four).villain);
    assert.ok(!seen.slice(-4).includes(p), `${p} again after ${seen.slice(-4).join(', ')}`);
    if (i > 4) nexts.add(`${seen.slice(-2).join('+')}>${p}`);
    seen.push(p);
  }
  assert.ok(nexts.size > ACTIVE_CAST.villains.length * 2, 'more than one villain can follow the same two');
});

test('cast (item 078): a recent villain switched off in ACTIVE_CAST no longer counts toward who sits out', () => {
  const pool = PERSONS.map((c) => c.id).filter((p) => p !== 'julia' && !DADS.includes(p as (typeof DADS)[number])).slice(0, 4);
  const gone = PERSONS.map((c) => c.id).find((p) => p !== 'julia' && !pool.includes(p))!;
  const [a, b] = pool;
  const rand = seededRand(7);
  for (let i = 0; i < 200; i++) {
    // Before, the newest two of these sat out, the switched-off one among them, so A could come back.
    const p = personOf(drawCast({ hero: 'julia', recent: [a!, b!, gone] }, rand, { allies: pool, villains: pool }).villain);
    assert.ok(p !== a && p !== b, `${p} after ${a}, ${b} (and ${gone}, switched off)`);
  }
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

// Matt's ruling M2 (item 043, docs/qa-findings.md); the other rulings are tests/rulings.spec.ts.
test('M2: the phonics voice shows Dada Matt only when he is in the episode on her side', () => {
  const base = { hero: 'julia', ally: 'ellie', primary: null, secondary: null };
  assert.equal(phonicsFace({ ...base, primary: 'dada_matt_cyber' }), 'dada_matt');
  assert.equal(phonicsFace({ ...base, primary: 'dada_jason', secondary: 'dada_matt' }), 'dada_matt');
  assert.equal(phonicsFace({ ...base, primary: 'dada_jason_warrior' }), null, 'Jason woke her, no Matt: no face');
  assert.equal(phonicsFace({ ...base, ally: 'scar', primary: null }), null);
});

test('forms: every dad form has its good, evil and face art, and its outfits are drawn', () => {
  for (const c of ROSTER.filter((x) => x.person)) {
    for (const id of [`char_${c.id}_good`, `char_${c.id}_evil`, `face_${c.id}`, `item_${c.counter.id}`]) assert.ok(ART_BY_ID[id], id);
  }
  for (const list of Object.values(OUTFITS)) for (const o of list) assert.ok(ART_BY_ID[o.art] && ART_BY_ID[o.face], o.id);
});

test('quests: every possible ally has one; places and their rooms exist with art', () => {
  for (const c of ROSTER) {
    const q = questFor(c.id);
    assert.ok(q.place === HOME || PLACE_BY_ID[q.place], `${c.id}: ${q.place}`);
  }
  for (const id of Object.keys(QUESTS)) assert.ok(CHARACTER_BY_ID[id], `quest owner ${id} is in the roster`);
  // Every dad form and Ellie have a quest of their own (Matt, item 025).
  for (const id of [...ROSTER.filter((c) => DADS.includes(personOf(c.id) as never)).map((c) => c.id), 'ellie']) assert.ok(QUESTS[id], id);
  // Item 037: everybody has their own, with two to four setup lines to draw from (item 121 gave six a fourth).
  for (const c of ROSTER) assert.ok(QUESTS[c.id], `${c.id} has a quest`);
  for (const [id, q] of [...Object.entries(QUESTS), ['home', HOME_QUEST] as const]) assert.ok(q.lines.length >= 2 && q.lines.length <= 4, `${id}: ${q.lines.length} setup lines`);
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

test('hub scenes: every possible helper has two or three, each trailing off into the gift word', () => {
  // Item 037. Julia is the hero, so never the helper.
  for (const c of ROSTER.filter((x) => x.id !== 'julia')) {
    const scenes = HUB_SCENES[c.id];
    assert.ok(scenes && scenes.length >= 2 && scenes.length <= 4, `${c.id} has 2-4 hub scenes`);
    for (const s of scenes) {
      assert.ok(s.lines.length >= 2 && s.lines.length <= 4, `${c.id}: 2-4 lines`);
      assert.ok(s.lines[s.lines.length - 1]!.text.endsWith('...'), `${c.id}: "${s.lines.at(-1)!.text}" trails off into the word`);
      for (const l of s.lines.slice(0, -1)) assert.ok(!l.text.endsWith('...'), `${c.id}: only the reveal trails off`);
      // The prop: a painted prop, or an emoji on a card.
      assert.ok(s.prop.startsWith('prop_') ? ART_BY_ID[s.prop] : !/^[a-z_]+$/.test(s.prop), `${c.id}: prop ${s.prop}`);
    }
  }
  for (const id of Object.keys(HUB_SCENES)) assert.ok(CHARACTER_BY_ID[id], `hub scene owner ${id} is in the roster`);
});

test('story: the quest line and hub scene are drawn with the cast, the same for the same seed, variant 1 for the default cast', () => {
  const ids = ROSTER.filter((c) => c.id !== 'julia').map((c) => c.id);
  const run = (seed: number) => {
    const rand = seededRand(seed);
    return ids.map((id) => drawStory(id, rand, false));
  };
  assert.deepEqual(run(5), run(5), 'deterministic under a seeded rand');
  assert.notDeepEqual(run(5), run(6), 'another seed, other variants');
  for (const id of ids) assert.deepEqual(drawStory(id, seededRand(9), true), { quest: 1, scene: 1 }, `${id}: the default cast pins variant 1`);
  // Every variant comes up, and only real ones.
  const rand = seededRand(11);
  for (const id of ids) {
    const quests = new Set<number>();
    const scenes = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const s = drawStory(id, rand, false);
      quests.add(s.quest);
      scenes.add(s.scene);
    }
    assert.equal(quests.size, QUESTS[id]!.lines.length, `${id}: every quest line`);
    assert.equal(scenes.size, HUB_SCENES[id]!.length, `${id}: every hub scene`);
    assert.ok(Math.max(...quests) === QUESTS[id]!.lines.length && Math.max(...scenes) === HUB_SCENES[id]!.length);
  }
  // Ids: the owner's own lines; with none of their own, the narrator's home quest and fallback scene.
  assert.equal(questSetup('dada_jason', 'dada_jason', 2).id, 'quest_dada_jason_2');
  assert.equal(questSetup('nobody', 'dada_matt', 3).id, 'nar_dada_matt_quest_home_3');
  assert.deepEqual(hubStory('ellie', 'ellie', 1).ids.lines, ['hub_ellie_1_line1', 'hub_ellie_1_line2', 'hub_ellie_1_line3']);
  assert.equal(hubStory('dada_matt_cyber', 'dada_matt', 2).ids.circle, 'hub_dada_matt_cyber_2_circle');
  assert.equal(hubStory('nobody', 'dada_jason', 1).ids.done, 'nar_dada_jason_hub_any_1_done');
  // A variant drawn for one helper still names a line for another (wrapped).
  assert.equal(hubStory('jormungandr', 'jormungandr', 3).ids.done, 'hub_jormungandr_1_done');
});

test('gift spots (item 138): a spell keeps the magic circle, a dish or a gadget gets its own spot, and the line names it', () => {
  const NAMED: Record<GiftSpot, RegExp> = {
    magic: /circle/,
    plate: /the plate/,
    tools: /the tool table/,
    charger: /the (charging spot|upload pad|launch pad)/,
    training: /the training spot/,
    blanket: /the blanket/,
    nest: /the straw/,
    treasure: /the treasure,/,
  };
  for (const s of [...Object.values(HUB_SCENES).flat(), ...ANY_SCENES]) assert.match(s.circle.text, NAMED[s.spot], `"${s.circle.text}" names its ${s.spot} spot`);
  // Every scene a caster or a spell-giving form plays is a spell: the circle.
  for (const id of CASTERS) for (const s of HUB_SCENES[id]!) assert.equal(s.spot, 'magic', `${id}: ${s.circle.text}`);
  // The chef's dishes and the builder's gadgets are not.
  for (const s of HUB_SCENES.dada_jason!) assert.equal(s.spot, 'plate');
  for (const s of HUB_SCENES.dada_matt!) assert.equal(s.spot, 'tools');
  for (const s of HUB_SCENES.scar!) assert.equal(s.spot, 'charger');
  // Hunt 11: steam rises off a hot dish only (soup, stew), never a cupcake or strawberries; the paper she is
  // told to take is a paper.
  const all = [...Object.values(HUB_SCENES).flat(), ...ANY_SCENES];
  assert.deepEqual(all.filter((s) => s.hot).map((s) => s.prop).sort(), ['🍲', '🥕', '🥣'].sort());
  for (const s of all.filter((x) => x.hot)) assert.equal(s.spot, 'plate');
  for (const s of all.filter((x) => /the paper/.test(x.circle.text))) assert.equal(s.prop, '📝');
});

test('active allies (item 111): each has what an ally in the draw uses', () => {
  for (const person of ACTIVE_CAST.allies) {
    for (const f of formsOf(person)) {
      const id = f.id;
      // A place of their own, not the home quest, with three setup lines or more.
      assert.ok(QUESTS[id] && QUESTS[id]!.place !== HOME && QUESTS[id]!.lines.length >= 3, `${id}: own quest place, three lines or more`);
      // Three hub scenes, as Ellie and Scar have (a dad's other forms two or more).
      assert.ok(HUB_SCENES[id]!.length >= (f.person ? 2 : 3), `${id}: hub scenes`);
    }
    // A combo written with her, not the default team blast.
    assert.notEqual(comboFor('julia', person), DEFAULT_COMBO, `${person}: a combo with Julia`);
  }
  // Seraphina (amendment, Matt): her secret dragon hatchery and her pink pet dragon in the fight.
  assert.equal(QUESTS.seraphina!.place, 'dragon_hatchery');
  assert.ok(CHARACTER_BY_ID.seraphina!.good.abilities.some((a) => a.minion === 'pink_dragon'));
  // Item 114: the second wave, each in a place of their own, Ozymandias from Antarctica with his penguin crew.
  assert.deepEqual(['ozymandias', 'moriarty', 'rilla'].map((id) => QUESTS[id]!.place), ['iceberg_launchpad', 'puzzle_library', 'jungle_treetops']);
  const shared = new Map<string, string[]>();
  // Item 122: whether each is switched on is ACTIVE_CAST's business (a config change), not the test's.
  for (const person of new Set([...ACTIVE_CAST.allies, 'ozymandias', 'moriarty', 'rilla'])) for (const f of formsOf(person)) shared.set(QUESTS[f.id]!.place, [...(shared.get(QUESTS[f.id]!.place) ?? []), f.id]);
  for (const id of ['ozymandias', 'moriarty', 'rilla']) assert.deepEqual(shared.get(QUESTS[id]!.place), [id], `${id}: a place of their own`);
  const ozy = CHARACTER_BY_ID.ozymandias!;
  assert.equal(ozy.arena, 'iceberg');
  assert.ok(ozy.good.abilities.some((a) => a.minion === 'penguin'));
  assert.equal(ozy.counter.word, 'fish');
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
  const plans = episodePlans(store, { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'pop', rooms: ['bubble_baths', 'toy_cloud'], counterRoom: 'rainbow_room' }, rand);
  assert.deepEqual(plans.map((p) => p.room), ['bubble_baths', 'toy_cloud', 'rainbow_room']);
  for (const p of plans) assert.equal(p.scene, p.kind === 'machine' ? 'WordMachine' : p.kind === 'charge' ? 'ChargeRoom' : p.kind === 'bridge' ? 'BridgeRoom' : p.kind === 'shifter' ? 'ShifterRoom' : p.kind === 'rhyme' ? 'RhymeRoom' : 'SentenceRoom');
});

test('podium (hunt 10, M50): with an ally the dad who woke her cheers beside it, never twice and never the villain', () => {
  const rand = seededRand(11);
  let cheered = 0;
  for (let i = 0; i < N; i++) {
    const c = drawCast({ hero: 'julia' }, rand);
    const state = { ...c, villainWasRandom: true } as unknown as EpisodeState;
    const cheer = podiumCheer(state);
    const second = podiumSecond(state);
    if (!c.ally) {
      assert.equal(cheer, null, 'with no ally he has the left block');
      continue;
    }
    assert.equal(second, c.ally);
    const dad = personOf(wakerOf(c));
    if (dad === personOf(c.ally) || dad === personOf(c.villain)) assert.equal(cheer, null, JSON.stringify(c));
    else {
      cheered++;
      assert.equal(personOf(cheer!), dad, JSON.stringify(c));
      // In his form today.
      assert.equal(cheer, castId(wakerOf(c), state));
    }
  }
  assert.ok(cheered > 0, 'some podiums have him cheering');
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
