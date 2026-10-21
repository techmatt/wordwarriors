/**
 * The sentence game's pure rules: sentence building, the episode's room
 * plans, the word bag, and when a frame is solid enough to skip the
 * listening pass.
 * `npx tsx --test tests/unit/sentences.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { CHARACTER_BY_ID, ROSTER } from '../../content/battle/roster';
import { ACTIONS, BANK_BY_WORD } from '../../content/phonics/bank';
import { DIFFICULTY, EPISODE_DEFAULTS } from '../../src/config';
import { setDifficulty } from '../../src/rules/difficulty';
import { FETCH_ITEMS, FRAMES, FRAME_BY_ID, allFrameTokens, allPrefixes, lookalikesOf, sentence, slotOf, tokenWord } from '../../content/phonics/sentences';
import { CVC_WORDS } from '../../content/phonics/words';
import { wordLine } from '../../content/voice/ids';
import { BAG_WORDS, LEGACY_BAG_WORDS, distractors, drawKey, frameIsSolid, saidEarly, skipsListening, type EpisodeInput, type SentencePlan } from '../../src/rules/sentences';
import { sentencePlans } from './plans';
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

function input(villain = VILLAIN, helper = HELPER, hero = HERO, gift = 'zap'): EpisodeInput {
  return { fill: { villain, helper, hero }, ally: helper, gift, rooms: ['kitchen', 'garage'], counterRoom: 'attic' };
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

test('a villain is named bare in sentences, never EVIL (item 038)', () => {
  for (const frame of FRAMES.filter((f) => slotOf(f) === 'villain')) {
    for (const c of ROSTER) {
      const s = sentence(frame.id, { ...FILL, villain: c.id }, 'fan');
      assert.ok(!s.tokens.some((t) => t.startsWith('EVIL')), `${frame.id} × ${c.id}: ${s.tokens.join(' ')}`);
    }
  }
  assert.deepEqual(sentence('runs_from_the', { ...FILL, villain: 'jormungandr' }, 'fan').tokens, ['JORMUNGANDR', 'RUNS', 'FROM', 'THE', 'FAN']);
  for (const p of allPrefixes()) assert.ok(!/\bevil/i.test(`${p.text} ${p.say ?? ''}`), `${p.id}: ${p.text}`);
  assert.ok(!allFrameTokens().some((t) => t.startsWith('evil')), 'no EVIL token');
});

test("the Playwright harness's FETCH_FRAMES matches the fetch frames", async () => {
  const { FETCH_FRAMES } = await import('../harness');
  assert.deepEqual([...FETCH_FRAMES].sort(), FRAMES.filter((f) => f.use === 'fetch').map((f) => f.id).sort());
});

test('frames: a few of each, and every fetch and counter frame ends in the key word', () => {
  const fetch = FRAMES.filter((f) => f.use === 'fetch');
  const counter = FRAMES.filter((f) => f.use === 'counter');
  assert.ok(fetch.length >= 3 && fetch.length <= 5, `${fetch.length} fetch frames`);
  assert.ok(counter.length >= 3 && counter.length <= 8, `${counter.length} counter frames`);
  for (const f of FRAMES) assert.ok(f.text.endsWith(' {x}'), f.id);
  // A counter frame names the villain: it is the villain's weakness.
  for (const f of counter) assert.equal(slotOf(f), 'villain', f.id);
});

test('episodePlans: rooms a, b and the attic; the right kinds of frame; three different key words; three objects each', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const store = new ProgressStore(memory());
    const [a, b, c] = sentencePlans(store, input(), seeded(seed));
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

test('KEY and YOYO can be the counter (item 048)', () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 400 && seen.size < 2; seed++) {
    const k = sentencePlans(new ProgressStore(memory()), input(), seeded(seed))[2].sentence.key;
    if (k === 'key' || k === 'yoyo') seen.add(k);
  }
  assert.deepEqual([...seen].sort(), ['key', 'yoyo']);
});

test('the counter is random: any pictured, decodable word, under the 009 exclusions', () => {
  // Item 009: 12 villains read SCARED OF THE CUP and then fought with a Frost
  // Shield. Item 015: the counter word is drawn each episode, so the rule is
  // now about the draw. The counter word is a pictured, decodable bag word;
  // not a move word (battle 1's pads); not a word fetched this episode (battle
  // 1's banners); not a word the villain's taunts or anything else the
  // episode's characters say first; not a word any of the episode's sentences
  // shows; not the gift word. The attic offers its picture, and battle 2 uses it.
  const decodable = new Set(CVC_WORDS.filter((w) => w.decodable).map((w) => w.word));
  for (const v of ROSTER) {
    const taunts = new Set(v.evil.taunts.flatMap((t) => [...words(t.text), ...words(t.say ?? '')]));
    for (const helper of ['elsa', 'ellie', v.id === 'jasmine' ? 'anna' : 'jasmine']) {
      if (helper === v.id) continue;
      const early = new Set(saidEarly({ hero: HERO, ally: helper, villain: v.id, helper }));
      for (let seed = 1; seed <= 12; seed++) {
        const plans = sentencePlans(new ProgressStore(memory()), input(v.id, helper, HERO, 'pop'), seeded(seed));
        const counter = plans[2];
        const key = counter.sentence.key;
        const fetched = plans.slice(0, 2).map((p) => p.sentence.key);
        const shown = plans.flatMap((p) => p.sentence.tokens.slice(0, -1).map(tokenWord));
        assert.ok(decodable.has(key), `${v.id}: ${key} is a pictured, decodable word`);
        assert.ok(!ACTIONS.some((w) => w.word === key), `${v.id}: ${key} is an action word (a move pad)`);
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
    const c = sentencePlans(new ProgressStore(memory()), input(), seeded(seed))[2];
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
  // Round 1 goes through every bag word (item 067: every level is in play).
  for (;;) {
    const w = drawKey(store, BAG_WORDS, rand);
    if (store.bag().round !== 1) break;
    drawn.push(w);
    readRight(store, w);
  }
  assert.equal(new Set(drawn).size, drawn.length, 'a whole round without a repeat');
  assert.equal(drawn.length, BAG_WORDS.length, `the round drew every word (${drawn.length})`);
  assert.equal(store.bag().round, 2, 'then it refills');

  // Across whole episodes she plays through: four episodes (12 key words) without a repeat.
  for (let seed = 1; seed <= 20; seed++) {
    const s = new ProgressStore(memory());
    const keys: string[] = [];
    for (let e = 0; e < 4; e++) {
      const ks = sentencePlans(s, input(), seeded(seed * 10 + e)).map((p) => p.sentence.key);
      for (const k of ks) readRight(s, k);
      keys.push(...ks);
    }
    assert.equal(new Set(keys).size, keys.length, `seed ${seed}: ${keys.join(' ')}`);
  }
});

test('the word bag: drawing spends nothing; an abandoned episode or a dev jump keeps every word', () => {
  const store = new ProgressStore(memory());
  sentencePlans(store, input(), seeded(4));
  const before = store.bag();
  assert.equal(before.round, 1);
  assert.equal(before.left.length, BAG_WORDS.length, 'planning an episode takes nothing out');
  sentencePlans(store, input(), seeded(5));
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
  // Chance alone is 1 in BAG_WORDS.length (about 90); a shaky word against solid ones comes up far more.
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

test('new words (MUG RUG JUG, then 037\'s) join a round under way; a fresh bag and a new round are untouched', () => {
  // Every word since the 30 of before item 035: MUG RUG JUG, and item 037's bank words.
  const NEW = BAG_WORDS.filter((w) => !LEGACY_BAG_WORDS.includes(w));
  assert.equal(LEGACY_BAG_WORDS.length, 30);
  assert.ok(['mug', 'rug', 'jug', 'frog', 'ship'].every((w) => NEW.includes(w)));
  // Item 040: only an `odd` word left it (PIN did, until item 043).
  assert.ok(LEGACY_BAG_WORDS.every((w) => BAG_WORDS.includes(w) || BANK_BY_WORD[w]?.odd), 'no pre-035 word left the bag but the odd ones');
  // Saved before item 035, mid-round, none of them ever in it.
  const old = memory();
  const left = LEGACY_BAG_WORDS.slice(0, 5);
  old.setItem(STORE_KEY, JSON.stringify({ ...new ProgressStore(memory()).snapshot(), bag: { left, round: 2 }, bagKnown: undefined }));
  const a = new ProgressStore(old);
  drawKey(a, BAG_WORDS, seeded(1));
  assert.deepEqual(a.bag().left.sort(), [...left, ...NEW].sort());
  assert.equal(a.bag().round, 2);
  // Once known, spending them keeps them out until the next round.
  for (const w of NEW) a.takeFromBag(w);
  drawKey(a, BAG_WORDS, seeded(2));
  assert.ok(!a.bag().left.some((w) => NEW.includes(w)));

  // Saved under item 035's catalogue (the 33 words, `bagKnown` stored), mid-round:
  // 037's words join, the 035 words she has spent stay out, a word the game dropped leaves.
  const CAT035 = [...LEGACY_BAG_WORDS, 'mug', 'rug', 'jug'];
  const mid = memory();
  mid.setItem(STORE_KEY, JSON.stringify({ ...new ProgressStore(memory()).snapshot(), bag: { left: ['cat', 'mug', 'gone'], round: 4 }, bagKnown: [...CAT035, 'gone'] }));
  const c = new ProgressStore(mid);
  drawKey(c, BAG_WORDS, seeded(4));
  assert.deepEqual(c.bag().left.sort(), ['cat', 'mug', ...BAG_WORDS.filter((w) => !CAT035.includes(w))].sort());
  assert.equal(c.bag().round, 4);
  // A store from today never tops up: its first draw fills the bag, with every word.
  const b = new ProgressStore(memory());
  b.refillBag(['cat', 'dog']);
  drawKey(b, BAG_WORDS, seeded(3));
  assert.deepEqual(b.bag().left.sort(), ['cat', 'dog']);
});

test("the villain's named counter word still comes up, and is boosted", () => {
  // Evil Tiamat's HAT (the Magic Hat swallows her storm) is in the draw like
  // any word, more often than chance (a fresh store draws from the hundred-odd
  // pictures, every level since item 067).
  const named = CHARACTER_BY_ID[VILLAIN]!.counter.word;
  let n = 0;
  for (let seed = 1; seed <= 200; seed++) if (sentencePlans(new ProgressStore(memory()), input(), seeded(seed))[2].sentence.key === named) n++;
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

  // Item 067: a solid frame keeps its listening pass at base difficulty; from 2 it skips it.
  assert.equal(skipsListening(store, 'go_get_the'), false);
  setDifficulty(2);
  try {
    assert.equal(skipsListening(store, 'go_get_the'), true);
    assert.equal(skipsListening(shaky, 'we_need_a'), false);
  } finally {
    setDifficulty(DIFFICULTY);
  }
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

test('room objects: no look-alike of the key, no word of the sentence, not the gift word, no other key word', () => {
  const check = (p: SentencePlan, avoid: string[]) => {
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
      const plans = sentencePlans(new ProgressStore(memory()), input(c.id, 'elsa', HERO, 'fan'), seeded(seed));
      const keys = plans.map((p) => p.sentence.key);
      for (const p of plans) check(p, ['fan', ...keys.filter((k) => k !== p.sentence.key)]);
    }
  }
  // WE CAN USE THE ...: CAN is a frame word, so never a picture in that room.
  const store = new ProgressStore(memory());
  for (let seed = 1; seed <= 50; seed++) {
    const objs = distractors(store, 'mop', seeded(seed), 2, ['we', 'can', 'use', 'the']);
    assert.ok(!objs.includes('can'));
  }
  assert.ok(lookalikesOf('mice').includes('rat'));
  assert.ok(lookalikesOf('hat').includes('cap'));
  assert.ok(lookalikesOf('bus').includes('van'));
  // Item 037's look-alikes: a fin beside a fish, a hut beside a tent.
  assert.ok(lookalikesOf('fish').includes('fin'));
  assert.ok(lookalikesOf('tent').includes('hut'));
  for (let seed = 1; seed <= 50; seed++) assert.ok(!distractors(store, 'mice', seeded(seed)).includes('rat'));
  // A firm key word keeps its look-alikes out too.
  const firm = new ProgressStore(memory());
  for (let i = 0; i < 4; i++) firm.record('words', 'fish', true, 0);
  for (let seed = 1; seed <= 50; seed++) assert.ok(!distractors(firm, 'fish', seeded(seed)).includes('fin'));
});

test("room objects for a new key word never share its first letter (no MAP beside the MOP)", () => {
  const store = new ProgressStore(memory());
  for (const key of BAG_WORDS) {
    for (let seed = 1; seed <= 30; seed++) {
      const objs = distractors(store, key, seeded(seed), 2, ['we', 'can', 'use', 'the']);
      assert.equal(objs.length, 2, key);
      for (const o of objs) assert.notEqual(o[0], key[0], `${o} starts like ${key}`);
    }
  }
});

test('room objects for a firm key word (from difficulty 2, item 067): one shares its first sound or rime (CAT beside HAT or CAN), the other does not start like it', () => {
  const store = new ProgressStore(memory());
  for (let i = 0; i < 4; i++) store.record('words', 'cat', true, 0);
  // At base the firm CAT still stands among other first letters.
  for (let seed = 1; seed <= 20; seed++) for (const o of distractors(store, 'cat', seeded(seed), 2, ['we', 'can', 'use', 'the'])) assert.notEqual(o[0], 'c', `${o} beside CAT at base`);
  setDifficulty(2);
  after(() => setDifficulty(DIFFICULTY));
  for (let seed = 1; seed <= 40; seed++) {
    const objs = distractors(store, 'cat', seeded(seed), 2, ['we', 'can', 'use', 'the']);
    assert.equal(objs.length, 2);
    const share = objs.filter((o) => o[0] === 'c' || o.endsWith('at'));
    assert.ok(share.length >= 1, `seed ${seed}: ${objs.join(', ')} share nothing with cat`);
    assert.ok(objs.some((o) => o[0] !== 'c'), `seed ${seed}: both start like cat`);
    assert.ok(!objs.includes('rat') && !objs.includes('bat'), 'never a look-alike');
  }
});

test('moveWords: no room key word, the counter included, is on any of the episode\'s move pads; by default none is an action word', () => {
  const actions = new Set(ACTIONS.map((w) => w.word));
  // NET and SUN are both pictures and actions: on a pad this episode, so no room may ask for them.
  const pads = ['net', 'sun', 'fan', 'web', 'zap', 'hop'];
  for (let seed = 1; seed <= 60; seed++) {
    const store = new ProgressStore(memory());
    const plans = sentencePlans(store, { ...input(), moveWords: pads }, seeded(seed));
    for (const p of plans) assert.ok(!pads.includes(p.sentence.key), `seed ${seed}: ${p.slot} asks for ${p.sentence.key}, a pad word`);
    const plain = sentencePlans(new ProgressStore(memory()), input(), seeded(seed));
    for (const p of plain) assert.ok(!actions.has(p.sentence.key), `seed ${seed}: ${p.sentence.key} is an action word`);
  }
  // Given the episode's own pads, a `both` word off them can be a key word.
  const keys = new Set<string>();
  for (let seed = 1; seed <= 300; seed++) for (const p of sentencePlans(new ProgressStore(memory()), { ...input(), moveWords: ['zap'] }, seeded(seed))) keys.add(p.sentence.key);
  assert.ok([...keys].some((k) => actions.has(k)), `no both word came up: ${[...keys].join(' ')}`);
});
