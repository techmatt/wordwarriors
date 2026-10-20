/**
 * Charge the Spell's pure rules (item 053): the rune draw (continuous sounds
 * first, tiers opening as she firms up, no look-alikes or same sounds in one
 * round), the help-level ramp and its store field, the room's place in the
 * episode, and the speech rules its lines keep.
 * `npx tsx --test tests/unit/charge.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BANK } from '../../content/phonics/bank';
import { SOUND_BY_UNIT } from '../../content/phonics/letters';
import { LOOKALIKE_RUNES, RUNES, RUNE_BY_SOUND, SAME_SOUND } from '../../content/phonics/runes';
import type { AbilityKind } from '../../content/battle/types';
import { chargeKey, letterSoundLine, narratorLine } from '../../content/voice/ids';
import { CHARGE_GESTURES, NARRATOR_LINES } from '../../content/voice/script';
import { PERSONS } from '../../content/battle/roster';
import { CHARGE } from '../../src/config';
import { RUNE_SOUNDS, chargeLevel, nextChargeLevel, planCharge, tierGate } from '../../src/rules/charge';
import { CHARGE_GAME, MINIGAMES, MINIGAME_BY_ID, drawGames } from '../../src/rules/minigames';
import { withStems } from '../../src/rules/bank';
import { episodePlans } from '../../src/rules/sentences';
import { ProgressStore, STORE_KEY, type StorageLike } from '../../src/state/ProgressStore';
import { composeLines } from '../../tools/voice/compose';

function memory(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function seeded(seed = 1): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** The ability kinds BattleScene can cast (abilities.ts CASTS, mirrored as tests/unit/effects.test.ts does). */
const KINDS: AbilityKind[] = [
  'bolt', 'beam', 'cone', 'lightning', 'slam', 'spin', 'dash', 'summon', 'polymorph', 'freeze', 'teleport',
  'clones', 'trap', 'rain', 'shield', 'heal', 'grow', 'coil', 'eclipse', 'wave', 'grid', 'orbit',
];

const tier = (s: string) => RUNE_BY_SOUND[s]!.tier;

test('runes: every rune is a sound with its own line, a gesture and a battle move; no Q, X or CK', () => {
  for (const r of RUNES) {
    assert.ok(SOUND_BY_UNIT[r.sound], `${r.sound} is a sound unit`);
    assert.ok(r.gesture.glyph && r.gesture.text.endsWith('...'), `${r.sound}'s gesture trails off into the sound`);
    assert.ok(KINDS.includes(r.move.kind), `${r.sound}'s move is a real ability kind`);
    assert.equal(r.move.words, undefined, 'a rune is no move pad');
    assert.ok(!r.move.art?.startsWith('pic_'), 'a rune move shows no word picture');
    assert.ok(r.move.power >= 1 && r.move.power <= 3);
  }
  assert.equal(new Set(RUNE_SOUNDS).size, RUNE_SOUNDS.length);
  for (const s of ['q', 'x', 'ck']) assert.ok(!RUNE_SOUNDS.includes(s));
  // The beta's order: M S F A L N R V Z and the short vowels first.
  assert.deepEqual(RUNES.filter((r) => r.tier === 1).map((r) => r.sound).sort(), [...'mesfalnrvziou'].sort());
});

test('runes: no gesture shows a bank word\'s picture or says a bank word (they are voiced before the battle)', () => {
  const glyphs = new Map(BANK.filter((w) => w.glyph).map((w) => [w.glyph!, w.word]));
  const bank = new Set(BANK.map((w) => w.word));
  const words = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const r of RUNES) assert.ok(!glyphs.has(r.gesture.glyph), `${r.sound}'s ${r.gesture.glyph} is ${glyphs.get(r.gesture.glyph)}'s picture`);
  const charge = NARRATOR_LINES.filter((t) => t.key.startsWith('charge_') || t.key === 'use_runes');
  for (const t of [...charge, ...CHARGE_GESTURES]) {
    for (const s of [t.text, t.say ?? '']) {
      for (const w of withStems(words(s))) assert.ok(!bank.has(w), `"${s}" says the bank word "${w}"`);
      // Never a letter name or a spelled-out sound: "Sss" is captioned, and edge-tts says "ess".
      assert.ok(!/\b([a-z])\1{1,}\b/i.test(s), `"${s}" spells a sound`);
      const said = (t.say ?? t.text).replace(/\.\.\.$/, '');
      assert.ok(!/[!.?]\s/.test(said), `"${said}" stops mid-line`);
      if (t.say) assert.equal(t.say.split(/\s+/).length, t.text.split(/\s+/).length, `"${t.say}" has the text's word count`);
    }
  }
});

test('voice: every narrator says every gesture, and every rune has its sound line', () => {
  const ids = new Set(composeLines().map((l) => l.id));
  for (const p of PERSONS) for (const r of RUNES) assert.ok(ids.has(narratorLine(p.id, chargeKey('charge_gesture', r.sound))), `${p.id} ${r.sound}`);
  for (const r of RUNES) assert.ok(ids.has(letterSoundLine(r.sound)), r.sound);
});

test('ramp: a new sound starts at level 1; an unaided yes is less help, an assist more, kept within 1..3 and saved', () => {
  const storage = memory();
  const store = new ProgressStore(storage);
  assert.equal(CHARGE.startLevel, 1);
  assert.equal(chargeLevel(store, 'm'), 1);
  assert.equal(nextChargeLevel(1, true), 2);
  assert.equal(nextChargeLevel(2, false), 1);
  assert.equal(nextChargeLevel(3, true), 3);
  assert.equal(nextChargeLevel(1, false), 1);
  store.setChargeLevel('m', 3);
  assert.equal(chargeLevel(new ProgressStore(storage), 'm'), 3);
  // A blob from before item 053 (no chargeLevels) loads, history kept.
  const old = memory();
  const blob = { ...new ProgressStore(memory()).snapshot(), episodes: 4 } as Record<string, unknown>;
  delete blob.chargeLevels;
  old.setItem(STORE_KEY, JSON.stringify(blob));
  const back = new ProgressStore(old);
  assert.equal(back.snapshot().episodes, 4);
  assert.equal(chargeLevel(back, 's'), 1);
});

test('draw: a fresh store charges six continuous sounds, never two look-alikes or two same sounds', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const { runes } = planCharge(new ProgressStore(memory()), seeded(seed));
    assert.equal(runes.length, CHARGE.runes);
    assert.equal(new Set(runes).size, runes.length);
    assert.ok(runes.every((s) => tier(s) === 1), `seed ${seed}: ${runes} are all continuous`);
  }
});

test('draw: quick sounds join once the continuous ones are solid, and come after them in the round', () => {
  const store = new ProgressStore(memory());
  assert.equal(tierGate(store, 2), 0);
  for (const r of RUNES.filter((x) => x.tier === 1)) for (let i = 0; i < 4; i++) store.record('sounds', r.sound, true, 0);
  assert.equal(tierGate(store, 2), 1);
  let quick = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const { runes } = planCharge(store, seeded(seed));
    const tiers = runes.map(tier);
    assert.deepEqual(tiers, [...tiers].sort((a, b) => a - b), `seed ${seed}: continuous first (${runes})`);
    for (const set of [...LOOKALIKE_RUNES, ...SAME_SOUND]) assert.ok(runes.filter((s) => set.includes(s)).length <= 1, `seed ${seed}: one of ${set} (${runes})`);
    quick += runes.filter((s) => tier(s) === 2).length;
  }
  // Solid sounds weigh little against new ones: most of each round is quick sounds now.
  assert.ok(quick > 60 * 3, `quick sounds came up ${quick} times`);
});

test('draw: a shaky sound comes up more than a solid one', () => {
  const store = new ProgressStore(memory());
  for (const r of RUNES.filter((x) => x.tier === 1)) for (let i = 0; i < 4; i++) store.record('sounds', r.sound, r.sound !== 'm', r.sound === 'm' ? 1 : 0);
  let m = 0;
  let s = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const { runes } = planCharge(store, seeded(seed));
    if (runes.includes('m')) m++;
    if (runes.includes('s')) s++;
  }
  assert.ok(m > s, `M (missed) ${m} times, S (solid) ${s}`);
});

test('pool: Charge the Spell is a fetch room only, its plan reads no word and draws nothing from the bag', () => {
  assert.ok(MINIGAMES.includes(CHARGE_GAME));
  assert.deepEqual(CHARGE_GAME.slots, ['fetch']);
  assert.equal(MINIGAME_BY_ID.charge, CHARGE_GAME);
  const store = new ProgressStore(memory());
  const [, b, counter] = drawGames(store, seeded(3), MINIGAMES.filter((g) => g !== CHARGE_GAME));
  const plans = episodePlans(store, { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', games: [CHARGE_GAME, b, counter] }, seeded(4));
  const a = plans[0];
  assert.equal(a.kind, 'charge');
  assert.equal(a.scene, 'ChargeRoom');
  assert.equal(a.key, '');
  assert.deepEqual(a.fetches, []);
  if (a.kind === 'charge') assert.equal(a.charge.runes.length, CHARGE.runes);
  assert.ok(plans[1].key && plans[2].key, 'door b and the attic still read their words');
  assert.throws(() => episodePlans(store, { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', games: [b, b, CHARGE_GAME] }, seeded(4)));
});
