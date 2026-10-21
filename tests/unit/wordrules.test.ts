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
import { distractorsFor, withStems } from '../../src/rules/bank';
import { GESTURE_WORDS, gestureWords, planCharge } from '../../src/rules/charge';
import { MINIGAME_BY_ID, SENTENCE_GAMES } from '../../src/rules/minigames';
import { drawGift, drawMove } from '../../src/rules/moves';
import { BAG_WORDS, NO_ARTICLE, drawKey, episodePlans, saidEarly, type EpisodeInput } from '../../src/rules/sentences';
import { ProgressStore, type StorageLike } from '../../src/state/ProgressStore';
import { spread } from './seeds';

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

test('withStems (item 071, M16): a LOLLIPOP says POP', () => {
  if (BANK_BY_WORD.pop) assert.ok(withStems(['lollipop']).includes('pop'));
});

test("the runes' gestures (items 071, 074): what they say counts as said only once played, so Charge never spells a word its gestures say before a word she reads later", () => {
  // The /e/ rune's "Tap the egg, crack it open".
  for (const w of ['tap', 'egg']) if (BANK_BY_WORD[w]) assert.ok(gestureWords(['e']).includes(w), w);
  // No gesture says LIPS, LICK or POP any more (the /l/ rune sings la, la, la).
  for (const w of ['lips', 'lick', 'pop']) assert.ok(!GESTURE_WORDS.includes(w), w);
  const store = new ProgressStore(memory());
  // Spread seeds: this LCG's first draw barely moves over seeds 1 to 200.
  const seen = new Set<string>();
  for (let seed = 1; seed <= 200; seed++) {
    const free = planCharge(store, { avoid: [] }, seeded(spread(seed)));
    assert.ok(!gestureWords(free.runes).includes(free.word), `${free.word}'s own gesture says it`);
    seen.add(free.runes.includes('e') ? 'e' : '-');
    // TAP read later (a pad, a key): no /e/ word, whose gesture would say TAP first.
    const c = planCharge(store, { avoid: [], later: ['tap'] }, seeded(spread(seed)));
    assert.ok(!gestureWords(c.runes).includes('tap'), `${c.word} says TAP before it is read`);
  }
  assert.ok(seen.has('e'), 'with nothing read later, an /e/ word is still drawn');
});

test('the runes\' gestures (item 074): TAP and EGG are words like any other, but no key drawn after an /e/ Charge word is one', () => {
  const store = new ProgressStore(memory());
  const input = (games: EpisodeInput['games']): EpisodeInput => ({ fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', games });
  const sentence = SENTENCE_GAMES.find((g) => g.slots.includes('fetch'))!;
  const counter = SENTENCE_GAMES.find((g) => g.slots.includes('counter'))!;
  let eWords = 0;
  for (let seed = 1; seed <= 150; seed++) {
    const plans = episodePlans(store, input([MINIGAME_BY_ID.charge!, sentence, counter]), seeded(spread(seed)));
    const charge = plans[0];
    if (charge.kind !== 'charge') throw new Error('door a is Charge');
    const said = gestureWords(charge.charge.runes);
    if (said.length) eWords++;
    for (const p of plans.slice(1)) for (const w of [p.key, ...p.fetches]) assert.ok(!said.includes(w), `${w} after ${charge.key}'s gestures`);
  }
  assert.ok(eWords > 0, 'some seeds spell an /e/ word');
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
