/**
 * Pure rules, no browser: ProgressStore, round generation, roster and voice
 * data integrity, and the voice tools' align/trim. `npm run test:unit`.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { ART_ASSETS } from '../../content/art/assets';
import { MINIONS, MOVE_WORDS, ROSTER } from '../../content/battle/roster';
import { LETTERS } from '../../content/phonics/letters';
import { FETCH_ITEMS, FRAMES, allFrameTokens, allPrefixes, sentence, tokenWord } from '../../content/phonics/sentences';
import { SPELL_WORDS, spellWordsFor } from '../../content/phonics/spelling';
import { CVC_WORDS, SPECIAL_WORDS, WORDS } from '../../content/phonics/words';
import { WAKERS, letterSoundLine, moveLine, narratorLine, nameLine, tauntLine, ultimateLine, wakeLine, wordLine } from '../../content/voice/ids';
import { CORE_LINES, HERO_LINES, MOVE_LINES, NARRATOR_LINES, VILLAIN_LINES, WAKE_LINES } from '../../content/voice/script';
import { pickWeighted, ProgressStore, STORE_KEY, type StorageLike } from '../../src/state/ProgressStore';
import { blendRound, choiceCount, pictureRound, soundRound } from '../../src/rules/rounds';
import { BAG_WORDS, episodePlans } from '../../src/rules/sentences';
import { align } from '../../tools/voice/align';
import { composeLines } from '../../tools/voice/compose';
import { trimMp3 } from '../../tools/voice/mp3';

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

/** Deterministic rand for repeatable rounds. */
function seeded(seed = 1): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

test('ProgressStore records, persists and survives a corrupt blob', () => {
  const mem = memory();
  const a = new ProgressStore(mem, () => 1000);
  a.record('sounds', 's', true, 0);
  a.record('sounds', 's', false, 2);
  a.record('words', 'cat', true, 0);
  const b = new ProgressStore(mem);
  assert.equal(b.stat('sounds', 's').seen, 2);
  assert.equal(b.stat('sounds', 's').wrong, 2);
  assert.deepEqual(b.stat('sounds', 's').recent, [true, false]);
  assert.equal(b.stat('sounds', 's', 'session').seen, 0, 'session is per page load');

  mem.setItem(STORE_KEY, '{not json');
  const c = new ProgressStore(mem, () => 42);
  assert.equal(c.stat('sounds', 's').seen, 0);
  assert.ok(mem.data.has(`${STORE_KEY}.unreadable.42`), 'the unreadable blob is kept, never deleted');
});

test('shakiness: unseen is fairly shaky, missed is shakier, solid is low', () => {
  const p = new ProgressStore(memory());
  for (let i = 0; i < 4; i++) p.record('sounds', 'm', true, 0);
  for (let i = 0; i < 4; i++) p.record('sounds', 'b', false, 1);
  assert.ok(p.shakiness('sounds', 'b') > p.shakiness('sounds', 'z'));
  assert.ok(p.shakiness('sounds', 'z') > p.shakiness('sounds', 'm'));
});

test('pickWeighted favours heavy ids and never repeats', () => {
  const counts: Record<string, number> = { a: 0, b: 0 };
  const r = seeded(7);
  for (let i = 0; i < 500; i++) counts[pickWeighted(['a', 'b'], (id) => (id === 'a' ? 9 : 1), 1, r)[0]!]!++;
  assert.ok(counts.a! > counts.b! * 4);
  assert.equal(new Set(pickWeighted(['a', 'b', 'c'], () => 1, 3, r)).size, 3);
});

test('rounds: 3–5 items, the target among the choices, choices distinct', () => {
  const p = new ProgressStore(memory());
  const r = seeded(3);
  for (const round of [soundRound(p, 4, r), blendRound(p, 3, r), pictureRound(p, 4, r)]) {
    assert.ok(round.length >= 3 && round.length <= 5);
    for (const item of round) {
      assert.ok(item.choices.includes(item.target));
      assert.equal(new Set(item.choices).size, item.choices.length);
      assert.ok(item.choices.length >= 2 && item.choices.length <= 3);
    }
  }
  // Word to Picture: no two choices share a first letter.
  for (const item of pictureRound(p, 4, r)) assert.equal(new Set(item.choices.map((w) => w[0])).size, item.choices.length);
  // Sound to Letter never offers b and d together.
  for (let i = 0; i < 50; i++) {
    for (const item of soundRound(p, 4, r)) {
      assert.ok(!(item.choices.includes('b') && item.choices.includes('d')));
      assert.ok(!(item.choices.includes('v') && item.choices.includes('w')));
      assert.ok(!(item.choices.includes('c') && item.choices.includes('k')));
    }
  }
});

test('choiceCount drops to two while she is struggling this session', () => {
  const p = new ProgressStore(memory());
  assert.equal(choiceCount(p, 'sounds'), 3);
  for (const l of ['a', 'b', 'c']) p.record('sounds', l, false, 2);
  assert.equal(choiceCount(p, 'sounds'), 2);
  for (const l of ['d', 'e', 'f', 'g']) p.record('sounds', l, true, 0);
  assert.equal(choiceCount(p, 'sounds'), 3);
});

test('roster: every character is complete, good and evil', () => {
  assert.equal(ROSTER.length, 16);
  for (const c of ROSTER) {
    for (const f of [c.good, c.evil]) {
      assert.ok(f.abilities.length >= 3, `${f.displayName} has 3+ abilities`);
      assert.ok(f.taunts.length >= 3, `${f.displayName} has taunts`);
      assert.ok(f.ultimate, `${f.displayName} has an ultimate`);
      for (const ab of [...f.abilities, f.ultimate]) {
        if (ab.minion) assert.ok(MINIONS[ab.minion], `${ab.id} summons a known minion`);
        if (ab.word) assert.ok((MOVE_WORDS as readonly string[]).includes(ab.word), `${ab.id} word ${ab.word} is a move word`);
      }
    }
    assert.ok(c.good.abilities.filter((a) => a.word).length >= 2, `${c.id} offers at least two move words`);
    const spell = SPELL_WORDS[c.id];
    assert.ok(spell, `${c.id} has Spell the Spell words`);
    assert.equal(spell.length, 3);
    for (const w of spell) assert.match(w, /^[a-z]{2,5}$/, `${c.id} spell word ${w} is short`);
  }
});

test('roster: named counter words are pictured, and never in any name, ability, taunt or threat', () => {
  // Item 015 draws the counter word from her word bag; a villain's named
  // counter item is flavour for when the draw lands on its word. Named words
  // still stay out of everything any fighter shows or says (names, ability and
  // ultimate banners, taunts, minion names, the wake-up threat), so the flavour
  // is never ruled out by the villain's own lines.
  const said: string[] = Object.values(MINIONS).map((m) => m.name);
  for (const c of ROSTER) {
    said.push(c.house.threat, c.house.threatSay ?? '');
    for (const f of [c.good, c.evil]) {
      said.push(f.displayName, f.sayName ?? '', f.ultimate.name, ...f.abilities.map((a) => a.name));
      for (const t of f.taunts) said.push(t.text, t.say ?? '');
    }
  }
  const words = (s: string) => s.toLowerCase().split(/[^a-z]+/);
  const pictured = new Set([...CVC_WORDS, ...SPECIAL_WORDS].map((w) => w.word));
  const frameTokens = new Set(allFrameTokens());
  for (const c of ROSTER) {
    const w = c.counter.word;
    assert.ok(pictured.has(w), `${c.id}: counter word ${w} has a picture`);
    assert.ok(!(MOVE_WORDS as readonly string[]).includes(w), `${c.id}: counter word ${w} is a move word`);
    assert.ok(!frameTokens.has(w), `${c.id}: counter word ${w} is a sentence word`);
    for (const s of said) assert.ok(!words(s).includes(w), `${c.id}: counter word ${w} is said in "${s}"`);
  }
});

test('voice: every line id the game derives exists in lines.json and the manifest', () => {
  const lines = composeLines();
  const ids = new Set(lines.map((l) => l.id));
  const manifest = JSON.parse(readFileSync('public/voice-gen/manifest.json', 'utf8')) as { lines: { id: string }[] };
  const built = new Set(manifest.lines.map((l) => l.id));
  const want: string[] = [];
  for (const l of LETTERS) want.push(letterSoundLine(l.letter));
  for (const w of WORDS) want.push(wordLine(w.word));
  for (const c of ROSTER) {
    for (const w of spellWordsFor(c.id)) want.push(wordLine(w));
    for (const evil of [false, true]) {
      const f = evil ? c.evil : c.good;
      const id = evil ? `${c.id}_evil` : c.id;
      want.push(nameLine(id), ultimateLine(id), ...f.taunts.map((t) => tauntLine(id, t.key)));
      want.push(...f.abilities.filter((a) => a.power >= 2).map((a) => moveLine(id, a.id)));
    }
    for (const t of NARRATOR_LINES) want.push(narratorLine(c.id, t.key));
    for (const v of ROSTER) want.push(narratorLine(c.id, `alarm_villain_${v.id}`), narratorLine(c.id, `need_item_${v.id}`), narratorLine(c.id, `made_item_${v.id}`));
    for (const h of ROSTER) if (h.id !== c.id) want.push(narratorLine(c.id, `alarm_hero_${h.id}`));
    for (const w of MOVE_WORDS) want.push(narratorLine(c.id, `use_move_${w}`), narratorLine(c.id, `teach_word_${w}`));
    for (const v of ROSTER) want.push(narratorLine(c.id, `need_counter_${v.id}`), narratorLine(c.id, `got_counter_${v.id}`));
  }
  // The house: wake-ups by both wakers, sentence prefixes, and a word line for every sentence token and key word.
  for (const k of ['teach_1', 'teach_circle', 'teach_done', 'house_doors', 'house_more', 'house_front', 'secret_door', 'house_ready', 'room_listen', 'room_your_turn', 'room_find', 'got_item', 'use_bag', 'got_counter_any']) {
    assert.ok(NARRATOR_LINES.some((t) => t.key === k), `narrator line ${k}`);
  }
  for (const waker of WAKERS) {
    want.push(wakeLine(waker, 'up'), wakeLine(waker, 'door'));
    for (const c of ROSTER) {
      if (c.id !== waker) want.push(wakeLine(waker, `good_${c.id}`), wakeLine(waker, `helper_${c.id}`));
      want.push(wakeLine(waker, `bad_${c.id}`));
    }
  }
  for (const p of allPrefixes()) want.push(p.id);
  for (const t of allFrameTokens()) want.push(wordLine(t));
  for (const f of FETCH_ITEMS) want.push(wordLine(f.word));
  for (const c of ROSTER) want.push(wordLine(c.counter.word));
  for (const w of SPECIAL_WORDS) want.push(wordLine(w.word));
  for (const c of ROSTER) {
    for (const f of FRAMES) {
      const s = sentence(f.id, { villain: c.id, helper: c.id, hero: c.id }, 'net');
      want.push(s.prefixLine, wordLine(s.key), ...s.tokens.map((t) => wordLine(tokenWord(t))));
    }
  }
  assert.equal(new Set(lines.map((l) => l.id)).size, lines.length, 'no two lines share an id');
  const missing = want.filter((id) => !ids.has(id));
  assert.deepEqual(missing, [], 'composed');
  const unbuilt = want.filter((id) => !built.has(id));
  assert.deepEqual(unbuilt, [], 'built into the manifest (run npm run voice:build)');
  assert.ok(!lines.some((l) => /\b(Ha|Hmph)!/.test(l.text)), 'interjections are SFX, not lines');
});

test('speech rule: no narrator line contains a reading word', () => {
  // Reading words: every CVC word and every sentence key word (fetched items, counter words, MICE).
  const keys = new Set<string>([...FETCH_ITEMS.map((f) => f.word), ...BAG_WORDS, ...ROSTER.map((c) => c.counter.word), ...SPECIAL_WORDS.map((w) => w.word)]);
  const readable = new Set<string>([...CVC_WORDS.map((w) => w.word), ...keys]);
  const words = (s: string) => s.toLowerCase().split(/[^a-z]+/);
  // need_item ("Only the {item} CAN stop...") belongs to the parked Spell the
  // Spell flow, where CAN is never a target; rewording it would re-synthesise 169 lines.
  const parked = new Set(['need_item']);
  const templates = [...CORE_LINES, ...NARRATOR_LINES, ...HERO_LINES, ...VILLAIN_LINES, ...MOVE_LINES, ...WAKE_LINES].filter((t) => !parked.has(t.key));
  for (const t of templates) {
    for (const s of [t.text, t.say ?? '']) for (const token of words(s)) assert.ok(!readable.has(token), `"${s}" says the reading word "${token}"`);
  }
  for (const c of ROSTER) {
    for (const s of [c.house.threat, c.house.threatSay ?? '']) {
      for (const token of words(s)) assert.ok(!readable.has(token), `${c.id}'s threat "${s}" says the reading word "${token}"`);
    }
  }
  // A prefix line stops before the key word; it must not say it earlier either
  // (WE CAN USE THE CAN would). Every sentence an episode plans, for every villain.
  const prefixText = new Map(allPrefixes().map((p) => [p.id, `${p.text} ${p.say ?? ''}`]));
  const check = (s: { prefixLine: string; key: string }) => {
    const text = prefixText.get(s.prefixLine);
    assert.ok(text, `prefix line ${s.prefixLine} exists`);
    assert.ok(!words(text).includes(s.key), `"${text}" says its key word "${s.key}"`);
  };
  for (const c of ROSTER) {
    for (const helper of ['elsa', 'ellie', c.id]) {
      const fill = { villain: c.id, helper, hero: 'julia' };
      for (let seed = 1; seed <= 25; seed++) {
        const plans = episodePlans(new ProgressStore(memory()), { fill, ally: helper, spell: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic' }, seeded(seed));
        for (const p of plans) check(p.sentence);
      }
    }
  }
});

test('art: every asset id is unique and has a painted file', () => {
  const ids = ART_ASSETS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(readFileSync(`public/art/${id}.png`).length > 100, id);
});

test('align splits a merged two-word boundary and stays strict otherwise', () => {
  const words = align('Dragon Parade!', [{ word: 'Dragon Parade', start: 0.1, end: 1.1 }]);
  assert.equal(words.length, 2);
  assert.equal(words[0]!.word, 'Dragon');
  assert.ok(Math.abs(words[1]!.end - 1.1) < 1e-9);
  assert.throws(() => align('Big cat', [{ word: 'Big', start: 0, end: 1 }]));
});

test('trimMp3 cuts whole frames after the given time', () => {
  // A fake MPEG-2 Layer III 48 kbps 24 kHz stream: 144-byte frames of 24 ms.
  const frame = new Uint8Array(144);
  frame.set([0xff, 0xf3, 0x64, 0xc4]);
  const stream = new Uint8Array(144 * 100);
  for (let i = 0; i < 100; i++) stream.set(frame, i * 144);
  const cut = trimMp3(stream, 0.5);
  assert.equal(cut.length % 144, 0);
  assert.ok(Math.abs(cut.length / 144 - Math.ceil(0.5 / 0.024)) <= 1);
  assert.equal(trimMp3(new Uint8Array([1, 2, 3, 4]), 0.1).length, 4, 'unparseable input is returned unchanged');
});
