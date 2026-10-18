/**
 * The sentence game's pure rules: sentence building, the episode's room
 * plans, and when a frame is solid enough to skip the listening pass.
 * `npx tsx --test tests/unit/sentences.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CHARACTER_BY_ID } from '../../content/battle/roster';
import { FRAMES, FRAME_BY_ID, allFrameTokens, allPrefixes, sentence, tokenWord } from '../../content/phonics/sentences';
import { wordLine } from '../../content/voice/ids';
import { counterPlan, fetchPlans, frameIsSolid } from '../../src/rules/sentences';
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
