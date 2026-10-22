/**
 * The home warm-up's pure rules (item 033): the ramp, the clue at each level,
 * the word draw and the hall's pictures, and that the grab word stays out of
 * the episode's reading.
 * `npx tsx --test tests/unit/grab.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BANK_BY_WORD } from '../../content/phonics/bank';
import { lookalikesOf } from '../../content/phonics/sentences';
import { PICTURE_WORDS } from '../../content/phonics/words';
import { letterNameLine, letterSoundLine, narratorLine, wordLine } from '../../content/voice/ids';
import { GRAB } from '../../src/config';
import { GRAB_WORDS, RECENT_GRABS, clue, grabLevel, hallObjects, nextLevel, pickGrab, recordedGrabLevel } from '../../src/rules/grab';
import { episodePlans, type EpisodeInput } from '../../src/rules/sentences';
import { machineWords } from '../../src/rules/wordMachine';
import { MINIGAME_BY_ID } from '../../src/rules/minigames';
import { ProgressStore } from '../../src/state/ProgressStore';
import { composeLines } from '../../tools/voice/compose';
import { withDifficulty } from './difficulty';
import { memory, seeded, spread } from './seeds';

test('ramp: a new word starts at GRAB.startLevel (1); right first time is harder, a first-try miss easier, kept within 1..3', () => {
  const store = new ProgressStore(memory());
  assert.equal(GRAB.startLevel, 1);
  assert.equal(grabLevel(store, 'van'), 1);
  assert.equal(nextLevel(1, true), 2);
  assert.equal(nextLevel(2, true), 3);
  assert.equal(nextLevel(2, false), 1);
  assert.equal(nextLevel(3, true), 3);
  assert.equal(nextLevel(1, false), 1);
  store.setGrabLevel('van', 3);
  assert.equal(recordedGrabLevel(store, 'van'), 3);
  assert.equal(grabLevel(new ProgressStore(memory()), 'van'), 1);
  // Item 067: the hall gives the start level at base, whatever she has reached; up to the knob above it.
  assert.equal(grabLevel(store, 'van'), 1);
  withDifficulty(2, () => assert.equal(grabLevel(store, 'van'), 2));
  withDifficulty(3, () => assert.equal(grabLevel(store, 'van'), 3));
});

test('clue: level 1 each letter name then its sound; 2 the sounds, letters shown; 3 the sounds, blank; help the sound-out, letters shown', () => {
  const ids = (l: 1 | 2 | 3, help = false) => clue('van', l, help).map((s) => s.id);
  const [nv, na, nn] = ['v', 'a', 'n'].map(letterNameLine);
  const sounds = ['v', 'a', 'n'].map(letterSoundLine);
  const [sv, sa, sn] = sounds;
  assert.deepEqual(ids(1), [nv, sv, na, sa, nn, sn]);
  assert.deepEqual(ids(2), sounds);
  assert.deepEqual(ids(3), sounds);
  for (const l of [1, 2, 3] as const) assert.deepEqual(ids(l, true), sounds);
  // Which letters show on the board: everything but level 3's sounds.
  assert.deepEqual(clue('van', 1).map((s) => [s.index, s.span, s.show]), [[0, 1, true], [0, 1, true], [1, 1, true], [1, 1, true], [2, 1, true], [2, 1, true]]);
  assert.ok(clue('van', 2).every((s) => s.show));
  assert.ok(clue('van', 3).every((s) => !s.show));
  assert.ok(clue('van', 3, true).every((s) => s.show));
});

test('clue: never the word (amendment 1549): no step is its word_ line or a line whose text has it, at any level, with or without help', () => {
  const byId = new Map(composeLines().map((l) => [l.id, l]));
  for (const w of GRAB_WORDS) {
    for (const l of [1, 2, 3] as const) {
      for (const help of [false, true]) {
        for (const s of clue(w, l, help)) {
          assert.notEqual(s.id, wordLine(w), `${w} level ${l}${help ? ' help' : ''}`);
          const line = byId.get(s.id);
          for (const t of [line?.text, line?.say]) assert.ok(!(t ?? '').toLowerCase().split(/[^a-z]+/).includes(w), `${s.id} says ${w}`);
        }
      }
    }
  }
});

test('clue: names only for single letters, sounds by sound unit (SH of SHIP is one sound lighting two letters, never named S, H: item 085)', () => {
  const ship = clue('ship', 1);
  assert.deepEqual(ship.map((s) => s.id), [letterSoundLine('sh'), letterNameLine('i'), letterSoundLine('i'), letterNameLine('p'), letterSoundLine('p')]);
  assert.deepEqual(ship.filter((s) => s.kind === 'name').map((s) => s.index), [2, 3]);
  // KING is "kay, kuh, eye, ih, ng": never "en, gee" before its NG.
  assert.deepEqual(clue('king', 1).map((s) => s.id), [letterNameLine('k'), letterSoundLine('k'), letterNameLine('i'), letterSoundLine('i'), letterSoundLine('ng')]);
  const sounds = ship.filter((s) => s.kind === 'sound');
  assert.deepEqual(sounds.map((s) => s.id), ['sh', 'i', 'p'].map(letterSoundLine));
  assert.deepEqual(sounds.map((s) => [s.index, s.span]), [[0, 2], [2, 1], [3, 1]]);
  // The help sounds it out by the same units, never blended.
  assert.deepEqual(clue('ship', 3, true).map((s) => s.id), ['sh', 'i', 'p'].map(letterSoundLine));
  // DUCK ends in CK; FROG's blend is two sounds, never one.
  assert.deepEqual(clue('duck', 3).map((s) => s.id), ['d', 'u', 'ck'].map(letterSoundLine));
  assert.deepEqual(clue('frog', 3).map((s) => s.id), ['f', 'r', 'o', 'g'].map(letterSoundLine));
});

test('voice: every clue line, and the warm-up narrator lines, exist; letter names say the name and show the capital', () => {
  const lines = composeLines();
  const byId = new Map(lines.map((l) => [l.id, l]));
  // A silent letter's step (KITE's E, item 056) has no line: it only lights.
  for (const w of GRAB_WORDS) for (const l of [1, 2, 3] as const) for (const s of [...clue(w, l), ...clue(w, l, true)]) assert.ok(s.id === '' || byId.has(s.id), s.id);
  assert.deepEqual(clue('kite', 3).map((s) => [s.index, s.id === '']), [[0, false], [1, false], [2, false], [3, true]]);
  for (const k of ['grab_ask', 'grab_wrong', 'grab_need', 'grab_door']) assert.ok(byId.has(narratorLine('dada_matt', k)), k);
  const v = byId.get(letterNameLine('v'))!;
  assert.equal(v.text, 'V.');
  assert.equal(v.say, 'Vee.');
});

test('pickGrab: avoids what it is told to, and last episode’s word while another will do; leans to shaky words', () => {
  const store = new ProgressStore(memory());
  const avoid = GRAB_WORDS.slice(0, 20);
  for (let i = 0; i < 50; i++) assert.ok(!avoid.includes(pickGrab(store, avoid, seeded(spread(i + 1)))));
  let t = 1;
  const clocked = new ProgressStore(memory(), () => t++);
  clocked.record('grabs', 'cat', true, 0);
  const pool = ['cat', 'dog'];
  const avoidAll = GRAB_WORDS.filter((w) => !pool.includes(w));
  for (let i = 0; i < 20; i++) assert.equal(pickGrab(clocked, avoidAll, seeded(spread(i + 1))), 'dog');
});

test('hallObjects: nine distinct pictures, the word among them, none avoided, no look-alike of it; while new, none starts like it', () => {
  const store = new ProgressStore(memory());
  for (let seed = 1; seed <= 40; seed++) {
    const word = GRAB_WORDS[seed % GRAB_WORDS.length]!;
    const avoid = ['cat', 'dog', 'sun', 'net', 'fan', 'pig'].filter((w) => w !== word);
    const objs = hallObjects(store, word, avoid, seeded(spread(seed)));
    for (const w of objs) if (w !== word) assert.notEqual(w[0], word[0], `${w} starts like ${word}, a new grab`);
    assert.equal(objs.length, GRAB.objects);
    assert.equal(new Set(objs).size, objs.length);
    assert.ok(objs.includes(word));
    for (const w of objs) {
      assert.ok(PICTURE_WORDS.some((c) => c.word === w), w);
      if (w !== word) {
        assert.ok(!avoid.includes(w), `${w} avoided`);
        assert.ok(!lookalikesOf(word).includes(w), `${w} looks like ${word}`);
      }
    }
  }
});

test('hallObjects: once her grabs of the word are firm (from difficulty 2, item 067), one picture shares its first sound or rime', () => {
  const store = new ProgressStore(memory());
  for (let i = 0; i < 4; i++) store.record('grabs', 'cat', true, 0);
  withDifficulty(2, () => {
    for (let seed = 1; seed <= 30; seed++) {
      const objs = hallObjects(store, 'cat', [], seeded(spread(seed))).filter((w) => w !== 'cat');
      const share = objs.filter((w) => w[0] === 'c' || w.endsWith('at'));
      assert.ok(share.length >= 1, `seed ${seed}: ${objs.join(' ')}`);
      assert.ok(!objs.includes('rat') && !objs.includes('bat'), 'never a look-alike');
    }
  });
});

test('pickGrab (item 067): every level from a fresh store, never a word over GRAB.maxUnits; none of her last RECENT_GRABS grabs', () => {
  for (const w of GRAB_WORDS) assert.ok(BANK_BY_WORD[w]!.units.length <= GRAB.maxUnits, w);
  assert.ok(!GRAB_WORDS.includes('octopus') && !GRAB_WORDS.includes('umbrella'));
  const rand = seeded(7);
  const fresh = new ProgressStore(memory());
  const levels = new Set<number>();
  for (let i = 0; i < 200; i++) levels.add(BANK_BY_WORD[pickGrab(fresh, [], rand)]!.level);
  assert.deepEqual([...levels].sort(), [1, 2, 3]);
  // Across episodes: her last three grabs sit out.
  let t = 1;
  const store = new ProgressStore(memory(), () => t++);
  const got: string[] = [];
  for (let e = 0; e < 12; e++) {
    const w = pickGrab(store, [], rand);
    assert.ok(!got.slice(-RECENT_GRABS).includes(w), `episode ${e}: ${w} again after ${got.slice(-RECENT_GRABS)}`);
    got.push(w);
    store.record('grabs', w, true, 0);
  }
});

test('said early: the grab word, passed as saidBefore, is never a room key, the counter or a word machine word', () => {
  const machine = MINIGAME_BY_ID['word_machine'];
  for (let seed = 1; seed <= 60; seed++) {
    const store = new ProgressStore(memory());
    const word = pickGrab(store, ['zap'], seeded(spread(seed)));
    const games = machine && seed % 2 ? { games: [machine, MINIGAME_BY_ID['sentence:we_can_use_the']!, MINIGAME_BY_ID['sentence:scared_of_the']!] as EpisodeInput['games'] } : {};
    const input: EpisodeInput = { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', saidBefore: [word], ...games };
    const plans = episodePlans(store, input, seeded(spread(seed + 100)));
    for (const p of plans) {
      assert.notEqual(p.key, word, `seed ${seed}: ${p.slot} key`);
      assert.ok(!p.fetches.includes(word), `seed ${seed}: ${p.slot} fetches`);
      if (p.kind === 'machine') assert.ok(!machineWords(p.machine).includes(word));
    }
  }
});
