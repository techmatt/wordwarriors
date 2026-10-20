/**
 * The battle's move choices (items 018, 037): the gift word, the plan, the
 * move bag, who fires each word, the counter keeping clear of battle 1's
 * pads, every move word pictured and voiced, and the reformed villain's lines.
 * `npx tsx --test tests/unit/moves.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { ART_BY_ID } from '../../content/art/assets';
import { CHARACTER_BY_ID, MOVE_WORDS, ROSTER, abilityWords, personOf } from '../../content/battle/roster';
import { CASTERS, HUB_SCENES, storyTexts } from '../../content/house/scenes';
import { ACTIONS, BANK_BY_WORD } from '../../content/phonics/bank';
import { CVC_WORDS, SPECIAL_WORDS } from '../../content/phonics/words';
import { reformedLine, wordLine } from '../../content/voice/ids';
import { EPISODE_DEFAULTS } from '../../src/config';
import { CHOICES_PER_PART, battle1Words, drawGift, effectId, planMoves, teamMoveWords, type MoveInput, type MovePlan } from '../../src/rules/moves';
import { episodePlans, type EpisodeInput } from '../../src/rules/sentences';
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
/** A gift word that is one of Ellie's (her Giant Bubbles), and one that is nobody's on the team. */
const STYLED = 'big';
const PLAIN = 'jump';
const input = (spell: string): MoveInput => ({ hero: HERO, team: [HERO, ALLY], helper: ALLY, spell });

const choices = (p: MovePlan) => [...p.part1, ...p.part2];

/** She picks every right word first time, as BattleScene records it. */
function playRight(store: ProgressStore, p: MovePlan): void {
  for (const c of choices(p)) {
    store.record('words', c.right, true, 0);
    store.takeFromBag(c.right, 'moves');
    for (const w of c.words) if (w !== c.right) store.takeFromBag(w, 'pads');
  }
}

test('MOVE_WORDS are the bank\'s action words; roster move words are bank action words or flavour (POW, ICE)', () => {
  assert.deepEqual([...MOVE_WORDS].sort(), ACTIONS.map((w) => w.word).sort());
  const moves = new Set<string>(MOVE_WORDS);
  for (const c of ROSTER) {
    for (const f of [c.good, c.evil]) for (const ab of f.abilities) for (const w of abilityWords(ab)) assert.ok(moves.has(w) || ['pow', 'ice'].includes(w), `${c.id}.${ab.id}: ${w}`);
  }
  assert.ok(teamMoveWords([ALLY]).has(STYLED) && !teamMoveWords([HERO, ALLY]).has(PLAIN), 'the test words still mean what they say');
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

test('planMoves: two choices a part, 2 or 3 different bank action words each, the gift word opens each part', () => {
  for (const spell of [STYLED, PLAIN]) {
    for (let seed = 1; seed <= 40; seed++) {
      const p = planMoves(new ProgressStore(memory()), input(spell), seeded(seed));
      assert.equal(p.part1.length, CHOICES_PER_PART);
      assert.equal(p.part2.length, CHOICES_PER_PART);
      assert.equal(p.part1[0]!.right, spell);
      assert.equal(p.part2[0]!.right, spell);
      for (const c of choices(p)) {
        assert.ok(c.words.length === 2 || c.words.length === 3, c.words.join(','));
        assert.equal(new Set(c.words).size, c.words.length);
        assert.ok(c.words.includes(c.right));
        for (const w of c.words) assert.ok(MOVE_WORDS.includes(w), `${w} is not a bank action word`);
      }
      const others = choices(p).filter((c) => c.right !== spell).map((c) => c.right);
      assert.equal(new Set(others).size, others.length, 'no right word twice but the gift word');
    }
  }
});

test('owners: a teammate whose move answers to the word fires it styled; any other word is word magic', () => {
  const team = teamMoveWords([HERO, ALLY]);
  for (const spell of [STYLED, PLAIN]) {
    for (let seed = 1; seed <= 40; seed++) {
      const p = planMoves(new ProgressStore(memory()), input(spell), seeded(seed));
      for (const c of choices(p)) {
        const o = c.owner;
        if (c.right === spell && spell === STYLED) {
          // The gift word Ellie has: her hero fires Ellie's move for it.
          assert.deepEqual([o.fighter, o.from], [HERO, ALLY]);
        } else if (c.right === spell || !team.has(c.right)) {
          assert.equal(o.from, null, `${c.right} is word magic`);
          assert.equal(o.fighter, HERO);
          assert.equal(o.ability, effectId(c.right));
          continue;
        } else assert.ok([HERO, ALLY].includes(o.fighter) && o.from === o.fighter, `${c.right}: a teammate's own move`);
        const ab = CHARACTER_BY_ID[o.from!]!.good.abilities.find((a) => a.id === o.ability)!;
        assert.ok(abilityWords(ab).includes(c.right), `${o.from}.${ab.id} for ${c.right}`);
      }
    }
  }
});

test('planMoves: no pad shows a word the episode has said before the battle', () => {
  const avoid = ['zap', 'hop', 'pop', 'run', 'hug', 'dig'];
  for (let seed = 1; seed <= 40; seed++) {
    const p = planMoves(new ProgressStore(memory()), { ...input(PLAIN), avoid }, seeded(seed));
    for (const c of choices(p)) for (const w of c.words) assert.ok(!avoid.includes(w), `seed ${seed}: ${w}`);
  }
});

test('drawGift: a bank action word, never one to avoid, leaning to the helper\'s own words, without spending the bag', () => {
  const store = new ProgressStore(memory());
  const rand = seeded(5);
  const avoid = ['big', 'zap'];
  const ellie = new Set(teamMoveWords([ALLY]).keys());
  const counts = new Map<string, number>();
  const before = store.bag('moves');
  for (let i = 0; i < 2000; i++) {
    const w = drawGift(store, { helper: ALLY, avoid }, rand);
    assert.ok(MOVE_WORDS.includes(w) && !avoid.includes(w), w);
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  assert.deepEqual(store.bag('moves'), before, 'drawing the gift spends nothing');
  const open = [...counts.keys()];
  assert.ok(open.length >= 10, `only ${open.join(', ')}`);
  // Per word, Ellie's words come up about twice as often as the rest.
  const mean = (ws: string[]) => ws.reduce((n, w) => n + counts.get(w)!, 0) / Math.max(1, ws.length);
  const hers = open.filter((w) => ellie.has(w));
  const rest = open.filter((w) => !ellie.has(w));
  assert.ok(hers.length && mean(hers) > 1.4 * mean(rest), `hers ${mean(hers)} vs ${mean(rest)}`);
});

test('the move bag: the right words go round before any comes back', () => {
  const store = new ProgressStore(memory());
  const seen: string[] = [];
  const rand = seeded(7);
  // Each episode draws two right words besides the gift; ten episodes stay well inside one round.
  for (let ep = 0; ep < 10; ep++) {
    const p = planMoves(store, input(PLAIN), rand);
    seen.push(...choices(p).map((c) => c.right).filter((w) => w !== PLAIN));
    playRight(store, p);
  }
  assert.equal(new Set(seen).size, seen.length, `a word came back early: ${seen.join(', ')}`);
});

test("drawGift (item 038): a caster's gift sounds like a spell; nobody else calls theirs a spell", () => {
  const share = (helper: string) => {
    let spelly = 0;
    const rand = seeded(11);
    for (let i = 0; i < 100; i++) if (BANK_BY_WORD[drawGift(new ProgressStore(memory()), { helper }, rand)]!.spell) spelly++;
    return spelly / 100;
  };
  for (const c of CASTERS) assert.ok(share(c) >= 0.75, `${c}: ${share(c)} of gifts sound like a spell`);
  assert.ok(share('anna') < 0.4, `a non-caster's gift is any action word: ${share('anna')}`);
  for (const [helper, scenes] of Object.entries(HUB_SCENES)) {
    if (CASTERS.has(helper)) continue;
    for (const s of scenes) for (const t of storyTexts(s)) assert.ok(!/spell/i.test(t), `${helper} calls the gift a spell: ${t}`);
  }
  for (const id of ['mud', 'nap']) assert.ok(!BANK_BY_WORD[id]!.spell, id);
});

test('the pad bag (item 038): back-to-back episodes rarely share a wrong pad', () => {
  let shared = 0;
  let pairs = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const store = new ProgressStore(memory());
    const rand = seeded(seed);
    let last = new Set<string>();
    for (let ep = 0; ep < 6; ep++) {
      // A new gift each episode, as drawGift gives: a gift she has firmed up wants
      // a pad sharing its first sound or rime, and one word has only a few.
      const p = planMoves(store, input(['jump', 'spin', 'swim', 'flip', 'stomp', 'slam'][ep]!), rand);
      const wrong = new Set(choices(p).flatMap((c) => c.words.filter((w) => w !== c.right)));
      if (ep > 0) {
        pairs++;
        if ([...wrong].some((w) => last.has(w))) shared++;
      }
      last = wrong;
      playRight(store, p);
    }
  }
  // Measured: without spending the pad bag 58 of these 100 pairs shared one; with it, 15.
  assert.ok(shared / pairs < 0.25, `${shared} of ${pairs} back-to-back episodes shared a wrong pad`);
});

test('the move bag: a word she missed comes round again sooner', () => {
  const store = new ProgressStore(memory());
  const p = planMoves(store, input(PLAIN), seeded(3));
  const missed = p.part1[1]!.right;
  store.record('words', missed, false, 2);
  store.returnToBag(missed, 'moves');
  assert.ok(store.bag('moves').left.includes(missed));
});

test('the move bag: action words new to the game join a round under way', () => {
  const store = new ProgressStore(memory());
  // A round started before item 037: only the old move words in it, some already taken.
  store.refillBag(['zap', 'bam', 'zip', 'hop'], 'moves');
  store.record('words', 'pop', true, 0);
  planMoves(store, input(PLAIN), seeded(4));
  const left = store.bag('moves').left;
  assert.ok(left.includes('stomp') && left.includes('nap'), 'new words are in');
  assert.ok(!left.includes('pop'), 'a word she has read (taken this round) stays out');
});

test('spread: across episodes the pads cover many words, vowels and first sounds', () => {
  const store = new ProgressStore(memory());
  const met = new Set<string>();
  const rand = seeded(11);
  for (let ep = 0; ep < 8; ep++) {
    const p = planMoves(store, input(drawGift(store, { helper: ALLY }, rand)), rand);
    for (const c of choices(p)) for (const w of c.words) met.add(w);
    playRight(store, p);
  }
  const words = [...met];
  assert.ok(words.length >= 20, `only ${words.join(', ')}`);
  const vowels = new Set(words.map((w) => ACTIONS.find((a) => a.word === w)!.vowel));
  assert.equal(vowels.size, 5, `vowels: ${[...vowels].join('')}`);
  assert.ok(new Set(words.map((w) => w.charAt(0))).size >= 10, 'first letters');
});

test("the counter word is never on battle 1's pads, and the counter still varies", () => {
  const counters = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) {
    const store = new ProgressStore(memory());
    const rand = seeded(seed);
    const spell = drawGift(store, { helper: ALLY }, rand);
    const p = planMoves(store, input(spell), rand);
    const pads = battle1Words(p);
    const ep: EpisodeInput = { fill: { villain: EPISODE_DEFAULTS.villain, helper: ALLY, hero: HERO }, ally: ALLY, spell, rooms: ['kitchen', 'garage'], counterRoom: 'attic', battle1Moves: pads };
    const key = episodePlans(store, ep, rand)[2].key;
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
    assert.equal(c.reformed.sorry.length, 3, c.id);
    assert.equal(c.reformed.ending.length, 3, c.id);
    for (const r of [...c.reformed.sorry, ...c.reformed.ending]) {
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
