/**
 * Item 067: the difficulty knob (src/rules/difficulty.ts) and variety across
 * episodes (src/rules/recent.ts, the store's `recent`, and every rotation
 * that draws through it: the ally, the dads' forms, the story and line
 * variants, the victory scene, the side rooms and the games).
 * `npx tsx --test tests/unit/variety.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formsOf, personOf } from '../../content/battle/roster';
import { ENDINGS } from '../../content/house/endings';
import { FETCH_ROOMS } from '../../content/house/house';
import { DIFFICULTY, VARIETY } from '../../src/config';
import { drawCast } from '../../src/rules/cast';
import { FAVOURED_WEIGHT, NEW_WORDS, favourWords, wordWeight } from '../../src/rules/bank';
import { seededRand } from '../../src/rules/random';
import { difficulty, helpLevel, rampsAdvance, setDifficulty } from '../../src/rules/difficulty';
import { pickEnding } from '../../src/rules/endings';
import { MINIGAMES, drawGames } from '../../src/rules/minigames';
import { fresh, leastRecent, nextVariant } from '../../src/rules/recent';
import { lineVariantKeys } from '../../content/voice/script';
import { drawLines, drawStory, pickVariant } from '../../src/rules/story';
import { ProgressStore, STORE_KEY } from '../../src/state/ProgressStore';
import { withDifficulty } from './difficulty';
import { memory } from './seeds';

// ---- The difficulty knob ----------------------------------------------------

test('difficulty: base by default; helpLevel holds every ramp at its start at base, up to the knob above it', () => {
  assert.equal(DIFFICULTY, 1, 'Matt\'s ruling: the default is base');
  assert.equal(difficulty(), DIFFICULTY);
  assert.equal(rampsAdvance(1), false);
  assert.equal(rampsAdvance(2), true);
  for (const recorded of [1, 2, 3]) assert.equal(helpLevel(recorded, 1, 1), 1, `recorded ${recorded} at base`);
  assert.equal(helpLevel(3, 1, 2), 2);
  assert.equal(helpLevel(1, 1, 2), 1);
  assert.equal(helpLevel(3, 1, 3), 3);
  assert.equal(helpLevel(2, 1, 3), 2);
  // A ramp that starts higher stays at its own start at base.
  assert.equal(helpLevel(1, 2, 1), 2);
  setDifficulty(7);
  assert.equal(difficulty(), DIFFICULTY, 'anything but 1-3 is ignored');
  withDifficulty(3, () => assert.equal(difficulty(), 3));
});

// ---- The helpers -------------------------------------------------------------

test('fresh: recent picks sit out while two are left, the newest always while another is; nothing recent is the pool itself', () => {
  const pool = ['a', 'b', 'c', 'd'];
  assert.deepEqual(fresh(pool, []), pool);
  assert.deepEqual(fresh(pool, ['a']), ['b', 'c', 'd']);
  assert.deepEqual(fresh(pool, ['a', 'b']), ['c', 'd']);
  assert.deepEqual(fresh(pool, ['a', 'b', 'c']), ['a', 'd'], 'two left: only the latest two sit out');
  assert.deepEqual(fresh(['a', 'b'], ['a']), ['b'], 'a pool of two alternates');
  assert.deepEqual(fresh(['a'], ['a']), ['a']);
  assert.deepEqual(fresh(pool, ['x', 'y']), pool, 'picks outside the pool are ignored');
});

test('leastRecent: never-used first, then the oldest; the side room left out last episode comes back', () => {
  const rand = seededRand(1);
  assert.deepEqual(leastRecent(['k', 'p', 'g'], ['k', 'p'], 1, rand), ['g']);
  assert.deepEqual(leastRecent(['k', 'p', 'g'], ['k', 'p', 'g'], 2, rand), ['k', 'p']);
  for (let i = 0; i < 20; i++) {
    const [r1, r2] = FETCH_ROOMS;
    const got = leastRecent(FETCH_ROOMS, [r1!, r2!], 2, rand);
    assert.ok(got.includes(FETCH_ROOMS[2]!), `${got} brings back ${FETCH_ROOMS[2]}`);
  }
});

// ---- The store ---------------------------------------------------------------

test('the store remembers rotations across page loads; an old blob loads with its last ending seeded; nothing is reset', () => {
  const storage = memory();
  const a = new ProgressStore(storage);
  a.remember('ally', 'scar');
  a.remember('ally', 'ellie');
  a.remember('ally', 'scar');
  a.remember('ally', 'dada_matt');
  assert.deepEqual(new ProgressStore(storage).recentOf('ally'), ['scar', 'dada_matt'], `keeps VARIETY.rotations (${VARIETY.rotations}), newest last, no repeats`);
  a.remember('ending', 'boat');
  assert.deepEqual(new ProgressStore(storage).recentOf('ending'), ['boat']);
  // A blob from before item 067: words, levels and its ending survive; `recent` starts from the ending.
  const old = memory();
  old.setItem(STORE_KEY, JSON.stringify({ version: 1, words: { cat: { seen: 3, right: 3, wrong: 0, recent: [true, true, true], last: 1 } }, grabLevels: { cat: 3 }, ending: 'picnic', episodes: 9 }));
  const back = new ProgressStore(old);
  assert.equal(back.stat('words', 'cat').seen, 3);
  assert.equal(back.snapshot().grabLevels.cat, 3);
  assert.equal(back.snapshot().episodes, 9);
  assert.deepEqual(back.recentOf('ending'), ['picnic']);
  assert.deepEqual(back.recentOf('words'), []);
  assert.equal('ending' in back.snapshot(), false, 'the old field leaves the blob');
  // Item 076: item 025's own villain list joins the rotations, its last 4 kept, and leaves the blob.
  const villains = memory();
  villains.setItem(STORE_KEY, JSON.stringify({ version: 1, villains: ['smaug', 'tiamat', 'bavmorda', 'jormungandr', 'moriarty'], recent: { ally: ['ellie'] } }));
  const met = new ProgressStore(villains);
  assert.deepEqual(met.recentOf('villain'), ['tiamat', 'bavmorda', 'jormungandr', 'moriarty']);
  assert.deepEqual(met.recentOf('ally'), ['ellie']);
  assert.equal('villains' in met.snapshot(), false);
  met.villainMet('smaug');
  met.villainMet('tiamat');
  assert.deepEqual(new ProgressStore(villains).recentOf('villain'), ['jormungandr', 'moriarty', 'smaug', 'tiamat'], 'met again moves to newest; 4 kept');
});

// ---- The rotations -------------------------------------------------------------

test('cast: her recent allies and each dad\'s recent forms sit out across episodes; nothing recent draws as before', () => {
  // With nothing recent the draw is exactly the old one (seeded episodes replay).
  const a = seededRand(5);
  const b = seededRand(5);
  for (let i = 0; i < 20; i++) assert.deepEqual(drawCast({ hero: 'julia', recentAllies: [], recentForms: {} }, a), drawCast({ hero: 'julia' }, b));
  const store = new ProgressStore(memory());
  const rand = seededRand(8);
  const allies: string[] = [];
  const matt: string[] = [];
  for (let e = 0; e < 40; e++) {
    const c = drawCast({ hero: 'julia', recent: store.recentOf('villain'), recentAllies: store.recentOf('ally'), recentForms: { dada_matt: store.recentOf('form_dada_matt') } }, rand);
    store.villainMet(personOf(c.villain));
    if (c.ally) {
      const p = personOf(c.ally);
      if (allies.length) assert.notEqual(p, allies.at(-1), `episode ${e}: the same ally twice running`);
      allies.push(p);
      store.remember('ally', p);
    }
    const form = [c.primary, c.secondary, c.ally, c.villain].find((id) => id && personOf(id) === 'dada_matt');
    if (form) {
      assert.ok(!store.recentOf('form_dada_matt').includes(form) || formsOf('dada_matt').length <= 2, `episode ${e}: Dada Matt as ${form} again soon`);
      matt.push(form);
      store.remember('form_dada_matt', form);
    }
  }
  // Item 121: Dada Jason's three forms go round: his last two sit out.
  const jason = formsOf('dada_jason').map((f) => f.id);
  assert.equal(jason.length, 3);
  for (let s = 1; s <= 30; s++) {
    const c = drawCast({ hero: 'julia', recentAllies: [], recentForms: { dada_jason: [jason[0]!, jason[1]!] } }, seededRand(s * 104729));
    const form = [c.primary, c.secondary, c.ally, c.villain].find((id) => id && personOf(id) === 'dada_jason');
    if (form) assert.equal(form, jason[2], `seed ${s}`);
  }
  assert.ok(new Set(allies).size >= 3, `allies: ${[...new Set(allies)]}`);
  assert.ok(new Set(matt).size >= 3, `forms: ${[...new Set(matt)]}`);
});

test('story and line variants: her last one sits out (two-variant lines alternate); fixed is still variant 1', () => {
  assert.equal(pickVariant(3, seededRand(1), true, [1]), 1, 'the default cast pins variant 1');
  for (let s = 1; s <= 30; s++) {
    assert.notEqual(pickVariant(2, seededRand(s), false, [1]), 1);
    assert.notEqual(pickVariant(3, seededRand(s), false, [2]), 2);
  }
  // Item 121: a line of three goes round all three before one comes back (the wake-up said one again two episodes on half the time).
  for (let s = 1; s <= 30; s++) {
    const rand = seededRand(s * 104729);
    const said: number[] = [];
    for (let e = 0; e < 9; e++) said.push(pickVariant(3, rand, false, said.slice(-2)));
    for (let e = 2; e < said.length; e++) assert.equal(new Set(said.slice(e - 2, e + 1)).size, 3, `seed ${s}: ${said}`);
  }
  // Through drawStory / drawLines, keyed by the store's names.
  const recent = (k: string) => (k === 'line_up' ? [1] : k.startsWith('scene_') ? [1] : []);
  for (let s = 1; s <= 30; s++) {
    const lines = drawLines('tiamat', seededRand(s), false, recent);
    assert.notEqual(lines.up, 1);
    const story = drawStory('ellie', seededRand(s), false, recent);
    if (story.scene === 1) assert.fail('ellie\'s last scene came straight back');
  }
});

test('victory scene: none of her recent scenes while two are left (was only the last)', () => {
  const cast = { hero: 'julia', ally: 'ellie', villain: 'tiamat', primary: 'dada_matt', secondary: null };
  const rand = seededRand(4);
  const recent = ENDINGS.slice(0, 2).map((e) => e.id);
  for (let i = 0; i < 100; i++) assert.ok(!recent.includes(pickEnding(cast, recent, rand)));
  for (let i = 0; i < 50; i++) assert.notEqual(pickEnding(cast, [ENDINGS[0]!.id], rand), ENDINGS[0]!.id);
});

test('games: a game she played in her last episodes weighs VARIETY.gameWeight, so the doors rotate', () => {
  const rand = seededRand(6);
  const count = (store: ProgressStore) => {
    const n: Record<string, number> = {};
    for (let i = 0; i < 600; i++) for (const g of drawGames(store, rand).slice(0, 2)) n[g.id] = (n[g.id] ?? 0) + 1;
    return n;
  };
  const plain = count(new ProgressStore(memory()));
  const store = new ProgressStore(memory());
  store.remember('games', 'word_machine', 6);
  const leaned = count(store);
  assert.ok(MINIGAMES.some((g) => g.id === 'word_machine'));
  assert.ok((leaned.word_machine ?? 0) < (plain.word_machine ?? 0) * 0.75, `machine ${plain.word_machine} → ${leaned.word_machine}`);
});

// ---- Line variants (item 087) ------------------------------------------------

test('line variants: in turn order, every one before a repeat, carried across episodes by the store', () => {
  assert.deepEqual(lineVariantKeys('house_doors'), ['house_doors', 'house_doors_2', 'house_doors_3', 'house_doors_4']);
  assert.deepEqual(lineVariantKeys('right').slice(0, 2), ['right_1', 'right_2']);
  assert.deepEqual(lineVariantKeys('house_front'), ['house_front']);
  const store = new ProgressStore(memory());
  const keys = lineVariantKeys('room_find');
  const said: string[] = [];
  for (let i = 0; i < keys.length * 2; i++) {
    const k = nextVariant(keys, store.recentOf('line:room_find'));
    store.remember('line:room_find', k, keys.length - 1);
    said.push(k);
  }
  assert.deepEqual(said, [...keys, ...keys]);
});

test('line variants: every line said several times an episode has at least three', () => {
  for (const k of ['right', 'wrong', 'move_great', 'room_listen', 'room_your_turn', 'room_find', 'got_item', 'house_doors', 'house_more', 'use_bag', 'machine_silly', 'machine_change', 'bridge_find', 'bridge_say', 'bridge_slide']) {
    assert.ok(lineVariantKeys(k).length >= 3, `${k}: ${lineVariantKeys(k).length}`);
  }
});

// ---- Item 121: the new words in play ------------------------------------------

test('?words=new: the new words weigh FAVOURED_WEIGHT in every draw, for this session only', () => {
  for (const w of ['tree', 'ham', 'hay', 'gate', 'stump', 'chomp', 'splash']) assert.ok(NEW_WORDS.includes(w), w);
  const store = new ProgressStore(memory());
  const plain = wordWeight(store, 'ham');
  const cat = wordWeight(store, 'cat');
  favourWords(NEW_WORDS);
  try {
    assert.equal(wordWeight(store, 'ham'), plain * FAVOURED_WEIGHT);
    assert.equal(wordWeight(store, 'cat'), cat);
  } finally {
    favourWords([]);
  }
  assert.equal(wordWeight(store, 'ham'), plain);
});
