/**
 * The home warm-up's pure rules (item 033): the ramp, the clue at each level,
 * the word draw and the hall's pictures, and that the grab word stays out of
 * the episode's reading.
 * `npx tsx --test tests/unit/grab.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BANK_BY_WORD } from '../../content/phonics/bank';
import { NO_BAG_COPY, lookalikesOf } from '../../content/phonics/sentences';
import { PICTURE_WORDS } from '../../content/phonics/words';
import { letterSoundLine, narratorLine, wordLine } from '../../content/voice/ids';
import { GRAB, RECENT_GRABS } from '../../src/config';
import { stepLevel } from '../../src/rules/difficulty';
import { GRAB_WORDS, clue, grabLevel, grabSays, hallObjects, pickGrab, recordedGrabLevel } from '../../src/rules/grab';
import { episodePlans, type EpisodeInput } from '../../src/rules/rooms';
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
  assert.equal(stepLevel(1, true), 2);
  assert.equal(stepLevel(2, true), 3);
  assert.equal(stepLevel(2, false), 1);
  assert.equal(stepLevel(3, true), 3);
  assert.equal(stepLevel(1, false), 1);
  store.setGrabLevel('van', 3);
  assert.equal(recordedGrabLevel(store, 'van'), 3);
  assert.equal(grabLevel(new ProgressStore(memory()), 'van'), 1);
  // Item 067: the hall gives the start level at base, whatever she has reached; up to the knob above it.
  assert.equal(grabLevel(store, 'van'), 1);
  withDifficulty(2, () => assert.equal(grabLevel(store, 'van'), 2));
  withDifficulty(3, () => assert.equal(grabLevel(store, 'van'), 3));
});

test('clue: levels 1 and 2 the sounds, letters shown; 3 the sounds, blank; help the sound-out, letters shown; never a name (item 137)', () => {
  const ids = (l: 1 | 2 | 3, help = false) => clue('van', l, help).map((s) => s.id);
  const sounds = ['v', 'a', 'n'].map(letterSoundLine);
  for (const l of [1, 2, 3] as const) assert.deepEqual(ids(l), sounds);
  for (const l of [1, 2, 3] as const) assert.deepEqual(ids(l, true), sounds);
  // Which letters show on the board: everything but level 3's sounds.
  assert.deepEqual(clue('van', 1).map((s) => [s.index, s.span, s.show]), [[0, 1, true], [1, 1, true], [2, 1, true]]);
  assert.ok(clue('van', 2).every((s) => s.show));
  assert.ok(clue('van', 3).every((s) => !s.show));
  assert.ok(clue('van', 3, true).every((s) => s.show));
});

test('no letter names (item 137): no clue step at any level is a name or a bridge from one, and no such line is composed', () => {
  const lines = composeLines();
  for (const w of GRAB_WORDS) for (const l of [1, 2, 3] as const) for (const help of [false, true]) for (const s of clue(w, l, help)) assert.ok(s.id === '' || /^letter_.+_sound$/.test(s.id), `${w} level ${l}: ${s.id}`);
  assert.deepEqual(lines.filter((l) => /^letter_.+_(name|hides)$/.test(l.id)).map((l) => l.id), []);
  // THREE (Matt heard "TH, R's name is Ar... squeeze off the front, EE"): its three sounds, nothing else.
  assert.deepEqual(clue('three', 1).map((s) => s.id), ['th', 'r', 'long_e'].map(letterSoundLine));
  for (const l of lines) assert.ok(!/name is|squeeze off the front|keep just the start/i.test(`${l.text} ${l.say ?? ''}`), l.id);
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

test('clue: sounds by sound unit (SH of SHIP is one sound lighting two letters, never S, H: item 085)', () => {
  const ship = clue('ship', 1);
  assert.deepEqual(ship.map((s) => s.id), ['sh', 'i', 'p'].map(letterSoundLine));
  // KING is "kuh, ih, ng": never "n, g" before its NG.
  assert.deepEqual(clue('king', 1).map((s) => s.id), ['k', 'i', 'ng'].map(letterSoundLine));
  const sounds = ship;
  assert.deepEqual(sounds.map((s) => s.id), ['sh', 'i', 'p'].map(letterSoundLine));
  assert.deepEqual(sounds.map((s) => [s.index, s.span]), [[0, 2], [2, 1], [3, 1]]);
  // The help sounds it out by the same units, never blended.
  assert.deepEqual(clue('ship', 3, true).map((s) => s.id), ['sh', 'i', 'p'].map(letterSoundLine));
  // DUCK ends in CK; FROG's blend is two sounds, never one.
  assert.deepEqual(clue('duck', 3).map((s) => s.id), ['d', 'u', 'ck'].map(letterSoundLine));
  assert.deepEqual(clue('frog', 3).map((s) => s.id), ['f', 'r', 'o', 'g'].map(letterSoundLine));
});

test('voice: every clue line, and the warm-up narrator lines, exist', () => {
  const lines = composeLines();
  const byId = new Map(lines.map((l) => [l.id, l]));
  // A silent letter's step (KITE's E, item 056) has no line: it only lights.
  for (const w of GRAB_WORDS) for (const l of [1, 2, 3] as const) for (const s of [...clue(w, l), ...clue(w, l, true)]) assert.ok(s.id === '' || byId.has(s.id), s.id);
  assert.deepEqual(clue('kite', 3).map((s) => [s.index, s.id === '']), [[0, false], [1, false], [2, false], [3, true]]);
  assert.deepEqual(clue('kite', 1).filter((s) => s.index === 3).map((s) => s.id), ['']);
  for (const k of ['grab_ask', 'grab_wrong', 'grab_need', 'grab_door']) assert.ok(byId.has(narratorLine('dada_matt', k)), k);
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

test('grabSays (hunt 10, M57): the grab word says the bank words heard whole inside it as it plus a sound; KITE no KIT, CAT nothing more', () => {
  assert.deepEqual(grabSays('clock'), ['clock', 'lock']);
  assert.deepEqual(grabSays('block'), ['block', 'lock']);
  assert.ok(grabSays('brush').includes('rush'));
  assert.ok(grabSays('tent').includes('ten'));
  assert.ok(grabSays('belt').includes('bell'));
  assert.deepEqual(grabSays('kite'), ['kite']);
  assert.deepEqual(grabSays('cat'), ['cat']);
});

test('GRAB_WORDS (hunt 10, M45): no MOM or DAD, since the grab goes into her bag and is fired in battle', () => {
  for (const w of NO_BAG_COPY) assert.ok(!GRAB_WORDS.includes(w), w);
});

test('pickGrab (hunt 10, M57): never a word that says one it must avoid (no CLOCK when LOCK is on a pad)', () => {
  const store = new ProgressStore(memory());
  const avoid = [...GRAB_WORDS.filter((w) => w !== 'clock' && w !== 'dog'), 'lock'];
  for (let i = 0; i < 20; i++) assert.equal(pickGrab(store, avoid, seeded(spread(i + 1))), 'dog');
});

test('said early (hunt 10, M57): CLOCK in the hall keeps LOCK off the bridge and every room', () => {
  const bridge = MINIGAME_BY_ID['bridge']!;
  let crossed = 0;
  for (let seed = 1; seed <= 40; seed++) {
    for (const said of [['clock'], grabSays('clock')]) {
      const store = new ProgressStore(memory());
      store.refillBag(['lock', 'cat', 'pig', 'hen', 'cup', 'map', 'sun', 'bus']);
      const games = [bridge, MINIGAME_BY_ID['sentence:we_can_use_the']!, MINIGAME_BY_ID['sentence:scared_of_the']!] as EpisodeInput['games'];
      const input: EpisodeInput = { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', saidBefore: said, games };
      const words = episodePlans(store, input, seeded(spread(seed))).flatMap((p) => [p.key, ...p.fetches]);
      if (said.length > 1) assert.ok(!words.includes('lock'), `seed ${seed}: ${words.join(' ')}`);
      else if (words.includes('lock')) crossed++;
    }
  }
  assert.ok(crossed > 0, 'the test bites: with CLOCK alone kept out, LOCK is drawn');
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

test('hallObjects (hunt 11): no picture holds a word read later plus a sound (a miss on the CLOCK says CLOCK, then LOCK is read)', () => {
  const store = new ProgressStore(memory());
  const avoid = ['lock', 'ten', 'bell', 'egg', 'rush'];
  for (let seed = 1; seed <= 60; seed++) {
    const word = GRAB_WORDS[seed % GRAB_WORDS.length]!;
    if (grabSays(word).some((s) => avoid.includes(s))) continue;
    const objs = hallObjects(store, word, avoid, seeded(spread(seed)));
    for (const w of objs.filter((x) => x !== word)) assert.ok(!grabSays(w).some((s) => avoid.includes(s)), `${w} says one of ${avoid.join(' ')}`);
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

test("hallObjects (hunt 11): never the grab word plus a sound beside it (TENT by TEN, CLOCK by LOCK)", () => {
  const store = new ProgressStore(memory());
  for (const word of GRAB_WORDS) {
    // Five seeds a word (15 until item 153: the unit lane's longest sweep, and no seed past 5 ever failed).
    for (let seed = 1; seed <= 5; seed++) {
      const objs = hallObjects(store, word, [], seeded(spread(seed)));
      for (const w of objs.filter((x) => x !== word)) assert.ok(!grabSays(w).includes(word), `${w} holds ${word}`);
    }
  }
});
