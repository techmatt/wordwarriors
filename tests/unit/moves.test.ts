/**
 * The battle's move choices (item 018): the plan, the move bag, the counter
 * keeping clear of battle 1's pads, every move word pictured and voiced, and
 * the reformed villain's lines.
 * `npx tsx --test tests/unit/moves.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { ART_BY_ID } from '../../content/art/assets';
import { CHARACTER_BY_ID, MOVE_WORDS, ROSTER, abilityWords, personOf } from '../../content/battle/roster';
import { CVC_WORDS, SPECIAL_WORDS } from '../../content/phonics/words';
import { reformedLine, wordLine } from '../../content/voice/ids';
import { EPISODE_DEFAULTS } from '../../src/config';
import { CHOICES_PER_PART, battle1Words, planMoves, teamMoveWords, type MoveInput, type MovePlan } from '../../src/rules/moves';
import { episodePlans, type EpisodeInput } from '../../src/rules/sentences';
import { spellFor } from '../../src/rules/spell';
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

const HERO = EPISODE_DEFAULTS.hero;
const ALLY = EPISODE_DEFAULTS.ally ?? 'ellie';
const SPELL = spellFor(HERO, ALLY);
const INPUT: MoveInput = { hero: HERO, team: [HERO, ALLY], helper: ALLY, spell: SPELL };

const choices = (p: MovePlan) => [...p.part1, ...p.part2];

/** She picks every right word first time, as BattleScene records it. */
function playRight(store: ProgressStore, p: MovePlan): void {
  for (const c of choices(p)) {
    store.record('words', c.right, true, 0);
    store.takeFromBag(c.right, 'moves');
  }
}

test('roster: every move word is in MOVE_WORDS, and every good fighter answers to six or more', () => {
  const moves = new Set<string>(MOVE_WORDS);
  for (const c of ROSTER) {
    for (const f of [c.good, c.evil]) for (const ab of f.abilities) for (const w of abilityWords(ab)) assert.ok(moves.has(w), `${c.id}.${ab.id}: ${w}`);
    assert.ok(teamMoveWords([c.id]).size >= 6, `${c.id} answers to ${[...teamMoveWords([c.id]).keys()].join(', ')}`);
  }
  // Every word in the pool belongs to somebody's move.
  const used = new Set(ROSTER.flatMap((c) => c.good.abilities.flatMap(abilityWords)));
  for (const w of MOVE_WORDS) assert.ok(used.has(w), `${w} is nobody's move`);
});

test('every move word has a picture and a word line', () => {
  const lines = new Set(composeLines().map((l) => l.id));
  for (const w of MOVE_WORDS) {
    assert.ok(ART_BY_ID[`pic_${w}`], `pic_${w}`);
    assert.ok(lines.has(wordLine(w)), wordLine(w));
  }
});

test('every word the recap can show has a picture: key words, move words, counter words', () => {
  const words = [...CVC_WORDS, ...SPECIAL_WORDS].map((w) => w.word);
  for (const c of ROSTER) words.push(c.counter.word);
  for (const w of [...words, ...MOVE_WORDS]) assert.ok(ART_BY_ID[`pic_${w}`], `pic_${w}`);
});

test('planMoves: two choices a part, 2 or 3 different words each, the spell opens each part', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const p = planMoves(new ProgressStore(memory()), INPUT, seeded(seed));
    assert.equal(p.part1.length, CHOICES_PER_PART);
    assert.equal(p.part2.length, CHOICES_PER_PART);
    assert.equal(p.part1[0]!.right, SPELL);
    assert.equal(p.part2[0]!.right, SPELL);
    const own = teamMoveWords(INPUT.team);
    for (const c of choices(p)) {
      assert.ok(c.words.length === 2 || c.words.length === 3, c.words.join(','));
      assert.equal(new Set(c.words).size, c.words.length);
      assert.ok(c.words.includes(c.right));
      for (const w of c.words) assert.ok(own.has(w) || w === SPELL, `${w} is not her team's`);
      // The owner's move really answers to the word.
      const ab = CHARACTER_BY_ID[c.owner.from]!.good.abilities.find((a) => a.id === c.owner.ability)!;
      assert.ok(abilityWords(ab).includes(c.right), `${c.owner.from}.${ab.id} for ${c.right}`);
      assert.ok(INPUT.team.includes(c.owner.fighter));
    }
    const others = choices(p).filter((c) => c.right !== SPELL).map((c) => c.right);
    assert.equal(new Set(others).size, others.length, 'no right word twice but the spell');
  }
});

test('the move bag: the right words go round the whole pool before any comes back', () => {
  const store = new ProgressStore(memory());
  const pool = [...teamMoveWords(INPUT.team).keys()].filter((w) => w !== SPELL);
  const seen: string[] = [];
  const rand = seeded(7);
  // Each episode draws two non-spell right words.
  for (let ep = 0; ep < Math.floor(pool.length / 2); ep++) {
    const p = planMoves(store, INPUT, rand);
    seen.push(...choices(p).map((c) => c.right).filter((w) => w !== SPELL));
    playRight(store, p);
  }
  assert.equal(new Set(seen).size, seen.length, `a word came back early: ${seen.join(', ')}`);
});

test('the move bag: a word she missed comes round again sooner', () => {
  const store = new ProgressStore(memory());
  const p = planMoves(store, INPUT, seeded(3));
  const missed = p.part1[1]!.right;
  store.record('words', missed, false, 2);
  store.returnToBag(missed, 'moves');
  assert.ok(store.bag('moves').left.includes(missed));
});

test('variety: across episodes she meets many move words', () => {
  const store = new ProgressStore(memory());
  const met = new Set<string>();
  const rand = seeded(11);
  for (let ep = 0; ep < 6; ep++) {
    const p = planMoves(store, INPUT, rand);
    for (const c of choices(p)) for (const w of c.words) met.add(w);
    playRight(store, p);
  }
  assert.ok(met.size >= 11, `only ${[...met].join(', ')}`);
});

test("the counter word is never on battle 1's pads, and bag words that are move words can still be key words", () => {
  const counters = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) {
    const store = new ProgressStore(memory());
    const rand = seeded(seed);
    const p = planMoves(store, INPUT, rand);
    const pads = battle1Words(p);
    const input: EpisodeInput = { fill: { villain: EPISODE_DEFAULTS.villain, helper: ALLY, hero: HERO }, ally: ALLY, spell: SPELL, rooms: ['kitchen', 'garage'], counterRoom: 'attic', battle1Moves: pads };
    const key = episodePlans(store, input, rand)[2].key;
    assert.ok(!pads.includes(key), `seed ${seed}: ${key} is on battle 1's pads (${pads.join(', ')})`);
    counters.add(key);
  }
  assert.ok(counters.size >= 10, `only ${[...counters].join(', ')}`);
});

test('reformed: every character has two or more short lines, each voiced in its good voice', () => {
  const lines = new Map(composeLines().map((l) => [l.id, l]));
  const manifest = JSON.parse(readFileSync('public/voice-gen/manifest.json', 'utf8')) as { lines: { id: string }[] };
  const built = new Set(manifest.lines.map((l) => l.id));
  for (const c of ROSTER) {
    assert.ok(c.reformed.length >= 2, c.id);
    for (const r of c.reformed) {
      const id = reformedLine(c.id, r.key);
      const l = lines.get(id);
      assert.ok(l, id);
      // A dad's form speaks in the dad's own voice.
      assert.equal(l.speaker, personOf(c.id));
      assert.equal(l.group, `fighter_${c.id}_evil`, 'in the villain group, which the episode loads');
      assert.ok(built.has(id), `${id} is built`);
      assert.ok(r.text.split(/\s+/).length <= 10, `${id} is short`);
    }
  }
});
