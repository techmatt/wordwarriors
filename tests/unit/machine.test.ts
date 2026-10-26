/**
 * Item 026: the word machine's families and rounds, its place in the pool and
 * the room plans, and its lines under the speech rule.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BANK, BANK_BY_WORD } from '../../content/phonics/bank';
import { FAMILIES, FAMILY_BY_RIME, FAMILY_WORDS, onsetOf, rimeOf, sillyWord } from '../../content/phonics/families';
import { FETCH_BY_WORD } from '../../content/phonics/sentences';
import { MOVE_WORDS } from '../../content/battle/roster';
import { PICTURE_WORDS } from '../../content/phonics/words';
import { narratorLine, rimeLine, sillyLine } from '../../content/voice/ids';
import { NARRATOR_LINES } from '../../content/voice/script';
import { WORD_MACHINE } from '../../src/config';
import { MINIGAMES, MINIGAME_BY_ID, SENTENCE_GAMES, WORD_MACHINE_GAME, drawGames } from '../../src/rules/minigames';
import { episodePlans, type EpisodeInput } from '../../src/rules/rooms';
import { machineWords, planMachine } from '../../src/rules/wordMachine';
import { ProgressStore } from '../../src/state/ProgressStore';
import { composeLines } from '../../tools/voice/compose';
import { memory, seededLcg as seeded, spread } from './seeds';

const INPUT: EpisodeInput = {
  fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' },
  ally: 'ellie',
  gift: 'pop',
  rooms: ['kitchen', 'garage'],
  counterRoom: 'attic',
};

test('families: every bank rime in RIMES with two or more one-letter-onset words; make mode builds only the pictured ones', () => {
  const pictured = new Set(PICTURE_WORDS.filter((w) => w.decodable).map((w) => w.word));
  // Item 037: the bank's new rimes joined 035's seven. Item 040: a family needs two
  // familiar pictures, so -AM -EG -IG -IN -OD -OP -UB -UT left (WIG, PEG, ROD... are odd).
  // Item 043: PIN is familiar again, so -IN (PIN BIN) is back; -IG still has only PIG.
  // Item 056: -ING -OCK (KING RING WING, ROCK SOCK LOCK). Item 157: -UB (TUB CUB) and -UT (NUT HUT) are back.
  assert.deepEqual(FAMILIES.map((f) => f.rime).sort(), ['am', 'an', 'ap', 'at', 'en', 'et', 'ing', 'ock', 'og', 'ox', 'ub', 'ug', 'un', 'ut']);
  for (const f of FAMILIES) {
    assert.ok(f.all.length >= 2, `${f.rime} has ${f.all.join(', ')}`);
    assert.ok(f.words.length >= 2, `${f.rime} has two pictures to build: ${f.words.join(', ')}`);
    for (const w of f.all) {
      assert.equal(BANK_BY_WORD[w]!.onset.length, 1, `${w} has a one-letter onset`);
      assert.equal(rimeOf(w), f.rime);
    }
    for (const w of f.words) {
      assert.ok(f.all.includes(w));
      assert.ok(pictured.has(w), `${w} is a pictured word`);
      assert.ok(FETCH_BY_WORD[w], `${w} is a battle item`);
    }
  }
  // Item 054's MAT joined -AT by itself; item 127 stored MAT and RAT, and JUG and MUG.
  assert.deepEqual(FAMILY_BY_RIME.at!.words.sort(), ['bat', 'cat', 'hat']);
  assert.deepEqual(FAMILY_BY_RIME.ug!.words.sort(), ['bug', 'rug']);
  assert.deepEqual(FAMILY_BY_RIME.ug!.all.sort(), ['bug', 'hug', 'jug', 'mug', 'rug', 'tug']);
  // A blend or digraph onset is not one tile: SLUG and PLUG are not -UG's, CHOP not -OP's.
  assert.ok(!FAMILY_BY_RIME.ug!.all.includes('slug'));
  assert.ok(!FAMILY_BY_RIME.og!.all.includes('chop'));
});

test('silly onsets make nonsense: no bank word, no move word, never the family\'s own onsets, nothing on the block list', () => {
  // Every word the bank has, from any rime: no silly word may be one of them.
  const real = new Set<string>([...BANK.map((w) => w.word), ...PICTURE_WORDS.map((w) => w.word), ...MOVE_WORDS]);
  // Real words, names, homophones and slurs a careless list could make; none may be a silly word.
  const blocked = [
    'zap', 'yap', 'jap', 'fap', 'dap', 'bap', 'wap', 'zen', 'yen', 'fen', 'wen', 'sen', 'jen', 'ken', 'ben', 'len', 'ren', 'den', 'ten', 'men',
    'jan', 'dan', 'nan', 'han', 'yan', 'gan', 'kan', 'wan', 'kat', 'nat', 'wat', 'gat', 'jat', 'vat', 'fat', 'yet', 'fet', 'ret', 'het',
    'fog', 'hog', 'jog', 'bog', 'cog', 'kog', 'nog', 'pog', 'tog', 'gog', 'vog', 'zog', 'mog', 'wog', 'set', 'get', 'let', 'met', 'pet', 'vet', 'wet',
    'dug', 'lug', 'pug', 'vug', 'fug', 'hug', 'tug', 'nug', 'zug', 'cug', 'gug', 'sug',
    // Item 037's rimes.
    'nig', 'big', 'dig', 'gig', 'jig', 'rig', 'zig', 'cig', 'mig', 'tig', 'lig', 'sig', 'vig', 'yig',
    'bin', 'din', 'gin', 'kin', 'sin', 'tin', 'win', 'yin', 'jin', 'lin', 'rin', 'min', 'vin', 'zin', 'cin',
    'beg', 'keg', 'meg', 'reg', 'veg', 'neg', 'feg', 'deg', 'geg',
    'bam', 'cam', 'dam', 'ham', 'lam', 'tam', 'yam', 'pam', 'sam', 'gam', 'fam', 'nam', 'kam',
    'wop', 'vop', 'bop', 'hop', 'pop', 'cop', 'lop', 'sop', 'fop', 'kop', 'gop', 'dop',
    'jox', 'nox', 'rox', 'mox', 'hox', 'dox', 'kox', 'lox', 'pox', 'sox', 'vox', 'cox', 'tox',
    'cod', 'god', 'hod', 'nod', 'sod', 'tod', 'bod', 'mod', 'kod', 'zod', 'yod', 'lod', 'vod', 'wod',
    'run', 'dun', 'fun', 'gun', 'nun', 'pun', 'tun', 'hun', 'jun', 'yun', 'kun', 'mun', 'wun', 'lun',
    'but', 'cut', 'gut', 'jut', 'put', 'rut', 'tut', 'mut', 'kut', 'wut', 'zut', 'yut', 'fut', 'sut',
    'cub', 'dub', 'hub', 'nub', 'pub', 'rub', 'bub', 'lub', 'yub', 'gub', 'wub',
  ];
  for (const f of FAMILIES) {
    assert.ok(f.silly.length >= 1, `${f.rime} has a silly tile`);
    for (const s of f.silly) {
      const w = sillyWord(s.letter, f.rime);
      assert.ok(!real.has(w), `${w} is a real word in the game`);
      assert.ok(!blocked.includes(w), `${w} is blocked`);
      assert.ok(!f.all.some((x) => onsetOf(x) === s.letter), `${w}: ${s.letter} is a real onset of -${f.rime}`);
    }
  }
});

test('planMachine: several words of one family, then another; tiles are the right one and silly ones', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const store = new ProgressStore(memory());
    const plan = planMachine(store, { avoid: ['can'] }, seeded(spread(seed)));
    const words = machineWords(plan);
    assert.equal(plan.mode, 'make');
    assert.equal(words.length, WORD_MACHINE.rounds, `seed ${seed}: ${words.join(' ')}`);
    assert.equal(new Set(words).size, words.length);
    assert.ok(!words.includes('can'), 'never an avoided word');
    const rimes = words.map(rimeOf);
    assert.equal(rimes[0], rimes[1], 'at least two of the first family');
    const firstRun = rimes.findIndex((r) => r !== rimes[0]);
    assert.ok(firstRun === -1 || firstRun <= WORD_MACHINE.perFamily, `no more than ${WORD_MACHINE.perFamily} of the first family`);
    assert.ok(firstRun > 0, `seed ${seed}: switches family (${rimes.join(' ')})`);
    for (const r of plan.rounds) {
      // Three tiles, or two where the family has only one clean silly onset (-AP).
      assert.equal(r.tiles.length, Math.min(WORD_MACHINE.tiles, 1 + FAMILY_BY_RIME[r.rime]!.silly.length));
      assert.equal(r.tiles.filter((t) => t.makes === r.word && t.real).length, 1);
      assert.equal(new Set(r.tiles.map((t) => t.letter)).size, r.tiles.length);
      for (const t of r.tiles.filter((x) => x.makes !== r.word)) assert.equal(t.real, false);
    }
  }
});

test('planMachine leans to shaky families and shaky first sounds, and keeps to the bag', () => {
  let og = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const store = new ProgressStore(memory());
    // Every rime solid but -OG.
    for (const f of FAMILIES) for (let i = 0; i < 4; i++) store.record('rimes', f.rime, f.rime !== 'og', 0);
    if (rimeOf(machineWords(planMachine(store, { avoid: [] }, seeded(spread(seed))))[0]!) === 'og') og++;
  }
  assert.ok(og > 200 / FAMILIES.length * 2, `the shaky family came first ${og}/200`);

  // A bag without -AT: no AT word unless the bag has to refill.
  const store = new ProgressStore(memory());
  store.refillBag(FAMILY_WORDS.filter((w) => rimeOf(w) !== 'at'));
  for (let seed = 1; seed <= 30; seed++) assert.ok(!machineWords(planMachine(store, { avoid: [] }, seeded(spread(seed)))).some((w) => rimeOf(w) === 'at'));
});

test('planMachine never starts a new round of the shared bag while other words are still in it', () => {
  const store = new ProgressStore(memory());
  // One word left per family, and sentence words still to come.
  store.refillBag(['rat', 'can', 'cap', 'pen', 'jet', 'log', 'sun', 'fox', 'bug']);
  const round = store.bag().round;
  const plan = planMachine(store, { avoid: [] }, seeded(3));
  assert.equal(machineWords(plan).length, WORD_MACHINE.rounds, 'still a full visit, from outside the bag');
  assert.equal(store.bag().round, round, 'no refill');
  assert.ok(store.bag().left.includes('sun'));
  // An empty bag refills.
  const empty = new ProgressStore(memory());
  planMachine(empty, { avoid: [] }, seeded(3));
  assert.equal(empty.bag().round, 1);
});

test('the pool: the machine is a fetch game, drawn about every other episode, never the counter', () => {
  assert.equal(MINIGAME_BY_ID.word_machine, WORD_MACHINE_GAME);
  assert.deepEqual(WORD_MACHINE_GAME.slots, ['fetch']);
  assert.ok(!SENTENCE_GAMES.includes(WORD_MACHINE_GAME));
  const store = new ProgressStore(memory());
  const rand = seeded(5);
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const games = drawGames(store, rand);
    assert.notEqual(games[2].id, 'word_machine');
    if (games.slice(0, 2).some((g) => g.kind === 'machine')) n++;
  }
  assert.ok(n > 120 && n < 300, `machine drawn in ${n}/400 episodes`);
  // The word machine, Charge the Spell (item 053), the Stretchy Bridge (item 054), the Shape-Shifter (item 096) and the rhyme room (item 139).
  assert.equal(MINIGAMES.length, SENTENCE_GAMES.length + 5);
});

test('episodePlans with the machine: its words are the room\'s fetches, kept out of every other room and the counter', () => {
  const machineGame = WORD_MACHINE_GAME;
  for (let seed = 1; seed <= 80; seed++) {
    const store = new ProgressStore(memory());
    const fetchSentence = SENTENCE_GAMES.find((g) => g.slots.includes('fetch'))!;
    const counter = SENTENCE_GAMES.find((g) => g.slots.includes('counter'))!;
    const plans = episodePlans(store, { ...INPUT, games: [machineGame, fetchSentence, counter] }, seeded(spread(seed)));
    const [a, b, c] = plans;
    assert.equal(a.kind, 'machine');
    assert.equal(a.scene, 'WordMachine');
    if (a.kind !== 'machine' || b.kind !== 'sentence' || c.kind !== 'sentence') throw new Error('kinds');
    assert.deepEqual(a.fetches, machineWords(a.machine));
    assert.equal(a.key, a.fetches.at(-1));
    assert.ok(!a.fetches.includes(b.key), `${b.key} is the machine's`);
    assert.ok(!a.fetches.includes(c.key), `the counter ${c.key} is the machine's`);
    for (const p of [b, c]) for (const o of p.objects) if (o !== p.key) assert.ok(!a.fetches.includes(o), `${o}: a machine word as a wrong picture`);
    // The sentence rooms' own words are never machine words (WE CAN USE THE: no CAN).
    const shown = [...b.sentence.tokens, ...c.sentence.tokens].map((t) => t.toLowerCase());
    for (const w of a.fetches) assert.ok(!shown.includes(w), `${w} is shown in a sentence`);
    assert.ok(!a.fetches.includes('pop'), 'not the gift word');
  }
});

test('voice: rime and silly lines exist for every family; no machine narrator line says a word the machine builds', () => {
  const ids = new Set(composeLines().map((l) => l.id));
  for (const f of FAMILIES) {
    assert.ok(ids.has(rimeLine(f.rime)), rimeLine(f.rime));
    for (const s of f.silly) assert.ok(ids.has(sillyLine(sillyWord(s.letter, f.rime))));
  }
  const keys = ['machine_intro', 'machine_go', 'machine_change', 'machine_switch', 'machine_makes', 'machine_silly_1', 'machine_silly_2', 'machine_silly_3', 'machine_done'];
  for (const k of keys) {
    const t = NARRATOR_LINES.find((l) => l.key === k);
    assert.ok(t, k);
    assert.ok(ids.has(narratorLine('ellie', k)), `${k} composed for Ellie`);
    const words = `${t.text} ${t.say ?? ''}`.toLowerCase().split(/[^a-z]+/);
    for (const w of FAMILY_WORDS) assert.ok(!words.includes(w), `${k} says ${w}`);
  }
});
