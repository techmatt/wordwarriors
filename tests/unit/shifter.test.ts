/**
 * Item 096: the Shape-Shifter's rules (src/rules/shifter.ts): its chains,
 * beats and options, its help ramp, its place in the pool and the house
 * plan; and the sound hidden in a letter's name (`nameToSound`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BANK_BY_WORD } from '../../content/phonics/bank';
import { NAME_HIDES } from '../../content/phonics/letters';
import { CHARACTER_BY_ID } from '../../content/battle/roster';
import { letterSoundLine, nameHidesLine, narratorLine } from '../../content/voice/ids';
import { SHIFTER } from '../../src/config';
import { MINIGAMES, MINIGAME_BY_ID, SHIFTER_GAME, drawGames } from '../../src/rules/minigames';
import { episodePlans } from '../../src/rules/sentences';
import { SHIFT_WORDS, changedAt, nextShifterLevel, orderBreaks, planShifter, positionsOf, shifterLevel, shifterShown, shifterWords } from '../../src/rules/shifter';
import { nameToSound } from '../../src/rules/soundOut';
import { ProgressStore } from '../../src/state/ProgressStore';
import { composeLines } from '../../tools/voice/compose';
import { withDifficulty } from './difficulty';
import { memory, seeded, spread } from './seeds';

const sameSound = (a: string, b: string) => a === b || [a, b].sort().join('') === 'ck';

test('chain words: familiar pictured CVC words, one letter a sound', () => {
  assert.ok(SHIFT_WORDS.length >= 30, `${SHIFT_WORDS.length}`);
  for (const w of SHIFT_WORDS) {
    const b = BANK_BY_WORD[w]!;
    assert.equal(b.level, 1, w);
    assert.ok(!b.odd && b.role !== 'action', w);
    assert.deepEqual(b.units, [...w], w);
  }
});

test('planShifter: one letter a link, first letter first, back in order once at most; both beats; read-it pictures differ only there; fix-it stones of different sounds', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const p = planShifter(new ProgressStore(memory()), { avoid: [], taken: [] }, seeded(spread(seed)))!;
    const chain = [p.start, ...shifterWords(p)];
    assert.equal(p.links.length, SHIFTER.links, `seed ${seed}`);
    assert.equal(new Set(chain).size, chain.length, `seed ${seed}: a word twice`);
    for (const w of chain) assert.ok(SHIFT_WORDS.includes(w), w);
    const pos = positionsOf(chain);
    assert.equal(pos[0], 0, `seed ${seed}: ${chain}`);
    assert.ok(orderBreaks(pos) <= 1, `seed ${seed}: ${chain} ${pos}`);
    assert.ok(p.links.some((l) => l.beat === 'read') && p.links.some((l) => l.beat === 'fix'), `seed ${seed}: one beat only`);
    for (const l of p.links) {
      assert.equal(changedAt(l.from, l.to), l.pos);
      assert.equal(l.options.length, SHIFTER.options);
      if (l.beat === 'read') {
        assert.ok(l.options.includes(l.to) && !l.options.includes(l.from), `${l.to}: ${l.options}`);
        for (const o of l.options) if (o !== l.to) assert.equal(changedAt(l.to, o), l.pos, `${l.to} beside ${o}`);
      } else {
        const right = l.to[l.pos]!;
        assert.ok(l.options.includes(right) && !l.options.includes(l.from[l.pos]!), `${l.to}: ${l.options}`);
        const vowel = (c: string) => 'aeiou'.includes(c);
        for (const o of l.options) assert.equal(vowel(o), vowel(right), `${l.to}: ${o}`);
        for (const a of l.options) for (const b of l.options) if (a !== b) assert.ok(!sameSound(a, b), `${a} ${b}`);
      }
    }
  }
});

test('planShifter: keeps clear of what it is told; a shorter chain where it must; none when not even SHIFTER.minLinks fit', () => {
  const avoid = SHIFT_WORDS.filter((w) => w.endsWith('at') || w.endsWith('an'));
  const p = planShifter(new ProgressStore(memory()), { avoid, taken: ['bug'] }, seeded(3))!;
  for (const w of shifterShown(p)) assert.ok(!avoid.includes(w) && w !== 'bug', w);
  // Only HEN PEN TEN left: two links at most (HEN, PEN, TEN), no chain of four.
  const only = new Set(['hen', 'pen', 'ten']);
  const short = planShifter(new ProgressStore(memory()), { avoid: SHIFT_WORDS.filter((w) => !only.has(w)), taken: [] }, seeded(5))!;
  assert.equal(short.links.length, 2);
  assert.equal(planShifter(new ProgressStore(memory()), { avoid: SHIFT_WORDS.filter((w) => w !== 'hen' && w !== 'pen'), taken: [] }, seeded(5)), null);
});

test('help ramp: level 1 at base whatever she has done; recorded steps up unaided, down with help', () => {
  const store = new ProgressStore(memory());
  store.setShifterLevel('bat', 3);
  assert.equal(shifterLevel(store, 'bat'), 1);
  withDifficulty(3, () => assert.equal(shifterLevel(store, 'bat'), 3));
  withDifficulty(2, () => assert.equal(shifterLevel(store, 'bat'), 2));
  assert.equal(nextShifterLevel(1, true), 2);
  assert.equal(nextShifterLevel(2, false), 1);
});

test('the pool: the Shape-Shifter is a fetch room, never the counter', () => {
  assert.equal(MINIGAME_BY_ID.shifter, SHIFTER_GAME);
  assert.deepEqual(SHIFTER_GAME.slots, ['fetch']);
  assert.equal(SHIFTER_GAME.scene, 'ShifterRoom');
  const rand = seeded(17);
  for (let i = 0; i < 200; i++) assert.notEqual(drawGames(new ProgressStore(memory()), rand)[2].id, 'shifter');
});

test('episodePlans with the Shape-Shifter: its words are the fetches, its last the key; no other room reads one or shows one as its key', () => {
  const sentence = MINIGAMES.find((g) => g.frame && g.slots.includes('fetch'))!;
  const counter = MINIGAMES.find((g) => g.frame && g.slots.includes('counter'))!;
  for (let seed = 1; seed <= 20; seed++) {
    const plans = episodePlans(
      new ProgressStore(memory()),
      { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', games: [MINIGAME_BY_ID.bridge!, SHIFTER_GAME, counter] },
      seeded(spread(seed)),
    );
    const s = plans[1];
    assert.equal(s.kind, 'shifter');
    if (s.kind !== 'shifter') return;
    const words = shifterWords(s.shifter);
    assert.deepEqual(s.fetches, words);
    assert.equal(s.key, words.at(-1));
    const shown = shifterShown(s.shifter);
    const named = CHARACTER_BY_ID.tiamat!.counter.word;
    assert.ok(!shown.includes(named), `seed ${seed}: ${named} in the chain`);
    for (const p of [plans[0], plans[2]]) {
      for (const w of p.fetches) assert.ok(!shown.includes(w), `seed ${seed}: ${p.slot} reads ${w}, shown in the shifter room`);
    }
  }
  void sentence;
});

test('the sound hidden in the name (ride-along): the bridge before the sound for B D F J K L M N P R S T V Z only; every line exists', () => {
  const ids = new Set(composeLines().map((l) => l.id));
  for (const l of 'bdfjklmnprstvz') {
    assert.deepEqual(nameToSound(l), [nameHidesLine(l), letterSoundLine(l)], l);
    assert.ok(NAME_HIDES[l] && ids.has(nameHidesLine(l)), l);
  }
  for (const l of 'cghwyxaeiou') assert.deepEqual(nameToSound(l), [letterSoundLine(l)], l);
  // A letter not saying its own sound (CAT's C) is plain; so is a digraph.
  assert.deepEqual(nameToSound('c', 'k'), [letterSoundLine('k')]);
  assert.deepEqual(nameToSound('sh'), [letterSoundLine('sh')]);
  // The room's own lines, for every narrator voice.
  for (const k of ['shifter_intro', 'shifter_starts', 'shifter_read', 'shifter_fix', 'shifter_hint', 'shifter_stone', 'shifter_picked', 'shifter_says', 'shifter_nope', 'shifter_again', 'shifter_next', 'shifter_done']) assert.ok(ids.has(narratorLine('dada_matt', k)), k);
});
