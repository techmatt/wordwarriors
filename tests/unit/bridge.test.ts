/**
 * The Stretchy Bridge's pure rules (item 054): the held-sound cuts, the word
 * draw (every short word in play, a visit's easier words first: `bridgeEase`), the far
 * bank's pictures (sharing the word's start, never only its first letter's
 * rime where the bank has better), the help-level ramp and its store field,
 * and the room's place in the episode.
 * `npx tsx --test tests/unit/bridge.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BANK_BY_WORD, THINGS } from '../../content/phonics/bank';
import { SOUND_BY_UNIT, canHold, heardAs } from '../../content/phonics/letters';
import { lookalikesOf } from '../../content/phonics/sentences';
import { PLACES, SIDE_ROOMS, gapFor } from '../../content/house/house';
import { narratorLine } from '../../content/voice/ids';
import { NARRATOR_LINES } from '../../content/voice/script';
import { CHARACTER_BY_ID, PERSONS } from '../../content/battle/roster';
import { holdPlan, holdSamples } from '../../src/audio/holdSound';
import { BRIDGE } from '../../src/config';
import { stepLevel } from '../../src/rules/difficulty';
import { BRIDGE_PICTURES, CROSS_WORDS, bridgeLevel, bridgePictures, bridgeEase, bridgeWords, planBridge, recordedBridgeLevel, sharedStart, whereDiffers } from '../../src/rules/bridge';
import { grabSays } from '../../src/rules/grab';
import { firstSound } from '../../src/rules/rhyme';
import { BRIDGE_GAME, MINIGAMES, MINIGAME_BY_ID, PHONICS_GAMES, drawGames } from '../../src/rules/minigames';
import { episodePlans } from '../../src/rules/rooms';
import { ProgressStore, STORE_KEY } from '../../src/state/ProgressStore';
import { composeLines } from '../../tools/voice/compose';
import { withDifficulty } from './difficulty';
import { memory, seeded, spread } from './seeds';

// ---- Held sounds ----------------------------------------------------------

const RATE = 24000;
/** A clip from parts: silence, noise (a hiss or burst) and tones (a hum or a vowel), each `[kind, seconds, amplitude, hz]`. */
function clip(...parts: [kind: 'quiet' | 'noise' | 'tone', s: number, amp?: number, hz?: number][]): Float32Array {
  const out: number[] = [];
  let r = 7;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (const [kind, s, amp = 0.3, hz = 140] of parts) {
    const n = Math.round(s * RATE);
    for (let i = 0; i < n; i++) out.push(kind === 'quiet' ? 0 : kind === 'noise' ? amp * rnd() : amp * Math.sin((2 * Math.PI * hz * i) / RATE));
  }
  return Float32Array.from(out);
}
const sec = (samples: number) => samples / RATE;
const near = (a: number, b: number, tol = 0.025) => assert.ok(Math.abs(a - b) <= tol, `${a.toFixed(3)} is not within ${tol} of ${b}`);

test('held sounds: a hiss before a vowel ("Suh") holds the hiss only, stretching it', () => {
  const x = clip(['quiet', 0.25], ['noise', 0.18, 0.08], ['tone', 0.3, 0.5, 160], ['quiet', 0.2]);
  const p = holdPlan(x, RATE, 'hold');
  assert.equal(p.mode, 'hold');
  near(sec(p.start), 0.25);
  near(sec(p.end), 0.43);
  assert.ok(p.steadyStart! > p.start && p.steadyStart! < p.end);
});

test('held sounds: a hum into a schwa ("Mmm" then "uh") holds the hum; a clean recording holds whole', () => {
  // The schwa: louder, and with many more zero crossings than the hum.
  const x = clip(['quiet', 0.25], ['tone', 0.16, 0.25, 110], ['tone', 0.25, 0.4, 900], ['quiet', 0.2]);
  const p = holdPlan(x, RATE, 'hold');
  near(sec(p.start), 0.25);
  near(sec(p.end), 0.41, 0.04);
  // Matt's recording of a bare hum: no schwa to find.
  const m = holdPlan(clip(['quiet', 0.1], ['tone', 0.4, 0.3, 120], ['quiet', 0.1]), RATE, 'hold');
  near(sec(m.end - m.start), 0.4, 0.03);
});

test('held sounds: a stop plays once with no "uh"; a voiced stop keeps its first instant; X keeps its final hiss', () => {
  // T: a burst, then the vowel.
  const t = holdPlan(clip(['quiet', 0.25], ['noise', 0.07, 0.1], ['tone', 0.3, 0.5, 160], ['quiet', 0.2]), RATE, 'once');
  assert.equal(t.mode, 'once');
  near(sec(t.start), 0.25);
  near(sec(t.end), 0.32);
  assert.equal(t.tail, undefined);
  // B: voiced from the first instant.
  const b = holdPlan(clip(['quiet', 0.25], ['tone', 0.35, 0.5, 160], ['quiet', 0.2]), RATE, 'once');
  assert.ok(sec(b.end - b.start) <= 0.1, `B plays ${sec(b.end - b.start)} s`);
  // X ("Kuhs"): the K's burst, then (skipping the vowel) the S.
  const x = holdPlan(clip(['quiet', 0.25], ['noise', 0.06, 0.1], ['tone', 0.25, 0.5, 160], ['noise', 0.2, 0.1], ['quiet', 0.2]), RATE, 'once');
  assert.ok(x.tail, 'X has its final hiss');
  near(sec(x.tail![0]), 0.56);
  const data = holdSamples(clip(['quiet', 0.25], ['noise', 0.06, 0.1], ['tone', 0.25, 0.5, 160], ['noise', 0.2, 0.1], ['quiet', 0.2]), x, RATE);
  assert.equal(data.length, x.end - x.start + x.tail![1] - x.tail![0]);
});

test('held sounds: played once, starting and ending in silence', () => {
  const x = clip(['quiet', 0.2], ['tone', 0.4, 0.3, 120], ['quiet', 0.1]);
  const p = holdPlan(x, RATE, 'hold');
  const data = holdSamples(x, p, RATE);
  assert.ok(Math.abs(data[0]!) < 0.01, 'fades in');
  assert.ok(Math.abs(data[data.length - 1]!) < 0.01, 'fades out');
  // A sound that is all silence plays as it is.
  assert.deepEqual(holdPlan(new Float32Array(4800), RATE, 'hold'), { mode: 'hold', start: 0, end: 4800 });
});

test('held sounds: the cut is the same at 48 kHz as at 24 kHz (the browser decodes at its own rate)', () => {
  // The same sound at twice the rate: linear interpolation keeps its spectrum,
  // as decoding a clip at 48 kHz does. Per-sample crossings would halve (item 057).
  const up = (x: Float32Array) => Float32Array.from({ length: x.length * 2 }, (_, i) => (i % 2 ? (x[(i - 1) / 2]! + (x[(i + 1) / 2] ?? 0)) / 2 : x[i / 2]!));
  const cases: [string, Float32Array, 'hold' | 'once'][] = [
    ['S', clip(['quiet', 0.25], ['noise', 0.18, 0.08], ['tone', 0.3, 0.5, 160], ['quiet', 0.2]), 'hold'],
    ['M', clip(['quiet', 0.25], ['tone', 0.16, 0.25, 110], ['tone', 0.25, 0.4, 900], ['quiet', 0.2]), 'hold'],
    ['T', clip(['quiet', 0.25], ['noise', 0.07, 0.1], ['tone', 0.3, 0.5, 160], ['quiet', 0.2]), 'once'],
    ['CH', clip(['quiet', 0.1], ['noise', 0.25, 0.2], ['quiet', 0.1]), 'once'],
    ['X', clip(['quiet', 0.25], ['noise', 0.06, 0.1], ['tone', 0.25, 0.5, 160], ['noise', 0.2, 0.1], ['quiet', 0.2]), 'once'],
  ];
  // A recorded CH: a hiss of 1.5-5 kHz (about 6,000 crossings a second; 0.25 a
  // sample at 24 kHz but 0.13 at 48 kHz, where 054 took it for a voiced stop).
  const ch = (rate: number) => {
    const tones = Array.from({ length: 40 }, (_, k) => [1500 + ((k * 7919) % 3500), (k * 2.39996) % (2 * Math.PI)] as const);
    const n = Math.round(0.25 * rate);
    const pad = new Array<number>(Math.round(0.1 * rate)).fill(0);
    const hiss = Array.from({ length: n }, (_, i) => (0.04 * tones.reduce((s, [hz, ph]) => s + Math.sin((2 * Math.PI * hz * i) / rate + ph), 0)) / Math.sqrt(tones.length));
    return Float32Array.from([...pad, ...hiss, ...pad]);
  };
  const a = holdPlan(ch(RATE), RATE, 'once');
  const b = holdPlan(ch(RATE * 2), RATE * 2, 'once');
  near(sec(a.end - a.start), 0.25);
  near((b.end - b.start) / (RATE * 2), 0.25);
  for (const [name, x, mode] of cases) {
    const a = holdPlan(x, RATE, mode);
    const b = holdPlan(up(x), RATE * 2, mode);
    assert.equal(b.mode, a.mode, name);
    near(b.start / (RATE * 2), sec(a.start), 0.011);
    near(b.end / (RATE * 2), sec(a.end), 0.021);
    assert.equal(Boolean(b.tail), Boolean(a.tail), `${name}'s tail`);
  }
});

test('held sounds: the vowels, hums and hisses hold; stops, H, W, Y and X play once', () => {
  for (const s of [...'aeioumnlrvzsf', 'sh', 'th', 'long_e', 'long_o']) assert.ok(canHold(s), s);
  for (const s of [...'bcdgkptjhwyxq', 'ch', 'ck']) assert.ok(!canHold(s), s);
  for (const s of Object.keys(SOUND_BY_UNIT)) assert.equal(typeof canHold(s), 'boolean');
});

// ---- The word draw --------------------------------------------------------

test('bridge words: pictured things with a short vowel; tiers are hold-sound CVC, stop CVC, blends and digraphs', () => {
  assert.ok(BRIDGE_PICTURES.length > 50);
  for (const w of BRIDGE_PICTURES) {
    const b = BANK_BY_WORD[w]!;
    assert.ok(THINGS.includes(b) && b.vowel, `${w} is a familiar short-vowel thing`);
  }
  assert.ok(!BRIDGE_PICTURES.includes('key') && !BRIDGE_PICTURES.includes('yak'));
  assert.equal(bridgeEase('map'), 1);
  assert.equal(bridgeEase('sun'), 1);
  assert.equal(bridgeEase('cat'), 2);
  assert.equal(bridgeEase('hat'), 2);
  assert.equal(bridgeEase('frog'), 3);
  assert.equal(bridgeEase('ship'), 3);
  // Item 054's words are in.
  // MAT is stored (item 127: the foam squares read as a puzzle).
  for (const w of ['man', 'lid', 'lock']) assert.ok(BRIDGE_PICTURES.includes(w), w);
  assert.ok(!BRIDGE_PICTURES.includes('mat'));
});

test('bridge draw (item 067): a fresh store crosses any short word, every tier, never one over BRIDGE.maxUnits; the easier tier first', () => {
  for (const w of CROSS_WORDS) assert.ok(BANK_BY_WORD[w]!.units.length <= BRIDGE.maxUnits, w);
  assert.ok(CROSS_WORDS.length > 50);
  const tiersSeen = new Set<number>();
  for (let seed = 1; seed <= 60; seed++) {
    const store = new ProgressStore(memory());
    const plan = planBridge(store, { avoid: [], taken: [] }, seeded(spread(seed)));
    assert.equal(plan.rounds.length, BRIDGE.words);
    assert.equal(new Set(bridgeWords(plan)).size, BRIDGE.words);
    for (const r of plan.rounds) {
      assert.ok(CROSS_WORDS.includes(r.word), `seed ${seed}: ${r.word} is short`);
      tiersSeen.add(bridgeEase(r.word));
    }
    // The easier tier first.
    const tiers = plan.rounds.map((r) => bridgeEase(r.word));
    assert.deepEqual(tiers, [...tiers].sort());
  }
  assert.deepEqual([...tiersSeen].sort(), [1, 2, 3], 'stop-sound words and blends from the first visit');
});

test('bridge help (item 067): held at level 1 at base whatever she has reached; up to the knob above it', () => {
  const store = new ProgressStore(memory());
  store.setBridgeLevel('map', 3);
  assert.equal(recordedBridgeLevel(store, 'map'), 3);
  assert.equal(bridgeLevel(store, 'map'), 1);
  withDifficulty(2, () => assert.equal(bridgeLevel(store, 'map'), 2));
  withDifficulty(3, () => assert.equal(bridgeLevel(store, 'map'), 3));
});

test('bridge draw (hunt 10): every crossing has a far-bank picture sharing its first sound (THUMB had none), and no wrong picture stands on two crossings of a visit (SIX stood on three)', () => {
  for (let seed = 1; seed <= 80; seed++) {
    const plan = planBridge(new ProgressStore(memory()), { avoid: [], taken: [] }, seeded(spread(seed)));
    const wrong = new Set<string>();
    for (const r of plan.rounds) {
      const others = r.pictures.filter((p) => p !== r.word);
      assert.ok(others.some((p) => sharedStart(r.word, p) >= 1), `seed ${seed}: ${r.word} beside ${others.join(' ')}`);
      // Again only as the first-sound picture it needs (CHIPS beside CHICK and CHIN).
      for (const p of others) assert.ok(!wrong.has(p) || sharedStart(r.word, p) >= 1, `seed ${seed}: ${p} again beside ${r.word}`);
      for (const p of others) wrong.add(p);
    }
  }
});

test('bridge draw: never a word the episode says, shows or has planned elsewhere', () => {
  const avoid = ['map', 'mop', 'mug', 'sun', 'six', 'fan', 'fox'];
  for (let seed = 1; seed <= 30; seed++) {
    const plan = planBridge(new ProgressStore(memory()), { avoid, taken: ['log', 'leg'] }, seeded(spread(seed)));
    for (const r of plan.rounds) {
      assert.ok(!avoid.includes(r.word) && !['log', 'leg'].includes(r.word), r.word);
      for (const p of r.pictures) assert.ok(!avoid.includes(p) && !['log', 'leg'].includes(p), `${r.word}'s picture ${p}`);
    }
  }
});

test('the one hard-C/K rule (heardAs, item 159): C and CK are K, nothing else folds, BELT and BELL stay apart', () => {
  assert.deepEqual(['c', 'ck', 'k', 'ch', 'l', 'll', 'q', 'qu'].map(heardAs), ['k', 'k', 'k', 'ch', 'l', 'll', 'q', 'qu']);
  const heard = (w: string) => BANK_BY_WORD[w]!.sounds.filter(Boolean).map(heardAs).join(' ');
  assert.equal(heard('belt'), 'b e l t');
  assert.equal(heard('bell'), 'b e l');
  assert.notEqual(heard('belt'), heard('bell'));
  // Every site keeps them apart: the bridge shares three sounds, short of the whole of BELT...
  assert.equal(sharedStart('belt', 'bell'), 3);
  assert.ok(!bridgePictures('bell', 3, seeded(1), [], ['belt', 'bed', 'bug', 'ten', 'map']).includes('belt'), 'BELL: BELT is the word plus a sound (fix 59)');
  // ...the hall hears BELL inside BELT, not BELT inside BELL...
  assert.ok(grabSays('belt').includes('bell'));
  assert.ok(!grabSays('bell').includes('belt'));
  // ...and CAT, KING and DUCK's CK fold where they should.
  assert.equal(firstSound('cat'), firstSound('king'));
  assert.equal(sharedStart('cat', 'kit'), 1);
});

// ---- The far bank -----------------------------------------------------------

test("far bank: the pictures share the word's start and differ later, never only its first letter's rime where the bank has better", () => {
  assert.equal(sharedStart('map', 'mat'), 2);
  assert.equal(sharedStart('map', 'mop'), 1);
  assert.equal(sharedStart('cat', 'kit'), 1, 'a hard C is K');
  assert.equal(sharedStart('cat', 'hat'), 0);
  for (let seed = 1; seed <= 20; seed++) {
    // MAP: MAT and MAN (item 054) share M-A.
    const map = bridgePictures('map', 2, seeded(spread(seed)));
    for (const p of map) assert.ok(sharedStart('map', p) >= 2, `MAP beside ${p}`);
    // LIP: LID shares L-I, then an L word.
    const lip = bridgePictures('lip', 2, seeded(spread(seed)));
    assert.ok(lip.includes('lid'), `LIP beside ${lip}`);
    for (const p of lip) assert.ok(sharedStart('lip', p) >= 1);
  }
  for (const w of BRIDGE_PICTURES) {
    const pics = bridgePictures(w, BRIDGE.pictures - 1, seeded(3));
    assert.equal(pics.length, BRIDGE.pictures - 1, w);
    assert.ok(!pics.includes(w));
    for (const p of pics) assert.ok(!lookalikesOf(w).includes(p), `${w} beside its look-alike ${p}`);
    // Every hold-sound word has a picture that starts like it: the first letter is never enough.
    if (bridgeEase(w) === 1) assert.ok(pics.some((p) => sharedStart(w, p) >= 1), `${w}: ${pics}`);
  }
  // Never the word plus a sound (item 069): beside TEN, TENT had every one of TEN's stones, so a miss on it lit a stone they share.
  for (const w of BRIDGE_PICTURES) {
    for (let seed = 1; seed <= 5; seed++) {
      for (const p of bridgePictures(w, BRIDGE.pictures - 1, seeded(spread(seed)))) {
        assert.ok(sharedStart(w, p) < BANK_BY_WORD[w]!.sounds.length, `${w} beside ${p}`);
        const d = whereDiffers(w, p);
        assert.notEqual(BANK_BY_WORD[p]!.sounds[d.index], d.sound, `${w} vs ${p}: the stone shown is one they share`);
      }
    }
  }
  // The plan's pictures hold the word itself, the others in the room's order.
  const plan = planBridge(new ProgressStore(memory()), { avoid: [], taken: [] }, seeded(9));
  for (const r of plan.rounds) {
    assert.equal(r.pictures.length, BRIDGE.pictures);
    assert.ok(r.pictures.includes(r.word));
    assert.deepEqual(r.units, BANK_BY_WORD[r.word]!.units);
  }
});

test('a wrong pick: where the bridge differs, start, middle or end, and its sound there', () => {
  assert.deepEqual(whereDiffers('mat', 'map'), { where: 'end', index: 2, sound: 't' });
  assert.deepEqual(whereDiffers('map', 'mop'), { where: 'middle', index: 1, sound: 'a' });
  assert.deepEqual(whereDiffers('cat', 'hat'), { where: 'start', index: 0, sound: 'c' });
  assert.deepEqual(whereDiffers('net', 'nest'), { where: 'end', index: 2, sound: 't' });
  assert.deepEqual(whereDiffers('ship', 'sun'), { where: 'start', index: 0, sound: 'sh' });
});

// ---- Help levels ------------------------------------------------------------

test('help levels: start at 1, up one when right first time with no help, down one with help; saved', () => {
  const storage = memory();
  const store = new ProgressStore(storage);
  assert.equal(bridgeLevel(store, 'map'), BRIDGE.startLevel);
  assert.equal(stepLevel(1, true), 2);
  assert.equal(stepLevel(3, true), 3);
  assert.equal(stepLevel(2, false), 1);
  assert.equal(stepLevel(1, false), 1);
  store.setBridgeLevel('map', 3);
  assert.equal(new ProgressStore(storage).bridgeLevel('map', 1), 3);
  // An old blob with no bridgeLevels reads fine.
  const old = memory();
  old.setItem(STORE_KEY, JSON.stringify({ version: 1, words: {} }));
  assert.equal(bridgeLevel(new ProgressStore(old), 'map'), 1);
});

// ---- The room in the episode ----------------------------------------------

test('the pool: the bridge is a fetch room and one of the two forced phonics rooms, never the counter', () => {
  assert.equal(MINIGAME_BY_ID.bridge, BRIDGE_GAME);
  assert.deepEqual(BRIDGE_GAME.slots, ['fetch']);
  assert.equal(BRIDGE_GAME.scene, 'BridgeRoom');
  assert.ok(MINIGAMES.includes(BRIDGE_GAME));
  assert.deepEqual(PHONICS_GAMES.map((g) => g.id).sort(), ['bridge', 'charge']);
  const store = new ProgressStore(memory());
  const rand = seeded(11);
  for (let i = 0; i < 200; i++) assert.notEqual(drawGames(store, rand)[2].id, 'bridge');
});

test('episodePlans with the bridge: its words are the fetches, its last the key; no other room reads one or shows its pictures as a key', () => {
  const sentence = MINIGAMES.find((g) => g.frame && g.slots.includes('fetch'))!;
  const counter = MINIGAMES.find((g) => g.frame && g.slots.includes('counter'))!;
  for (let seed = 1; seed <= 30; seed++) {
    const store = new ProgressStore(memory());
    const plans = episodePlans(
      store,
      { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', games: [BRIDGE_GAME, sentence, counter] },
      seeded(spread(seed)),
    );
    const b = plans[0];
    assert.equal(b.kind, 'bridge');
    if (b.kind !== 'bridge') return;
    const words = bridgeWords(b.bridge);
    assert.deepEqual(b.fetches, words);
    assert.equal(b.key, words.at(-1));
    const shown = b.bridge.rounds.flatMap((r) => r.pictures);
    // Evil Tiamat's named counter word (HAT) is the attic's to draw: never on the bridge.
    const named = CHARACTER_BY_ID.tiamat!.counter.word;
    assert.ok(!words.includes(named) && !shown.includes(named), `seed ${seed}: ${named} on the bridge`);
    for (const p of plans.slice(1)) {
      assert.ok(!words.includes(p.key), `seed ${seed}: ${p.slot} key ${p.key} is a bridge word`);
      assert.ok(!shown.includes(p.key), `seed ${seed}: ${p.slot} key ${p.key} is on the far bank`);
    }
  }
});

test('gaps: every place has one; the house is lava', () => {
  for (const p of PLACES) assert.ok(p.gap, p.id);
  for (const r of SIDE_ROOMS) assert.equal(gapFor(r.id), 'lava');
  assert.equal(gapFor(PLACES.find((p) => p.id === 'sea_grotto')!.rooms[0]!.id), 'river');
});

test("the bridge's lines exist for every narrator", () => {
  const keys = NARRATOR_LINES.filter((t) => t.key.startsWith('bridge_'));
  assert.ok(keys.length >= 12);
  const ids = new Set(composeLines().map((l) => l.id));
  for (const n of PERSONS.map((p) => p.id)) for (const t of keys) assert.ok(ids.has(narratorLine(n, t.key)), narratorLine(n, t.key));
});
