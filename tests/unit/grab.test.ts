/**
 * The home warm-up's pure rules (item 033): the ramp, the clue at each level,
 * the word draw and the hall's pictures, and that the grab word stays out of
 * the episode's reading.
 * `npx tsx --test tests/unit/grab.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BANK, BANK_BY_WORD } from '../../content/phonics/bank';
import { lookalikesOf } from '../../content/phonics/sentences';
import { CVC_WORDS } from '../../content/phonics/words';
import { letterNameLine, letterSoundLine, narratorLine, wordLine } from '../../content/voice/ids';
import { GRAB } from '../../src/config';
import { GRAB_WORDS, clue, grabLevel, hallObjects, nextLevel, pickGrab } from '../../src/rules/grab';
import { episodePlans, type EpisodeInput } from '../../src/rules/sentences';
import { machineWords } from '../../src/rules/wordMachine';
import { MINIGAME_BY_ID } from '../../src/rules/minigames';
import { ProgressStore, type StorageLike } from '../../src/state/ProgressStore';
import { composeLines } from '../../tools/voice/compose';

function memory(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function seeded(seed = 1): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

test('ramp: a new word starts at GRAB.startLevel (2); right first time is harder, a first-try miss easier, kept within 1..3', () => {
  const store = new ProgressStore(memory());
  assert.equal(GRAB.startLevel, 2);
  assert.equal(grabLevel(store, 'van'), 2);
  assert.equal(nextLevel(2, true), 3);
  assert.equal(nextLevel(2, false), 1);
  assert.equal(nextLevel(3, true), 3);
  assert.equal(nextLevel(1, false), 1);
  store.setGrabLevel('van', 3);
  assert.equal(grabLevel(store, 'van'), 3);
  assert.equal(grabLevel(new ProgressStore(memory()), 'van'), 2);
});

test('clue: level 1 is the word, names, sounds; level 2 names and sounds; level 3 sounds only; help adds the word', () => {
  const ids = (l: 1 | 2 | 3, help = false) => clue('van', l, help).map((s) => s.id);
  const names = ['v', 'a', 'n'].map(letterNameLine);
  const sounds = ['v', 'a', 'n'].map(letterSoundLine);
  assert.deepEqual(ids(1), [wordLine('van'), ...names, ...sounds]);
  assert.deepEqual(ids(2), [...names, ...sounds]);
  assert.deepEqual(ids(3), sounds);
  assert.deepEqual(ids(3, true), [wordLine('van'), ...sounds]);
  assert.deepEqual(ids(2, true), [wordLine('van'), ...names, ...sounds]);
  // Each step lights one letter; the word itself lights none.
  assert.deepEqual(clue('van', 1).map((s) => [s.index, s.span]), [[null, 0], [0, 1], [1, 1], [2, 1], [0, 1], [1, 1], [2, 1]]);
});

test('clue: names go letter by letter, sounds by sound unit (SH of SHIP is one sound lighting two letters)', () => {
  const ship = clue('ship', 2);
  assert.deepEqual(ship.filter((s) => s.kind === 'name').map((s) => s.id), ['s', 'h', 'i', 'p'].map(letterNameLine));
  const sounds = ship.filter((s) => s.kind === 'sound');
  assert.deepEqual(sounds.map((s) => s.id), ['sh', 'i', 'p'].map(letterSoundLine));
  assert.deepEqual(sounds.map((s) => [s.index, s.span]), [[0, 2], [2, 1], [3, 1]]);
  // DUCK ends in CK; FROG's blend is two sounds, never one.
  assert.deepEqual(clue('duck', 3).map((s) => s.id), ['d', 'u', 'ck'].map(letterSoundLine));
  assert.deepEqual(clue('frog', 3).map((s) => s.id), ['f', 'r', 'o', 'g'].map(letterSoundLine));
});

test('voice: every clue line, and the warm-up narrator lines, exist; letter names say the name and show the capital', () => {
  const lines = composeLines();
  const byId = new Map(lines.map((l) => [l.id, l]));
  for (const w of GRAB_WORDS) for (const l of [1, 2, 3] as const) for (const s of clue(w, l, true)) assert.ok(byId.has(s.id), s.id);
  for (const k of ['grab_ask', 'grab_wrong', 'grab_need', 'grab_door']) assert.ok(byId.has(narratorLine('dada_matt', k)), k);
  const v = byId.get(letterNameLine('v'))!;
  assert.equal(v.text, 'V.');
  assert.equal(v.say, 'Vee.');
});

test('pickGrab: avoids what it is told to, and last episode’s word while another will do; leans to shaky words', () => {
  const store = new ProgressStore(memory());
  const avoid = GRAB_WORDS.slice(0, 20);
  for (let i = 0; i < 50; i++) assert.ok(!avoid.includes(pickGrab(store, avoid, seeded(i + 1))));
  let t = 1;
  const clocked = new ProgressStore(memory(), () => t++);
  clocked.record('grabs', 'cat', true, 0);
  const pool = ['cat', 'dog'];
  const avoidAll = GRAB_WORDS.filter((w) => !pool.includes(w));
  for (let i = 0; i < 20; i++) assert.equal(pickGrab(clocked, avoidAll, seeded(i + 1)), 'dog');
});

test('hallObjects: nine distinct pictures, the word among them, none avoided, no look-alike of it; while new, none starts like it', () => {
  const store = new ProgressStore(memory());
  for (let seed = 1; seed <= 40; seed++) {
    const word = GRAB_WORDS[seed % GRAB_WORDS.length]!;
    const avoid = ['cat', 'dog', 'sun', 'net', 'fan', 'pig'].filter((w) => w !== word);
    const objs = hallObjects(store, word, avoid, seeded(seed));
    for (const w of objs) if (w !== word) assert.notEqual(w[0], word[0], `${w} starts like ${word}, a new grab`);
    assert.equal(objs.length, GRAB.objects);
    assert.equal(new Set(objs).size, objs.length);
    assert.ok(objs.includes(word));
    for (const w of objs) {
      assert.ok(CVC_WORDS.some((c) => c.word === w), w);
      if (w !== word) {
        assert.ok(!avoid.includes(w), `${w} avoided`);
        assert.ok(!lookalikesOf(word).includes(w), `${w} looks like ${word}`);
      }
    }
  }
});

test('hallObjects: once her grabs of the word are firm, one picture shares its first sound or rime', () => {
  const store = new ProgressStore(memory());
  for (let i = 0; i < 4; i++) store.record('grabs', 'cat', true, 0);
  for (let seed = 1; seed <= 30; seed++) {
    const objs = hallObjects(store, 'cat', [], seeded(seed)).filter((w) => w !== 'cat');
    const share = objs.filter((w) => w[0] === 'c' || w.endsWith('at'));
    assert.ok(share.length >= 1, `seed ${seed}: ${objs.join(' ')}`);
    assert.ok(!objs.includes('rat') && !objs.includes('bat'), 'never a look-alike');
  }
});

test('pickGrab: a blend or digraph word waits until CVC firms up (the level gate)', () => {
  // One stream: this generator's first draw from a small seed is always near 0.
  const rand = seeded(7);
  const fresh = new ProgressStore(memory());
  for (let i = 0; i < 60; i++) assert.equal(BANK_BY_WORD[pickGrab(fresh, [], rand)]!.level, 1);
  // Every CVC word read solidly: blends open, and come up.
  const firm = new ProgressStore(memory());
  for (const w of BANK.filter((b) => b.level === 1)) for (let i = 0; i < 4; i++) firm.record('words', w.word, true, 0);
  const levels = new Set<number>();
  for (let i = 0; i < 200; i++) levels.add(BANK_BY_WORD[pickGrab(firm, [], rand)]!.level);
  assert.ok(levels.has(2), 'a blend comes up once CVC is firm');
});

test('said early: the grab word, passed as saidBefore, is never a room key, the counter or a word machine word', () => {
  const machine = MINIGAME_BY_ID['word_machine'];
  for (let seed = 1; seed <= 60; seed++) {
    const store = new ProgressStore(memory());
    const word = pickGrab(store, ['zap'], seeded(seed));
    const games = machine && seed % 2 ? { games: [machine, MINIGAME_BY_ID['sentence:we_can_use_the']!, MINIGAME_BY_ID['sentence:scared_of_the']!] as EpisodeInput['games'] } : {};
    const input: EpisodeInput = { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', spell: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', saidBefore: [word], ...games };
    const plans = episodePlans(store, input, seeded(seed + 100));
    for (const p of plans) {
      assert.notEqual(p.key, word, `seed ${seed}: ${p.slot} key`);
      assert.ok(!p.fetches.includes(word), `seed ${seed}: ${p.slot} fetches`);
      if (p.kind === 'machine') assert.ok(!machineWords(p.machine).includes(word));
    }
  }
});
