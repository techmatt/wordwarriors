/**
 * The sentence game's pure rules: sentence building, the episode's room
 * plans, the word bag, and when a frame is solid enough to skip the
 * listening pass.
 * `npx tsx --test tests/unit/sentences.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CHARACTER_BY_ID, MOVE_WORDS, ROSTER } from '../../content/battle/roster';
import { EPISODE_DEFAULTS } from '../../src/config';
import { FETCH_ITEMS, FRAMES, FRAME_BY_ID, allFrameTokens, allPrefixes, lookalikesOf, sentence, slotOf, tokenWord } from '../../content/phonics/sentences';
import { CVC_WORDS } from '../../content/phonics/words';
import { wordLine } from '../../content/voice/ids';
import { BAG_WORDS, distractors, drawKey, episodePlans, frameIsSolid, saidEarly, type EpisodeInput, type RoomPlan } from '../../src/rules/sentences';
import { ProgressStore, STORE_KEY, type StorageLike } from '../../src/state/ProgressStore';

function memory(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

/** Deterministic rand for repeatable plans. */
function seeded(seed = 1): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// The default episode's cast (Julia and Ellie against Evil Tiamat since item 014).
const VILLAIN = EPISODE_DEFAULTS.villain;
const HELPER = EPISODE_DEFAULTS.ally ?? 'elsa';
const HERO = EPISODE_DEFAULTS.hero;
const FILL = { villain: VILLAIN, helper: HELPER, hero: HERO };

function input(villain = VILLAIN, helper = HELPER, hero = HERO, spell = 'zap'): EpisodeInput {
  return { fill: { villain, helper, hero }, ally: helper, spell, rooms: ['kitchen', 'garage'], counterRoom: 'attic' };
}

const words = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter(Boolean);

test('sentence() is upper case, key word last, with the right prefix line', () => {
  for (const frame of FRAMES) {
    const s = sentence(frame.id, FILL, 'net');
    assert.equal(s.tokens.at(-1), 'NET', frame.id);
    assert.equal(s.key, 'net');
    assert.equal(s.frame, frame.id);
    for (const t of s.tokens) assert.equal(t, t.toUpperCase(), `${frame.id}: ${t}`);
    const slot = slotOf(frame);
    const named = slot ? FILL[slot] : null;
    assert.equal(s.prefixLine, named ? `sent_${frame.id}_${named}` : `sent_${frame.id}`);
    assert.ok(allPrefixes().some((p) => p.id === s.prefixLine), `${s.prefixLine} is composed`);
    assert.ok(!s.tokens.some((t) => t.includes('{')), `${frame.id}: every slot is filled`);
  }
  assert.deepEqual(sentence('we_can_use_the', FILL, 'mop').tokens, ['WE', 'CAN', 'USE', 'THE', 'MOP']);
  assert.deepEqual(sentence('hero_needs_the', FILL, 'mop').tokens, ['JULIA', 'NEEDS', 'THE', 'MOP']);
  assert.deepEqual(sentence('runs_from_the', FILL, 'bus').tokens.slice(-4), ['RUNS', 'FROM', 'THE', 'BUS']);
});

test("the Playwright harness's FETCH_FRAMES matches the fetch frames", async () => {
  const { FETCH_FRAMES } = await import('../harness');
  assert.deepEqual([...FETCH_FRAMES].sort(), FRAMES.filter((f) => f.use === 'fetch').map((f) => f.id).sort());
});

test('frames: a few of each, and every fetch and counter frame ends in the key word', () => {
  const fetch = FRAMES.filter((f) => f.use === 'fetch');
  const counter = FRAMES.filter((f) => f.use === 'counter');
  assert.ok(fetch.length >= 3 && fetch.length <= 5, `${fetch.length} fetch frames`);
  assert.ok(counter.length >= 3 && counter.length <= 5, `${counter.length} counter frames`);
  for (const f of FRAMES) assert.ok(f.text.endsWith(' {x}'), f.id);
  // A counter frame names the villain: it is the villain's weakness.
  for (const f of counter) assert.equal(slotOf(f), 'villain', f.id);
});

test('episodePlans: rooms a, b and the attic; the right kinds of frame; three different key words; three objects each', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const store = new ProgressStore(memory());
    const [a, b, c] = episodePlans(store, input(), seeded(seed));
    assert.deepEqual([a.slot, b.slot, c.slot], ['a', 'b', 'counter']);
    assert.deepEqual([a.room, b.room, c.room], ['kitchen', 'garage', 'attic']);
    assert.notEqual(a.sentence.frame, b.sentence.frame);
    assert.equal(FRAME_BY_ID[a.sentence.frame]!.use, 'fetch');
    assert.equal(FRAME_BY_ID[b.sentence.frame]!.use, 'fetch');
    assert.equal(FRAME_BY_ID[c.sentence.frame]!.use, 'counter');
    assert.equal(new Set([a, b, c].map((p) => p.sentence.key)).size, 3, 'no key word twice in an episode');
    for (const p of [a, b]) assert.ok(FETCH_ITEMS.some((i) => i.word === p.sentence.key), `${p.sentence.key} is fetchable`);
    for (const p of [a, b, c]) {
      assert.equal(p.objects.length, 3);
      assert.equal(new Set(p.objects).size, 3);
      assert.ok(p.objects.includes(p.sentence.key));
    }
  }
});

test('the counter is random: any pictured, decodable word, under the 009 exclusions', () => {
  // Item 009: 12 villains read SCARED OF THE CUP and then fought with a Frost
  // Shield. Item 015: the counter word is drawn each episode, so the rule is
  // now about the draw. The counter word is a pictured, decodable bag word;
  // not a move word (battle 1's pads); not a word fetched this episode (battle
  // 1's banners); not a word the villain's taunts or anything else the
  // episode's characters say first; not a word any of the episode's sentences
  // shows; not the spell. The attic offers its picture, and battle 2 uses it.
  const decodable = new Set(CVC_WORDS.filter((w) => w.decodable).map((w) => w.word));
  for (const v of ROSTER) {
    const taunts = new Set(v.evil.taunts.flatMap((t) => [...words(t.text), ...words(t.say ?? '')]));
    for (const helper of ['elsa', 'ellie', v.id === 'jasmine' ? 'anna' : 'jasmine']) {
      if (helper === v.id) continue;
      const early = new Set(saidEarly({ hero: HERO, ally: helper, villain: v.id, helper }));
      for (let seed = 1; seed <= 12; seed++) {
        const plans = episodePlans(new ProgressStore(memory()), input(v.id, helper, HERO, 'pop'), seeded(seed));
        const counter = plans[2];
        const key = counter.sentence.key;
        const fetched = plans.slice(0, 2).map((p) => p.sentence.key);
        const shown = plans.flatMap((p) => p.sentence.tokens.slice(0, -1).map(tokenWord));
        assert.ok(decodable.has(key), `${v.id}: ${key} is a pictured, decodable word`);
        assert.ok(!(MOVE_WORDS as readonly string[]).includes(key), `${v.id}: ${key} is a move word`);
        assert.ok(!fetched.includes(key), `${v.id}: ${key} was fetched this episode`);
        assert.ok(!taunts.has(key), `${v.id}: ${key} is in a taunt`);
        assert.ok(!early.has(key), `${v.id}/${helper}: ${key} is said before the attic`);
        assert.ok(!shown.includes(key), `${v.id}: ${key} is shown in a sentence`);
        assert.notEqual(key, 'pop');
        assert.ok(counter.objects.includes(key), `${v.id}: the attic offers ${counter.objects.join(', ')}, not ${key}`);
        // The fetch words keep the same rules, bar the move words and each other.
        for (const f of fetched) {
          assert.ok(!early.has(f), `${v.id}/${helper}: fetch word ${f} is said early`);
          assert.ok(!shown.includes(f), `${v.id}: fetch word ${f} is shown in a sentence`);
          assert.notEqual(f, 'pop');
        }
      }
    }
  }
});

test('the counter varies: many words and every counter frame come up for one villain', () => {
  const keys = new Set<string>();
  const frames = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) {
    const c = episodePlans(new ProgressStore(memory()), input(), seeded(seed))[2];
    keys.add(c.sentence.key);
    frames.add(c.sentence.frame);
  }
  assert.ok(keys.size >= 10, `only ${[...keys].join(', ')}`);
  assert.equal(frames.size, FRAMES.filter((f) => f.use === 'counter').length, `frames: ${[...frames].join(', ')}`);
});

/** She reads a word right first time, as SentenceRoom records it. */
function readRight(store: ProgressStore, word: string): void {
  store.record('words', word, true, 0);
  store.takeFromBag(word);
}

test('the word bag: no key word comes back until the bag has gone round', () => {
  const store = new ProgressStore(memory());
  const rand = seeded(7);
  const drawn: string[] = [];
  for (let i = 0; i < BAG_WORDS.length; i++) {
    const w = drawKey(store, BAG_WORDS, rand);
    drawn.push(w);
    readRight(store, w);
  }
  assert.equal(new Set(drawn).size, BAG_WORDS.length, 'a whole round without a repeat');
  assert.equal(store.bag().round, 1);
  assert.equal(store.bag().left.length, 0);
  drawKey(store, BAG_WORDS, rand);
  assert.equal(store.bag().round, 2, 'then it refills');
  assert.equal(store.bag().left.length, BAG_WORDS.length);

  // Across whole episodes she plays through: four episodes (12 key words) without a repeat.
  for (let seed = 1; seed <= 20; seed++) {
    const s = new ProgressStore(memory());
    const keys: string[] = [];
    for (let e = 0; e < 4; e++) {
      const ks = episodePlans(s, input(), seeded(seed * 10 + e)).map((p) => p.sentence.key);
      for (const k of ks) readRight(s, k);
      keys.push(...ks);
    }
    assert.equal(new Set(keys).size, keys.length, `seed ${seed}: ${keys.join(' ')}`);
  }
});

test('the word bag: drawing spends nothing; an abandoned episode or a dev jump keeps every word', () => {
  const store = new ProgressStore(memory());
  episodePlans(store, input(), seeded(4));
  const before = store.bag();
  assert.equal(before.round, 1);
  assert.equal(before.left.length, BAG_WORDS.length, 'planning an episode takes nothing out');
  episodePlans(store, input(), seeded(5));
  assert.deepEqual(store.bag(), before);
});

test('the word bag: a refill keeps out the words this episode has already drawn', () => {
  const store = new ProgressStore(memory());
  store.refillBag(['cat']);
  const rand = seeded(3);
  const a = drawKey(store, BAG_WORDS, rand);
  assert.equal(a, 'cat');
  const b = drawKey(store, BAG_WORDS.filter((w) => w !== a), rand, [a]);
  assert.notEqual(b, 'cat');
  assert.ok(!store.bag().left.includes('cat'), 'the new round does not open with this episode\'s word');
});

test('the word bag: a missed word stays in (or goes back in); shaky words are drawn more often', () => {
  const store = new ProgressStore(memory());
  const rand = seeded(11);
  const w = drawKey(store, BAG_WORDS, rand);
  store.takeFromBag(w);
  assert.ok(!store.bag().left.includes(w));
  store.returnToBag(w);
  assert.ok(store.bag().left.includes(w));
  store.returnToBag(w);
  assert.equal(store.bag().left.filter((x) => x === w).length, 1, 'once only');

  let cat = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const s = new ProgressStore(memory());
    for (const word of BAG_WORDS) for (let i = 0; i < 3; i++) s.record('words', word, word !== 'cat', word === 'cat' ? 1 : 0);
    if (drawKey(s, BAG_WORDS, seeded(seed)) === 'cat') cat++;
  }
  // Chance alone is 1 in 30; a shaky word against solid ones comes up far more.
  assert.ok(cat >= 20, `cat drawn ${cat} times in 100`);
});

test('the word bag is kept with her progress, and an older save without one still loads', () => {
  const storage = memory();
  const a = new ProgressStore(storage);
  readRight(a, drawKey(a, BAG_WORDS, seeded(5)));
  const b = new ProgressStore(storage);
  assert.deepEqual(b.bag(), a.bag());
  assert.equal(b.bag().left.length, BAG_WORDS.length - 1);

  const old = memory();
  old.setItem(STORE_KEY, JSON.stringify({ version: 1, sounds: {}, words: { cat: { seen: 1, right: 1, wrong: 0, recent: [true], last: 1 } }, spelling: {}, frames: {}, episodes: 3 }));
  const c = new ProgressStore(old);
  assert.deepEqual(c.bag(), { left: [], round: 0 });
  assert.equal(c.snapshot().episodes, 3);
  assert.equal(c.stat('words', 'cat').seen, 1);
});

test("the villain's named counter word still comes up, and is boosted", () => {
  // Evil Tiamat's HAT (the Magic Hat swallows her storm) is in the draw like
  // any word, a bit more often than one in thirty.
  const named = CHARACTER_BY_ID[VILLAIN]!.counter.word;
  let n = 0;
  for (let seed = 1; seed <= 200; seed++) if (episodePlans(new ProgressStore(memory()), input(), seeded(seed))[2].sentence.key === named) n++;
  assert.ok(n >= 10, `${named} came up ${n} times in 200`);
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
    for (const c of ROSTER) {
      const s = sentence(frame.id, { villain: c.id, helper: c.id, hero: c.id }, 'net');
      for (const t of s.tokens.slice(0, -1)) {
        assert.ok(tokens.has(tokenWord(t)), `${frame.id}: ${wordLine(tokenWord(t))}`);
      }
    }
  }
});

test('room objects: no look-alike of the key, no word of the sentence, not the spell, no other key word', () => {
  const check = (p: RoomPlan, avoid: string[]) => {
    const key = p.sentence.key;
    const others = p.objects.filter((o) => o !== key);
    assert.equal(others.length, 2);
    const ws = p.sentence.tokens.map(tokenWord);
    for (const o of others) {
      assert.ok(!lookalikesOf(key).includes(o), `${o} looks like ${key}`);
      assert.ok(!ws.includes(o), `${o} is a word of "${p.sentence.tokens.join(' ')}"`);
      assert.ok(!avoid.includes(o), `${o} is avoided`);
    }
  };
  for (const c of ROSTER) {
    for (let seed = 1; seed <= 20; seed++) {
      const plans = episodePlans(new ProgressStore(memory()), input(c.id, 'elsa', HERO, 'fan'), seeded(seed));
      const keys = plans.map((p) => p.sentence.key);
      for (const p of plans) check(p, ['fan', ...keys.filter((k) => k !== p.sentence.key)]);
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

test("room objects never share the key word's first letter (no MAP beside the MOP)", () => {
  for (const key of BAG_WORDS) {
    for (let seed = 1; seed <= 30; seed++) {
      const objs = distractors(key, seeded(seed), 2, ['we', 'can', 'use', 'the']);
      assert.equal(objs.length, 2, key);
      for (const o of objs) assert.notEqual(o[0], key[0], `${o} starts like ${key}`);
    }
  }
});
