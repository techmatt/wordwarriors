/**
 * Item 096: the Shape-Shifter's rules (src/rules/shifter.ts): its chains,
 * beats and options, its help ramp, its place in the pool and the house
 * plan; and a letter's sound as its hints give it (`soundLines`, never its name: item 137).
 */

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

import { BANK_BY_WORD } from '../../content/phonics/bank';
import { lookalikesOf } from '../../content/phonics/sentences';
import { CHARACTER_BY_ID } from '../../content/battle/roster';
import { letterSoundLine, narratorLine } from '../../content/voice/ids';
import { SHIFTER } from '../../src/config';
import { stepLevel } from '../../src/rules/difficulty';
import { MINIGAMES, MINIGAME_BY_ID, SHIFTER_GAME, drawGames } from '../../src/rules/minigames';
import { episodePlans } from '../../src/rules/rooms';
import { SHIFT_WORDS, chainsOf, changedAt, pictureSiblings, placesOf, wrongPictures, stonesFor, orderBreaks, planShifter, positionsOf, shifterLevel, shifterShown, shifterWords } from '../../src/rules/shifter';
import { soundLines } from '../../src/rules/soundOut';
import { ProgressStore } from '../../src/state/ProgressStore';
import { composeLines } from '../../tools/voice/compose';
import { withDifficulty } from './difficulty';
import { memory, seeded, spread } from './seeds';

/** Seed 1's chain since hunt 9's M39 (two places are as good as three: it keeps the vowel); item 157's words and its read it at the first letter moved it. */
const GOLDEN_SEED_1 = ['dot', 'cot', 'cat', 'hat', 'ham'];

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

test('planShifter: one letter a link, first letter first, back in order once at most; both beats; read-it pictures a sibling at least (item 157: at the first letter too); fix-it stones of different sounds', () => {
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
        // One sibling at least (M29 at the vowel or the last letter; item 157 at the first letter too).
        const sibs = l.options.filter((o) => o !== l.to && changedAt(l.to, o) === l.pos);
        assert.ok(sibs.length >= 1, `${l.to}: ${l.options}`);
        assert.equal(new Set(l.options).size, SHIFTER.options, `${l.to}: ${l.options}`);
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

test('planShifter (hunt 6, M29; hunt 9, M39): seeded draws change two places at least, the vowel in many, and read it at the last letter, never all fix it', () => {
  let lastRead = 0;
  let vowel = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const p = planShifter(new ProgressStore(memory()), { avoid: [], taken: [] }, seeded(spread(seed)))!;
    const chain = [p.start, ...shifterWords(p)];
    assert.ok(placesOf(chain) >= 2, `seed ${seed}: ${chain.join(' ')}`);
    if (positionsOf(chain).includes(1)) vowel++;
    assert.ok(p.links.some((l) => l.beat === 'read'), `seed ${seed}: all fix it`);
    lastRead += p.links.filter((l) => l.beat === 'read' && l.pos === 2).length;
  }
  // Before M29 no read-it link could change the last letter (no word had two pictured siblings there).
  assert.ok(lastRead >= 5, `${lastRead} read-it links at the last letter in 40 draws`);
  // M39 (Matt's pick b): all three places is a lean (THREE_PLACES_WEIGHT), no longer a rule: 11 of 40 here
  // from a fresh store, about half of `npm run variety`'s visits; before M29, 45 of 300 changed the vowel.
  assert.ok(vowel >= 9, `${vowel} of 40 chains change the vowel`);
  // Golden: seed 1's chain (rewrite it when the draw changes on purpose).
  const p = planShifter(new ProgressStore(memory()), { avoid: [], taken: [] }, seeded(spread(1)))!;
  assert.deepEqual([p.start, ...shifterWords(p)], GOLDEN_SEED_1);
});

test('wrongPictures (M29; item 157): one sibling and another picture, its first letter first, at any letter; siblings alone where there are two', () => {
  // BIG at the last letter: one pictured sibling, BIB (BIN is stored, item 127), and another picture with its first letter (BED, live again in item 153).
  assert.deepEqual(wrongPictures('big', 2, 'bug', SHIFT_WORDS).sort(), ['bed', 'bib']);
  const like = wrongPictures('cap', 2, 'cat', ['can', 'cup', 'dog', 'cat']);
  assert.deepEqual(like, ['can', 'cup'], 'the sibling, then a picture with its first letter before one without');
  // Item 157: POT at the first letter has one pictured sibling beside COT (DOT); the other picture shares its first letter.
  const pot = wrongPictures('pot', 0, 'cot', SHIFT_WORDS);
  assert.equal(pot[0], 'dot');
  assert.equal(pot[1]![0], 'p', `${pot}`);
  for (const w of SHIFT_WORDS) {
    const ws = wrongPictures(w, 0, '', SHIFT_WORDS);
    if (ws.filter((o) => changedAt(w, o) === 0).length >= 2) assert.ok(ws.every((o) => changedAt(w, o) === 0), `two siblings, siblings only: ${w} beside ${ws}`);
  }
});

// The 200 seeded draws against look-alikes and "starts as a": tests/unit/shifterDraws.test.ts (item 105: its own file, so it runs beside these).

test('every chain the bank can draw (hunt 6, about 2000): pictured words, one letter a link, no look-alike link, three stones of different sounds never the old letter, read-it pictures never look-alikes', () => {
  const chains = chainsOf(SHIFTER.links);
  assert.ok(chains.length > 500, `${chains.length}`);
  for (const w of SHIFT_WORDS) assert.ok(existsSync(`public/art/pic_${w}.png`), w);
  const rand = seeded(7);
  for (const c of chains) {
    for (let i = 1; i < c.length; i++) {
      const [from, to] = [c[i - 1]!, c[i]!];
      const pos = changedAt(from, to);
      assert.ok(pos !== null && !lookalikesOf(from).includes(to), `${c.join(' ')}: ${from} to ${to}`);
      const stones = stonesFor(to[pos]!, from[pos]!, SHIFTER.options, rand);
      assert.equal(new Set(stones).size, SHIFTER.options, `${c.join(' ')}: ${stones.join('')}`);
      assert.ok(stones.includes(to[pos]!) && !stones.includes(from[pos]!), `${c.join(' ')}: ${stones.join('')}`);
      for (const o of pictureSiblings(to, pos, from, SHIFT_WORDS)) assert.ok(!lookalikesOf(to).includes(o) && o !== from, `${to}: ${o}`);
    }
  }
});

test('planShifter: keeps clear of what it is told; a shorter chain where it must; none when not even SHIFTER.minLinks fit', () => {
  const avoid = SHIFT_WORDS.filter((w) => w.endsWith('at') || w.endsWith('an'));
  const p = planShifter(new ProgressStore(memory()), { avoid, taken: ['bug'] }, seeded(3))!;
  for (const w of shifterShown(p)) assert.ok(!avoid.includes(w) && w !== 'bug', w);
  // Only PAN PEN TEN left: two links at most (PAN, PEN, TEN), no chain of four.
  const only = new Set(['pan', 'pen', 'ten']);
  const short = planShifter(new ProgressStore(memory()), { avoid: SHIFT_WORDS.filter((w) => !only.has(w)), taken: [] }, seeded(5))!;
  assert.equal(short.links.length, 2);
  assert.equal(planShifter(new ProgressStore(memory()), { avoid: SHIFT_WORDS.filter((w) => w !== 'ten' && w !== 'pen'), taken: [] }, seeded(5)), null);
});

test('help ramp: level 1 at base whatever she has done; recorded steps up unaided, down with help', () => {
  const store = new ProgressStore(memory());
  store.setShifterLevel('bat', 3);
  assert.equal(shifterLevel(store, 'bat'), 1);
  withDifficulty(3, () => assert.equal(shifterLevel(store, 'bat'), 3));
  withDifficulty(2, () => assert.equal(shifterLevel(store, 'bat'), 2));
  assert.equal(stepLevel(1, true), 2);
  assert.equal(stepLevel(2, false), 1);
});

test('the pool: the Shape-Shifter is a fetch room, never the counter', () => {
  assert.equal(MINIGAME_BY_ID.shifter, SHIFTER_GAME);
  assert.deepEqual(SHIFTER_GAME.slots, ['fetch']);
  assert.equal(SHIFTER_GAME.scene, 'ShifterRoom');
  const rand = seeded(17);
  for (let i = 0; i < 200; i++) assert.notEqual(drawGames(new ProgressStore(memory()), rand)[2].id, 'shifter');
});

test('episodePlans with the Shape-Shifter: its words are the fetches, its last the key; no other room reads one or shows one as its key', () => {
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
});

test('a letter is its sound alone, never its name (item 137 retired item 096: no bridge from the name); every line exists', () => {
  const ids = new Set(composeLines().map((l) => l.id));
  for (const l of 'bcdfghjklmnprstvwxyzaeiou') assert.deepEqual(soundLines(l), [letterSoundLine(l)], l);
  assert.deepEqual(soundLines('sh'), [letterSoundLine('sh')]);
  // A silent letter says nothing.
  assert.deepEqual(soundLines(''), []);
  // The room's own lines, for every narrator voice.
  for (const k of ['shifter_intro', 'shifter_starts', 'shifter_read', 'shifter_fix', 'shifter_hint', 'shifter_stone', 'shifter_picked', 'shifter_says', 'shifter_nope', 'shifter_again', 'shifter_cue_read', 'shifter_cue_fix', 'shifter_fixed', 'shifter_done']) assert.ok(ids.has(narratorLine('dada_matt', k)), k);
});
