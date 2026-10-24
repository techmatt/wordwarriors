/**
 * Item 139: the rhyme room's rules (src/rules/rhyme.ts): its families, its
 * rounds' shown words and wrong pictures, its help ramp, its place in the pool
 * and the house plan, and its lines.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ACTIONS, BANK_BY_WORD, THINGS } from '../../content/phonics/bank';
import { lookalikesOf } from '../../content/phonics/sentences';
import { CHARACTER_BY_ID } from '../../content/battle/roster';
import { narratorLine } from '../../content/voice/ids';
import { RHYME } from '../../src/config';
import { MINIGAMES, MINIGAME_BY_ID, RHYME_GAME, drawGames } from '../../src/rules/minigames';
import { LAST_RHYMES, RHYME_FAMILIES, RHYME_WORDS, firstSound, nearRhyme, planRhyme, rhymeLevel, rhymeShown, rhymeSays, rhymeWords, rhymes, shownFor, wrongPictures } from '../../src/rules/rhyme';
import { episodePlans } from '../../src/rules/rooms';
import { ProgressStore } from '../../src/state/ProgressStore';
import { composeLines } from '../../tools/voice/compose';
import { withDifficulty } from './difficulty';
import { memory, seeded, spread } from './seeds';

const things = new Set(THINGS.map((w) => w.word));
const actions = new Set(ACTIONS.map((w) => w.word));

test('families: three words or more of one rime, a thing to print at least, one-letter onsets, three sound units', () => {
  // The bank at item 139: -AT -AN -OCK -ING with things only, the rest with an action word shown.
  for (const r of ['at', 'an', 'ock', 'ing', 'ug', 'un']) assert.ok(RHYME_FAMILIES.some((f) => f.rime === r), r);
  assert.ok(RHYME_FAMILIES.length >= 6, `${RHYME_FAMILIES.length}`);
  for (const f of RHYME_FAMILIES) {
    assert.ok(f.things.length >= 1 && f.things.length + f.actions.length >= 3, f.rime);
    for (const w of [...f.things, ...f.actions]) {
      const b = BANK_BY_WORD[w]!;
      assert.equal(b.rime, f.rime, w);
      assert.equal(b.onset.length, 1, w);
      assert.equal(b.units.length, 3, w);
      assert.ok(!b.odd && !b.stored, w);
    }
    for (const w of f.things) assert.ok(things.has(w), w);
    for (const w of f.actions) assert.ok(actions.has(w) && !things.has(w), w);
  }
  for (const w of RHYME_WORDS) assert.ok(things.has(w), w);
});

test('wrong pictures: things, one sharing the first sound, one the vowel and not the first sound, neither rhyming nor a look-alike', () => {
  for (const w of RHYME_WORDS) {
    const pair = wrongPictures(w, [], seeded(3));
    assert.ok(pair, w);
    const [a, b] = pair;
    for (const p of pair) {
      assert.ok(things.has(p), `${w}: ${p}`);
      assert.ok(!rhymes(p, w), `${w}: ${p} rhymes`);
      assert.ok(!lookalikesOf(w).includes(p), `${w}: ${p} a look-alike`);
      assert.notEqual(p, w);
    }
    assert.equal(firstSound(a), firstSound(w), `${w}: ${a}`);
    assert.equal(BANK_BY_WORD[b]!.vowel, BANK_BY_WORD[w]!.vowel, `${w}: ${b}`);
    assert.notEqual(firstSound(b), firstSound(w), `${w}: ${b}`);
  }
});

test('shown words: two of its family, things first, never the printed word', () => {
  for (const f of RHYME_FAMILIES) {
    for (const w of f.things) {
      const s = shownFor(w, []);
      if (!s) continue;
      for (const x of s) assert.ok(rhymes(x, w) && x !== w, `${w}: ${x}`);
      const thingsLeft = f.things.filter((t) => t !== w).length;
      assert.equal(s.filter((x) => things.has(x)).length, Math.min(2, thingsLeft), `${w}: ${s}`);
    }
  }
});

test('planRhyme: three rounds, each a different family; no word or picture twice; the printed word among the pictures', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const p = planRhyme(new ProgressStore(memory()), { avoid: [], taken: [] }, seeded(spread(seed)))!;
    assert.equal(p.rounds.length, RHYME.rounds, `seed ${seed}`);
    assert.equal(new Set(p.rounds.map((r) => r.rime)).size, p.rounds.length, `seed ${seed}`);
    const all = p.rounds.flatMap((r) => [...r.shown, ...r.options]);
    assert.equal(new Set(all).size, all.length, `seed ${seed}: ${all}`);
    for (const r of p.rounds) {
      assert.equal(r.options.length, 3);
      assert.ok(r.options.includes(r.word));
      for (const o of r.options) assert.ok(things.has(o), `${o}: an action word is never a picture she picks`);
      for (const s of r.shown) assert.ok(rhymes(s, r.word), `${s} ${r.word}`);
      assert.equal(r.options.filter((o) => rhymes(o, r.word)).length, 1, `seed ${seed}: ${r.options}`);
      // Hunt 11: no wrong picture nearly rhymes (VAN... HAM, SUN... THUMB) or looks like a card (DAD by MAN).
      for (const o of r.options.filter((x) => x !== r.word)) {
        assert.ok(!nearRhyme(o, r.word), `seed ${seed}: ${o} nearly rhymes with ${r.word}`);
        for (const s of r.shown) assert.ok(!lookalikesOf(s).includes(o), `seed ${seed}: ${o} looks like the ${s} card`);
      }
    }
    // Plain CVC words before digraph-ended ones.
    const levels = p.rounds.map((r) => BANK_BY_WORD[r.word]!.level);
    assert.deepEqual(levels, [...levels].sort(), `seed ${seed}`);
  }
});

test('planRhyme: keeps clear of what it is told; fewer rounds where it must; none when not even RHYME.minRounds fit', () => {
  const avoid = ['cat', 'hat', 'van', 'pan', 'sun', 'bug'];
  const p = planRhyme(new ProgressStore(memory()), { avoid, taken: ['rock'] }, seeded(5))!;
  for (const w of [...rhymeShown(p), ...rhymeWords(p)]) assert.ok(![...avoid, 'rock'].includes(w), w);
  // Every family's things but one family's taken: one round fits, under minRounds.
  const keep = RHYME_FAMILIES[0]!;
  const allBut = RHYME_FAMILIES.filter((f) => f !== keep).flatMap((f) => f.things);
  assert.equal(planRhyme(new ProgressStore(memory()), { avoid: allBut, taken: [] }, seeded(1)), null);
});

test('help ramp: level 1 at base whatever she has done; above it her recorded level', () => {
  const store = new ProgressStore(memory());
  store.setRhymeLevel('cat', 3);
  assert.equal(rhymeLevel(store, 'cat'), 1);
  withDifficulty(3, () => assert.equal(rhymeLevel(store, 'cat'), 3));
  withDifficulty(2, () => assert.equal(rhymeLevel(store, 'cat'), 2));
});

test('the pool: the rhyme room is a fetch room, never the counter', () => {
  assert.equal(MINIGAME_BY_ID.rhyme, RHYME_GAME);
  assert.deepEqual(RHYME_GAME.slots, ['fetch']);
  assert.equal(RHYME_GAME.scene, 'RhymeRoom');
  const rand = seeded(17);
  let drawn = 0;
  for (let i = 0; i < 200; i++) {
    const g = drawGames(new ProgressStore(memory()), rand);
    assert.notEqual(g[2].id, 'rhyme');
    if (g.some((x) => x.id === 'rhyme')) drawn++;
  }
  assert.ok(drawn > 0);
});

test('episodePlans with the rhyme room: its words are the fetches, its last the key; no other room reads a word it shows or says', () => {
  const counter = MINIGAMES.find((g) => g.frame && g.slots.includes('counter'))!;
  for (let seed = 1; seed <= 20; seed++) {
    const plans = episodePlans(
      new ProgressStore(memory()),
      { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', moveWords: ['jump', 'splash', 'chomp', 'spin'], games: [MINIGAME_BY_ID.bridge!, RHYME_GAME, counter] },
      seeded(spread(seed)),
    );
    const r = plans[1];
    assert.equal(r.kind, 'rhyme');
    if (r.kind !== 'rhyme') return;
    const words = rhymeWords(r.rhyme);
    assert.deepEqual(r.fetches, words);
    assert.equal(r.key, words.at(-1));
    const shown = new Set([...rhymeShown(r.rhyme), ...rhymeSays(r.rhyme)]);
    assert.ok(!shown.has(CHARACTER_BY_ID.tiamat!.counter.word), `seed ${seed}`);
    for (const w of ['zap']) assert.ok(!shown.has(w), `seed ${seed}: the gift ${w}`);
    for (const p of [plans[0], plans[2]]) for (const w of p.fetches) assert.ok(!shown.has(w), `seed ${seed}: ${p.slot} reads ${w}, shown in the rhyme room`);
  }
});

test('every rhyme line exists, for every narrator voice', () => {
  const ids = new Set(composeLines().map((l) => l.id));
  for (const k of ['rhyme_read', 'rhyme_cue', 'rhyme_which', 'rhyme_which_2', 'rhyme_listen', 'rhyme_done', 'rhyme_done_2']) assert.ok(ids.has(narratorLine('dada_matt', k)), k);
});

test('planRhyme (hunt 11): a visit keeps clear of the last visit\'s families (LAST_RHYMES) while others fit', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const store = new ProgressStore(memory());
    const first = planRhyme(store, { avoid: [], taken: [] }, seeded(spread(seed)))!;
    store.remember(LAST_RHYMES, first.rounds.map((r) => r.rime).join(' '), 1);
    const next = planRhyme(store, { avoid: [], taken: [] }, seeded(spread(seed + 100)))!;
    const was = new Set(first.rounds.map((r) => r.rime));
    assert.deepEqual(next.rounds.filter((r) => was.has(r.rime)).map((r) => r.rime), [], `seed ${seed}`);
  }
});

test('nearRhyme (hunt 11): by sound, not spelling', () => {
  assert.ok(nearRhyme('box', 'sock'), 'BOX and SOCK');
  assert.ok(nearRhyme('ham', 'van'), 'HAM and VAN');
  assert.ok(!nearRhyme('cup', 'bug'), 'CUP and BUG');
  assert.ok(!nearRhyme('map', 'cat'), 'MAP and CAT');
});
