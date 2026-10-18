/**
 * The sentence game's pure rules: sentence building, the episode's room
 * plans, and when a frame is solid enough to skip the listening pass.
 * `npx tsx --test tests/unit/sentences.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CHARACTER_BY_ID, ROSTER } from '../../content/battle/roster';
import { FETCH_ITEMS, FRAMES, FRAME_BY_ID, allFrameTokens, allPrefixes, lookalikesOf, sentence, tokenWord } from '../../content/phonics/sentences';
import { wordLine } from '../../content/voice/ids';
import { counterPlan, distractors, fetchPlans, frameIsSolid, type RoomPlan } from '../../src/rules/sentences';
import { ProgressStore, type StorageLike } from '../../src/state/ProgressStore';

function memory(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

/** Deterministic rand for repeatable plans. */
function seeded(seed = 1): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// Rilla is the v0.2 default villain; fall back to Elsa if the roster has not got her yet.
const VILLAIN = CHARACTER_BY_ID['rilla'] ? 'rilla' : 'elsa';
const FILL = { villain: VILLAIN, helper: 'elsa' };

test('sentence() is upper case, key word last, with the right prefix line', () => {
  for (const frame of FRAMES) {
    const s = sentence(frame.id, FILL, 'net');
    assert.equal(s.tokens.at(-1), 'NET', frame.id);
    assert.equal(s.key, 'net');
    assert.equal(s.frame, frame.id);
    for (const t of s.tokens) assert.equal(t, t.toUpperCase(), `${frame.id}: ${t}`);
    const named = frame.text.includes('{villain}') ? VILLAIN : frame.text.includes('{helper}') ? 'elsa' : null;
    assert.equal(s.prefixLine, named ? `sent_${frame.id}_${named}` : `sent_${frame.id}`);
    assert.ok(allPrefixes().some((p) => p.id === s.prefixLine), `${s.prefixLine} is composed`);
  }
  assert.deepEqual(sentence('we_can_use_the', FILL, 'mop').tokens, ['WE', 'CAN', 'USE', 'THE', 'MOP']);
});

test('fetchPlans: two distinct fetch frames and key words; three distinct objects including the key', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const store = new ProgressStore(memory());
    const [a, b] = fetchPlans(store, FILL, ['kitchen', 'garage'], seeded(seed));
    assert.equal(a.slot, 'a');
    assert.equal(b.slot, 'b');
    assert.equal(a.room, 'kitchen');
    assert.equal(b.room, 'garage');
    assert.notEqual(a.sentence.frame, b.sentence.frame);
    assert.notEqual(a.sentence.key, b.sentence.key);
    for (const p of [a, b]) {
      assert.equal(FRAME_BY_ID[p.sentence.frame]!.use, 'fetch');
      assert.equal(p.objects.length, 3);
      assert.equal(new Set(p.objects).size, 3);
      assert.ok(p.objects.includes(p.sentence.key));
    }
  }
});

test("counterPlan uses the villain's counter frame and word", () => {
  const counter = CHARACTER_BY_ID[VILLAIN]!.counter;
  const p = counterPlan(FILL, 'attic', seeded(3));
  assert.equal(p.slot, 'counter');
  assert.equal(p.room, 'attic');
  assert.equal(p.sentence.frame, counter.frame);
  assert.equal(p.sentence.key, counter.word);
  assert.equal(FRAME_BY_ID[p.sentence.frame]!.use, 'counter');
  assert.equal(p.objects.length, 3);
  assert.equal(new Set(p.objects).size, 3);
  assert.ok(p.objects.includes(counter.word));
  if (VILLAIN === 'rilla') {
    assert.equal(p.sentence.frame, 'scared_of');
    assert.equal(p.sentence.key, 'mice');
    assert.equal(p.sentence.tokens.at(-1), 'MICE');
  }
});

test('every villain: the counter sentence names the item that beats it in battle 2', () => {
  // Item 009: 12 villains read SCARED OF THE CUP and then fought with a Frost Shield.
  // The item's name (its battle-2 banner) carries the key word, the attic offers
  // that word's picture, and no two villains share a key word.
  const seen = new Map<string, string>();
  for (const c of ROSTER) {
    const { word, name } = c.counter;
    const nameWords = name.toLowerCase().split(/[^a-z]+/);
    assert.ok(nameWords.includes(word), `${c.id}: counter sentence ends ${word.toUpperCase()} but the battle-2 item is the ${name}`);
    for (let seed = 1; seed <= 10; seed++) {
      const p = counterPlan({ villain: c.id, helper: c.id === 'elsa' ? 'anna' : 'elsa' }, 'attic', seeded(seed));
      assert.equal(p.sentence.key, word);
      assert.ok(p.objects.includes(word), `${c.id}: the attic offers ${p.objects.join(', ')}, not ${word}`);
    }
    assert.ok(!seen.has(word), `${c.id} and ${seen.get(word)} share the counter word ${word}`);
    seen.set(word, c.id);
  }
});

test('frameIsSolid: new is not solid; 6 tries with the last 5 right is; one miss in the last 5 is not', () => {
  const store = new ProgressStore(memory());
  assert.equal(frameIsSolid(store, 'go_get_the'), false);
  store.record('frames', 'go_get_the', false, 1);
  for (let i = 0; i < 4; i++) store.record('frames', 'go_get_the', true, 0);
  assert.equal(frameIsSolid(store, 'go_get_the'), false, 'five tries is not enough');
  store.record('frames', 'go_get_the', true, 0);
  assert.equal(frameIsSolid(store, 'go_get_the'), true);

  const shaky = new ProgressStore(memory());
  for (let i = 0; i < 6; i++) shaky.record('frames', 'we_need_a', i !== 3, i === 3 ? 1 : 0);
  assert.equal(frameIsSolid(shaky, 'we_need_a'), false);
});

test("every frame token's word line is in allFrameTokens", () => {
  const tokens = new Set(allFrameTokens());
  for (const frame of FRAMES) {
    for (const villain of [VILLAIN, 'elsa']) {
      const s = sentence(frame.id, { villain, helper: villain }, 'net');
      for (const t of s.tokens.slice(0, -1)) {
        assert.ok(tokens.has(tokenWord(t)), `${frame.id}: ${wordLine(tokenWord(t))}`);
      }
    }
  }
});

test('fetchPlans never picks a key word in avoid, or one its own sentence already shows', () => {
  for (const c of ROSTER) {
    for (const helper of ['elsa', 'jasmine', c.id]) {
      const fill = { villain: c.id, helper };
      const avoid = ['fan', 'sun', c.counter.word];
      for (let seed = 1; seed <= 30; seed++) {
        const plans = fetchPlans(new ProgressStore(memory()), fill, ['kitchen', 'garage'], seeded(seed), avoid);
        for (const p of plans) {
          assert.ok(!avoid.includes(p.sentence.key), `${c.id}/${helper}: key ${p.sentence.key} is avoided`);
          const shown = p.sentence.tokens.slice(0, -1).map(tokenWord);
          assert.ok(!shown.includes(p.sentence.key), `${p.sentence.tokens.join(' ')} shows its key word early`);
        }
      }
    }
  }
});

test('room objects: no look-alike of the key, no word of the sentence, nothing avoided', () => {
  const check = (p: RoomPlan, avoid: string[]) => {
    const key = p.sentence.key;
    const others = p.objects.filter((o) => o !== key);
    assert.equal(others.length, 2);
    const words = p.sentence.tokens.map(tokenWord);
    for (const o of others) {
      assert.ok(!lookalikesOf(key).includes(o), `${o} looks like ${key}`);
      assert.ok(!words.includes(o), `${o} is a word of "${p.sentence.tokens.join(' ')}"`);
      assert.ok(!avoid.includes(o), `${o} is avoided`);
    }
  };
  for (const c of ROSTER) {
    const fill = { villain: c.id, helper: 'elsa' };
    for (let seed = 1; seed <= 30; seed++) {
      for (const p of fetchPlans(new ProgressStore(memory()), fill, ['kitchen', 'garage'], seeded(seed), ['zap'])) check(p, ['zap']);
      check(counterPlan(fill, 'attic', seeded(seed), ['fan']), ['fan']);
    }
  }
  // WE CAN USE THE ...: CAN is a frame word, so never a picture in that room.
  for (let seed = 1; seed <= 50; seed++) {
    const objs = distractors('mop', seeded(seed), 2, ['we', 'can', 'use', 'the']);
    assert.ok(!objs.includes('can'));
  }
  assert.ok(lookalikesOf('mice').includes('rat'));
  assert.ok(lookalikesOf('hat').includes('cap'));
  assert.ok(lookalikesOf('bus').includes('van'));
  for (let seed = 1; seed <= 50; seed++) assert.ok(!distractors('mice', seeded(seed)).includes('rat'));
});

test("room objects never share the key word's first letter (no MAP beside the MICE)", () => {
  const keys = new Set([...FETCH_ITEMS.map((i) => i.word), ...ROSTER.map((c) => c.counter.word)]);
  for (const key of keys) {
    for (let seed = 1; seed <= 30; seed++) {
      const objs = distractors(key, seeded(seed), 2, ['we', 'can', 'use', 'the']);
      assert.equal(objs.length, 2, key);
      for (const o of objs) assert.notEqual(o[0], key[0], `${o} starts like ${key}`);
    }
  }
  for (const c of ROSTER) {
    for (let seed = 1; seed <= 20; seed++) {
      const p = counterPlan({ villain: c.id, helper: 'elsa' }, 'attic', seeded(seed));
      for (const o of p.objects.filter((w) => w !== p.sentence.key)) assert.notEqual(o[0], p.sentence.key[0], `${c.id}: ${o}`);
    }
  }
});
