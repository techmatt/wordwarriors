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
import { CVC_WORDS, WORDS } from '../../content/phonics/words';
import { letterSoundLine, narratorLine, nameLine, tauntLine, ultimateLine, wordLine } from '../../content/voice/ids';
import { NARRATOR_LINES } from '../../content/voice/script';
import { pickWeighted, ProgressStore, STORE_KEY, type StorageLike } from '../../src/state/ProgressStore';
import { blendRound, pictureRound, soundRound } from '../../src/rules/rounds';
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
  for (let i = 0; i < 50; i++) for (const item of soundRound(p, 4, r)) assert.ok(!(item.choices.includes('b') && item.choices.includes('d')));
});

test('roster: every character is complete, good and evil', () => {
  assert.equal(ROSTER.length, 13);
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
    assert.equal(c.counter.words.length, 3);
    for (const w of c.counter.words) assert.match(w, /^[a-z]{2,5}$/, `${c.id} spell word ${w} is short`);
  }
});

test('voice: every line id the game derives exists in lines.json and the manifest', () => {
  const lines = composeLines();
  const ids = new Set(lines.map((l) => l.id));
  const manifest = JSON.parse(readFileSync('public/voice/manifest.json', 'utf8')) as { lines: { id: string }[] };
  const built = new Set(manifest.lines.map((l) => l.id));
  const want: string[] = [];
  for (const l of LETTERS) want.push(letterSoundLine(l.letter));
  for (const w of WORDS) want.push(wordLine(w.word));
  for (const c of ROSTER) {
    for (const w of c.counter.words) want.push(wordLine(w));
    for (const evil of [false, true]) {
      const f = evil ? c.evil : c.good;
      const id = evil ? `${c.id}_evil` : c.id;
      want.push(nameLine(id), ultimateLine(id), ...f.taunts.map((t) => tauntLine(id, t.key)));
    }
    for (const t of NARRATOR_LINES) want.push(narratorLine(c.id, t.key));
    for (const v of ROSTER) want.push(narratorLine(c.id, `alarm_villain_${v.id}`), narratorLine(c.id, `need_item_${v.id}`), narratorLine(c.id, `made_item_${v.id}`));
    for (const h of ROSTER) if (h.id !== c.id) want.push(narratorLine(c.id, `alarm_hero_${h.id}`));
    for (const w of MOVE_WORDS) want.push(narratorLine(c.id, `use_move_${w}`));
  }
  const missing = want.filter((id) => !ids.has(id));
  assert.deepEqual(missing, [], 'composed');
  const unbuilt = want.filter((id) => !built.has(id));
  assert.deepEqual(unbuilt, [], 'built into the manifest (run npm run voice:build)');
  assert.ok(!lines.some((l) => /\b(Ha|Hmph)!/.test(l.text)), 'interjections are SFX, not lines');
});

test('speech rule: no narrator line contains a reading word', () => {
  const readable = new Set(CVC_WORDS.map((w) => w.word));
  for (const t of NARRATOR_LINES) {
    for (const token of t.text.toLowerCase().split(/[^a-z]+/)) assert.ok(!readable.has(token), `"${t.text}" says the reading word "${token}"`);
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
