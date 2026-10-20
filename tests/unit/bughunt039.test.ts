/**
 * Item 039 (the bug hunt): its rule fixes, kept fixed (the word draws, the battle's give-aways).
 * `npx tsx --test tests/unit/bughunt039.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

import { MOVE_WORDS } from '../../content/battle/roster';
import { BANK, BANK_BY_WORD } from '../../content/phonics/bank';
import { distractorsFor, gates, withStems } from '../../src/rules/bank';
import { MINIGAME_BY_ID } from '../../src/rules/minigames';
import { drawGift, drawMove } from '../../src/rules/moves';
import { BAG_WORDS, drawKey, episodePlans, type EpisodeInput } from '../../src/rules/sentences';
import { ProgressStore, type StorageLike } from '../../src/state/ProgressStore';

function memory(): StorageLike {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

function seeded(seed = 1): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const level = (w: string) => BANK_BY_WORD[w]?.level ?? 1;

test('a bag left holding only shut-level words is spent: the gift, the moves and the keys stay on open levels', () => {
  const store = new ProgressStore(memory());
  // A fresh store: only level 1 is open.
  assert.equal(gates(store)[3], 0);
  const digraphActions = MOVE_WORDS.filter((w) => level(w) === 3);
  const digraphThings = BAG_WORDS.filter((w) => level(w) === 3);
  assert.ok(digraphActions.length && digraphThings.length);
  store.refillBag(digraphActions, 'moves');
  store.refillBag(digraphThings);
  for (let seed = 1; seed <= 30; seed++) {
    assert.equal(level(drawGift(store, { helper: 'ellie' }, seeded(seed))), 1, 'gift');
    assert.equal(level(drawMove(store, MOVE_WORDS, seeded(seed))), 1, 'move');
    assert.equal(level(drawKey(store, BAG_WORDS, seeded(seed))), 1, 'key');
  }
});

test('no "A" frame takes a word starting with a vowel (WE NEED A ANT)', () => {
  // Every level open, so ANT is in the draw.
  const store = new ProgressStore(memory());
  for (const w of BANK) for (let i = 0; i < 6; i++) store.record('words', w.word, true, 0);
  const vowelThings = BAG_WORDS.filter((w) => /^[aeiou]/.test(w));
  assert.ok(vowelThings.length, 'the bank has a thing starting with a vowel');
  const g = (id: string) => MINIGAME_BY_ID[`sentence:${id}`]!;
  for (let seed = 1; seed <= 300; seed++) {
    const input: EpisodeInput = {
      fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' },
      ally: 'ellie',
      spell: 'zap',
      rooms: ['kitchen', 'garage'],
      counterRoom: 'attic',
      games: [g('we_need_a'), g('helper_needs_a'), g('runs_from_the')],
    };
    for (const p of episodePlans(store, input, seeded(seed))) {
      if (p.kind !== 'sentence') continue;
      const t = p.sentence.tokens;
      assert.ok(!(t.at(-2) === 'A' && /^[AEIOU]/.test(t.at(-1)!)), t.join(' '));
    }
  }
});

test('a new word\'s other pictures start with another sound: no KIT beside CAT, no CAT beside KIT', () => {
  const store = new ProgressStore(memory());
  const pool = BAG_WORDS;
  for (let seed = 1; seed <= 400; seed++) {
    for (const d of distractorsFor(store, 'cat', pool, 2, seeded(seed))) assert.ok(!d.startsWith('k'), `cat beside ${d}`);
    for (const d of distractorsFor(store, 'kit', pool, 2, seeded(seed))) assert.ok(!(d.startsWith('c') && !d.startsWith('ch')), `kit beside ${d}`);
  }
});

test('withStems: a bank word heard inside a plural, a pet form or a compound is said; FIND, FIGHT and HATES are not FIN, FIG and HAT', () => {
  const said = withStems(['piggy', 'legs', 'cupcakes', 'pancakes', 'foxes', 'find', 'fight', 'hates']);
  for (const w of ['pig', 'leg', 'cup', 'pan', 'fox']) if (BANK_BY_WORD[w]) assert.ok(said.includes(w), w);
  for (const w of ['fin', 'fig', 'hat']) assert.ok(!said.includes(w), w);
});

test("the fight styles' floating words are never bank words (the cook-off's YUM! and FLIP! were pads to come)", () => {
  const dir = 'src/battle/stages';
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
    const src = readFileSync(`${dir}/${f}`, 'utf8');
    for (const m of src.matchAll(/floatText\([^'"`]*['"`]([^'"`]+)['"`]/g)) {
      const hits = m[1]!.toLowerCase().split(/[^a-z]+/).filter((w) => BANK_BY_WORD[w]);
      assert.deepEqual(hits, [], `${f}: ${m[1]}`);
    }
  }
});
