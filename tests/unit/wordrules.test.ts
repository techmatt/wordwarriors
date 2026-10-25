/**
 * Word rules across the draws (item 039's bug hunt, kept fixed): every level in play (item 067), no
 * "A" frame before a vowel, other pictures start with another sound, stems count as said, and no
 * fight style floats a bank word. `npx tsx --test tests/unit/wordrules.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

import { MOVE_WORDS } from '../../content/battle/roster';
import { BANK, BANK_BY_WORD } from '../../content/phonics/bank';
import { FRAMES, NO_ARTICLE, NO_BAG_COPY, NOT_FETCHED, NUMBER_WORDS } from '../../content/phonics/sentences';
import { BAG_WORDS, distractorsFor, drawKey, withStems } from '../../src/rules/bank';
import { RUNE_BY_SOUND } from '../../content/phonics/runes';
import { CHARGE_WORDS, GESTURE_WORDS, chargeRunes, drawChargeWord, gestureWords } from '../../src/rules/charge';
import { MINIGAME_BY_ID, SENTENCE_GAMES } from '../../src/rules/minigames';
import { drawGift, drawMove } from '../../src/rules/moves';
import { episodePlans, type EpisodeInput } from '../../src/rules/rooms';
import { distractors, saidEarly } from '../../src/rules/sentences';
import { ProgressStore } from '../../src/state/ProgressStore';
import { memory, seededLcg as seeded, spread } from './seeds';

const level = (w: string) => BANK_BY_WORD[w]?.level ?? 1;

test('every level is in play (item 067): a fresh store\'s bag of only digraph words draws them, the gift, the moves and the keys alike', () => {
  const store = new ProgressStore(memory());
  const digraphActions = MOVE_WORDS.filter((w) => level(w) === 3);
  const digraphThings = BAG_WORDS.filter((w) => level(w) === 3);
  assert.ok(digraphActions.length && digraphThings.length);
  store.refillBag(digraphActions, 'moves');
  store.refillBag(digraphThings);
  for (let seed = 1; seed <= 30; seed++) assert.equal(level(drawKey(store, BAG_WORDS, seeded(spread(seed)))), 3, 'the key bag of digraph words is drawn from, not spent');
  // The gift and the moves: blends and digraphs from a fresh store (her move bag takes back every unread move word, `topUpMoves`).
  const rand = seeded(11);
  const levels = { gift: new Set<number>(), move: new Set<number>() };
  for (let i = 0; i < 300; i++) {
    const s = new ProgressStore(memory());
    levels.gift.add(level(drawGift(s, { helper: 'ellie' }, rand)));
    levels.move.add(level(drawMove(s, MOVE_WORDS, rand)));
  }
  const above1 = (xs: Set<number>) => [...xs].some((l) => l > 1);
  assert.ok(above1(levels.gift) && above1(levels.move), `gift ${[...levels.gift]}, move ${[...levels.move]}`);
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
      gift: 'zap',
      rooms: ['kitchen', 'garage'],
      counterRoom: 'attic',
      games: [g('we_need_a'), g('helper_needs_a'), g('runs_from_the')],
    };
    for (const p of episodePlans(store, input, seeded(spread(seed)))) {
      if (p.kind !== 'sentence') continue;
      const t = p.sentence.tokens;
      assert.ok(!(t.at(-2) === 'A' && /^[AEIOU]/.test(t.at(-1)!)), t.join(' '));
      // Nor a word that takes no "A" (item 069: SCAR NEEDS A CHEESE).
      assert.ok(!(t.at(-2) === 'A' && NO_ARTICLE.has(t.at(-1)!.toLowerCase())), t.join(' '));
    }
  }
});

test('no number word in an "A" frame (WE NEED A THREE) nor in a frame where it reads wrong (TIAMAT HIDES FROM THE THREE): M23', () => {
  // Every bank thing named for a number is in NUMBER_WORDS.
  const names = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'zero'];
  for (const w of BANK) if (names.includes(w.word)) assert.ok(NUMBER_WORDS.has(w.word), w.word);
  assert.ok([...NUMBER_WORDS].every((w) => BAG_WORDS.includes(w)), 'every number word is a key word somewhere');
  const g = (id: string) => MINIGAME_BY_ID[`sentence:${id}`]!;
  const aFrames = FRAMES.filter((f) => / A \{x\}$/.test(f.text));
  assert.ok(aFrames.length >= 2 && aFrames.every((f) => !f.numbers), 'an "A" frame never takes numbers');
  const fetch = FRAMES.filter((f) => f.use === 'fetch');
  const counter = FRAMES.filter((f) => f.use === 'counter');
  const seen = { numbersFrame: 0 };
  for (let seed = 1; seed <= 120; seed++) {
    // A key bag of only number words, so any frame that would take one draws it.
    const store = new ProgressStore(memory());
    store.refillBag([...NUMBER_WORDS]);
    const a = fetch[seed % fetch.length]!;
    const b = fetch[(seed + 1 + Math.floor(seed / fetch.length)) % fetch.length]!;
    const games = [g(a.id), g(b === a ? fetch[(seed + 2) % fetch.length]!.id : b.id), g(counter[seed % counter.length]!.id)] as EpisodeInput['games'];
    const input: EpisodeInput = { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', games };
    for (const p of episodePlans(store, input, seeded(spread(seed)))) {
      if (p.kind !== 'sentence') continue;
      const t = p.sentence.tokens;
      const frame = FRAMES.find((f) => f.id === p.sentence.frame)!;
      if (!NUMBER_WORDS.has(p.key)) continue;
      assert.notEqual(t.at(-2), 'A', t.join(' '));
      assert.ok(frame.numbers, `${t.join(' ')}: ${frame.id} does not take numbers`);
      seen.numbersFrame++;
    }
  }
  // The test bites: the frames that take numbers do draw them from this bag.
  assert.ok(seen.numbersFrame > 20, `${seen.numbersFrame} number keys in the frames that take them`);
});

test("a frame's own ruled-out key words (hunt 10, M49): never SMAUG RAN AWAY FROM THE ZOO, while another counter frame still draws ZOO", () => {
  const g = (id: string) => MINIGAME_BY_ID[`sentence:${id}`]!;
  const drawn = { ran: 0, other: 0 };
  for (let seed = 1; seed <= 60; seed++) {
    const store = new ProgressStore(memory());
    store.refillBag(['zoo', 'cat', 'pig', 'hen', 'cup', 'map']);
    for (const counter of ['ran_away_from_the', 'hides_from_the']) {
      const games = [g('we_can_use_the'), g('go_get_the'), g(counter)] as EpisodeInput['games'];
      const input: EpisodeInput = { fill: { villain: 'smaug', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', games };
      const p = episodePlans(store, input, seeded(spread(seed)))[2];
      if (p.key !== 'zoo') continue;
      if (counter === 'ran_away_from_the') drawn.ran++;
      else drawn.other++;
    }
  }
  assert.equal(drawn.ran, 0, 'RAN AWAY FROM THE ZOO');
  assert.ok(drawn.other > 0, 'the test bites: HIDES FROM THE draws ZOO from this bag');
});

test('NOT_FETCHED (hunt 10, M53): ZOO and HAND are never a fetch key word, but a counter frame still draws them; every NO_BAG_COPY word is in NOT_FETCHED (M45)', () => {
  assert.deepEqual([...NOT_FETCHED].sort(), ['dad', 'hand', 'mom', 'zoo']);
  assert.deepEqual([...NO_BAG_COPY].sort(), ['dad', 'mom']);
  for (const w of NO_BAG_COPY) assert.ok(NOT_FETCHED.has(w), w);
  const g = (id: string) => MINIGAME_BY_ID[`sentence:${id}`]!;
  const counter = new Set<string>();
  for (let seed = 1; seed <= 200; seed++) {
    const store = new ProgressStore(memory());
    const bag = ['zoo', 'hand', 'cup', 'map', 'sun', 'bus', 'log', 'pot'];
    store.refillBag(bag);
    const games = [g('we_can_use_the'), g('helper_needs_a'), g('scared_of_the')] as EpisodeInput['games'];
    const input: EpisodeInput = { fill: { villain: 'tiamat', helper: 'seraphina', hero: 'julia' }, ally: 'seraphina', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', games };
    const plans = episodePlans(store, input, seeded(spread(seed)));
    // The test bites: the fetch keys come out of this bag, so ZOO and HAND were in reach.
    for (const p of plans.slice(0, 2)) assert.ok(bag.slice(2).includes(p.key), `seed ${seed}: ${p.slot} ${p.key}`);
    counter.add(plans[2]!.key);
  }
  assert.ok(counter.has('zoo') || counter.has('hand'), `the counter still draws them (${[...counter].join(' ')})`);
});

test('a new word\'s other pictures start with another sound: no KIT beside CAT, no CAT beside KIT', () => {
  const store = new ProgressStore(memory());
  const pool = BAG_WORDS;
  for (let seed = 1; seed <= 400; seed++) {
    for (const d of distractorsFor(store, 'cat', pool, 2, seeded(spread(seed)))) assert.ok(!d.startsWith('k'), `cat beside ${d}`);
    for (const d of distractorsFor(store, 'kit', pool, 2, seeded(spread(seed)))) assert.ok(!(d.startsWith('c') && !d.startsWith('ch')), `kit beside ${d}`);
  }
});

test('withStems: a bank word heard inside a plural, a pet form, an ending or a compound is said; FIND, FIGHT, HATES, KITCHEN, BATTLES and CAPTAIN are not FIN, FIG, HAT, KIT, BAT and CAP', () => {
  const said = withStems(['piggy', 'legs', 'cupcakes', 'pancakes', 'foxes', 'biggest', 'topping', 'yummiest', 'sunshine', 'find', 'fight', 'fighting', 'hates', 'hating', 'kitchen', 'battles', 'captain']);
  for (const w of ['pig', 'leg', 'cup', 'pan', 'fox', 'big', 'top', 'yum', 'sun']) if (BANK_BY_WORD[w]) assert.ok(said.includes(w), w);
  for (const w of ['fin', 'fig', 'hat', 'kit', 'bat', 'cap']) assert.ok(!said.includes(w), w);
});

test("withStems (item 069): a pet form inside a compound (PIGGYBACK: PIG) and a listed compound's second half (DUMBBELL: BELL, BROOMSTICK: STICK); HERSELF, LISTEN, SCARED are not ELF, TEN, RED", () => {
  const said = withStems(['piggyback', 'dumbbell', 'kettlebell', 'broomstick', 'bathtub', 'earrings', 'herself', 'listen', 'scared', 'walking']);
  for (const w of ['pig', 'bell', 'stick', 'tub', 'ring']) if (BANK_BY_WORD[w]) assert.ok(said.includes(w), w);
  for (const w of ['elf', 'ten', 'red', 'king']) assert.ok(!said.includes(w), w);
  // With no ally the helper steps into the combo: its name (PIGGYBACK CHARGE with Dada Jason) is said too.
  assert.ok(withStems(saidEarly({ hero: 'julia', ally: null, villain: 'tiamat', helper: 'dada_jason' })).includes('pig'));
});

test('withStems (hunt 10): CANNOT says CAN, so Evil Bavmorda\'s cackle keeps CAN off the attic once M40 made it readable', () => {
  assert.ok(withStems(['cannot']).includes('can'));
  assert.ok(withStems(saidEarly({ hero: 'julia', ally: 'ellie', villain: 'bavmorda', helper: 'dada_matt' })).includes('can'));
});

test("withStems (hunt 10): Moriarty's CLOCKWORK, COPYCATS and TRAPDOORS say CLOCK, CAT and TRAP", () => {
  const said = withStems(['clockwork', 'copycats', 'trapdoors']);
  for (const w of ['clock', 'cat', 'trap']) if (BANK_BY_WORD[w]) assert.ok(said.includes(w), w);
  const early = withStems(saidEarly({ hero: 'julia', ally: 'moriarty', villain: 'tiamat', helper: 'dada_matt' }));
  for (const w of ['clock', 'cat']) if (BANK_BY_WORD[w]) assert.ok(early.includes(w), w);
});

test('withStems (item 071, M16): a LOLLIPOP says POP', () => {
  if (BANK_BY_WORD.pop) assert.ok(withStems(['lollipop']).includes('pop'));
});

test("the runes' gestures (items 071, 074, 156): what they show counts as shown only once played, so Charge never spells a word its gestures show before a word she reads later", () => {
  // Item 156 (Matt): the /e/ rune's "Tap the egg, crack it open" is not voiced (item 058), so TAP and EGG are read.
  for (const w of ['tap', 'egg']) assert.ok(!GESTURE_WORDS.includes(w), w);
  // Hunt 6: a glyph close to a bank word's picture shows it (/m/'s cake slice, /e/'s hatching chick).
  assert.ok(gestureWords(['m']).includes('cake'));
  assert.ok(gestureWords(['e']).includes('chick'));
  for (const w of ['lips', 'lick', 'pop']) assert.ok(!GESTURE_WORDS.includes(w), w);
  const store = new ProgressStore(memory());
  // Spread seeds: this LCG's first draw barely moves over seeds 1 to 200.
  const seen = new Set<string>();
  for (let seed = 1; seed <= 200; seed++) {
    const free = drawChargeWord(store, { avoid: [] }, seeded(spread(seed)));
    assert.ok(!gestureWords(free.runes).includes(free.word), `${free.word}'s own gesture shows it`);
    seen.add(free.runes.includes('e') ? 'e' : '-');
    // CHICK read later (a pad, a key): no /e/ word, whose gesture would show CHICK first.
    const c = drawChargeWord(store, { avoid: [], later: ['chick'] }, seeded(spread(seed)));
    assert.ok(!gestureWords(c.runes).includes('chick'), `${c.word} shows CHICK before it is read`);
  }
  assert.ok(seen.has('e'), 'with nothing read later, an /e/ word is still drawn');
});

test("the runes' picture letters (item 097): every rune Charge teaches has one, its word starts with the rune's sound, and a bank word among them counts as a gesture word", () => {
  for (const s of new Set(CHARGE_WORDS.flatMap((w) => BANK_BY_WORD[w]!.sounds))) {
    const p = RUNE_BY_SOUND[s]!.picture;
    assert.ok(p, `${s} has no picture letter`);
    assert.ok(p.word.startsWith(s), `${p.word} for ${s}`);
    if (BANK_BY_WORD[p.word]) assert.ok(gestureWords([s]).includes(p.word), p.word);
  }
  assert.ok(gestureWords(['v']).includes('vase'));
  assert.ok(!gestureWords(['m']).includes('vase'));
});

test('the runes\' gestures (item 074): what they show is a word like any other, but no key drawn after a Charge word whose gestures show it is one', () => {
  const store = new ProgressStore(memory());
  const input = (games: EpisodeInput['games']): EpisodeInput => ({ fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', games });
  const sentence = SENTENCE_GAMES.find((g) => g.slots.includes('fetch'))!;
  const counter = SENTENCE_GAMES.find((g) => g.slots.includes('counter'))!;
  let showing = 0;
  for (let seed = 1; seed <= 150; seed++) {
    const plans = episodePlans(store, input([MINIGAME_BY_ID.charge!, sentence, counter]), seeded(spread(seed)));
    const charge = plans[0];
    if (charge.kind !== 'charge') throw new Error('door a is Charge');
    const said = gestureWords(chargeRunes(charge.charge));
    if (said.length) showing++;
    for (const p of plans.slice(1)) for (const w of [p.key, ...p.fetches]) assert.ok(!said.includes(w), `${w} after ${charge.key}'s gestures`);
  }
  assert.ok(showing > 0, 'some seeds spell a word whose gestures show one');
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

test('LEG and SOCK are never beside each other (item 092: LEG\'s picture is a leg in a striped sock and a shoe)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const rand = seeded(spread(seed));
    assert.ok(!distractors(new ProgressStore(memory()), 'sock', rand).includes('leg'), `seed ${seed}: LEG beside SOCK`);
    assert.ok(!distractors(new ProgressStore(memory()), 'leg', rand).includes('sock'), `seed ${seed}: SOCK beside LEG`);
  }
});

test("the villain's named counter word is left for the attic: no side room reads it (item 092: Evil Tiamat's word machine built HAT)", () => {
  const input = (games: EpisodeInput['games']): EpisodeInput => ({ fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', games });
  const sentence = SENTENCE_GAMES.find((g) => g.slots.includes('fetch'))!;
  const counter = SENTENCE_GAMES.find((g) => g.slots.includes('counter'))!;
  for (const a of [MINIGAME_BY_ID.word_machine!, sentence]) {
    for (let seed = 1; seed <= 80; seed++) {
      const plans = episodePlans(new ProgressStore(memory()), input([a, sentence, counter]), seeded(spread(seed)));
      for (const p of plans.slice(0, 2)) assert.ok(!p.fetches.includes('hat'), `seed ${seed}: ${p.kind} reads HAT`);
    }
  }
});
