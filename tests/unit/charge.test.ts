/**
 * Charge the Spell's pure rules (item 053; item 058's one word a visit): the
 * word draw (every sound in play since item 067; `tier` is a label), the runes (each a sound
 * with its line, gesture and battle move), the room's place in the episode, the speech rules
 * its lines keep, and that a store blob's old `chargeLevels` (the dropped help ramp) loads cleanly.
 * `npx tsx --test tests/unit/charge.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BANK, BANK_BY_WORD, THINGS } from '../../content/phonics/bank';
import { SOUND_BY_UNIT } from '../../content/phonics/letters';
import { RUNES, RUNE_BY_SOUND } from '../../content/phonics/runes';
import { ABILITY_KINDS } from '../../content/battle/types';
import { chargeKey, letterSoundLine, narratorLine } from '../../content/voice/ids';
import { CHARGE_GESTURES, NARRATOR_LINES } from '../../content/voice/script';
import { PERSONS } from '../../content/battle/roster';
import { CHARGE } from '../../src/config';
import { CHARGE_WORDS, GESTURE_WORDS, RUNE_SOUNDS, planCharge } from '../../src/rules/charge';
import { CHARGE_GAME, MINIGAMES, MINIGAME_BY_ID, drawGames } from '../../src/rules/minigames';
import { withStems } from '../../src/rules/bank';
import { episodePlans } from '../../src/rules/sentences';
import { ProgressStore, STORE_KEY } from '../../src/state/ProgressStore';
import { composeLines } from '../../tools/voice/compose';
import { memory, seeded } from './seeds';

/** The ability kinds BattleScene can cast (abilities.ts CASTS is keyed by them). */
const KINDS: readonly string[] = ABILITY_KINDS;

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
  // Except Matt's /e/ gesture (item 071, M11: "Tap the egg, crack it open"), whose words count as
  // said only in an episode whose Charge word has /e/, from when it plays (item 074: `gestureWords`,
  // wordrules.test.ts), so no word she reads after it is one of them.
  const allowed = new Set(['tap', 'egg']);
  for (const w of allowed) assert.ok(GESTURE_WORDS.includes(w), `${w} counts as said`);
  const bank = new Set(BANK.map((w) => w.word).filter((w) => !allowed.has(w)));
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

test('store (item 078): a blob with item 053\'s chargeLevels loads cleanly, history kept, and drops them', () => {
  const old = memory();
  const blob = { ...new ProgressStore(memory()).snapshot(), episodes: 4, chargeLevels: { m: 3 } };
  old.setItem(STORE_KEY, JSON.stringify(blob));
  const back = new ProgressStore(old);
  assert.equal(back.snapshot().episodes, 4);
  assert.equal('chargeLevels' in back.snapshot(), false);
});

test('words (item 058): every charge word is a familiar picture of 3-4 units, each its own rune, no sound twice; no Q, X or CK', () => {
  assert.ok(CHARGE_WORDS.length >= 20, `${CHARGE_WORDS.length} words`);
  for (const w of CHARGE_WORDS) {
    const b = BANK_BY_WORD[w]!;
    assert.ok(THINGS.includes(b), `${w} is a familiar picture`);
    assert.ok(b.units.length >= CHARGE.units[0] && b.units.length <= CHARGE.units[1], w);
    assert.deepEqual(b.units, b.sounds, `${w}: every unit shows as its sound`);
    for (const u of b.units) assert.ok(RUNE_BY_SOUND[u], `${w}: ${u} is a rune`);
    assert.equal(new Set(b.sounds).size, b.sounds.length, `${w}: no sound twice`);
    for (const s of ['q', 'x', 'ck']) assert.ok(!b.sounds.includes(s), w);
  }
});

test('draw (item 067): a fresh store spells any charge word, quick sounds and digraphs included, through the bank', () => {
  const rand = seeded(3);
  let quick = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const { word, units, runes } = planCharge(new ProgressStore(memory()), { avoid: [] }, rand);
    assert.ok(CHARGE_WORDS.includes(word), word);
    assert.deepEqual(units, BANK_BY_WORD[word]!.units);
    assert.deepEqual(runes, BANK_BY_WORD[word]!.sounds);
    if (runes.some((s) => tier(s) > 1)) quick++;
  }
  assert.ok(quick > 30, `words with a quick sound or digraph came up ${quick}/60 times`);
});

test('draw: avoided words never come up', () => {
  const store = new ProgressStore(memory());
  const rand = seeded(9);
  for (let k = 0; k < 60; k++) {
    const { word } = planCharge(store, { avoid: ['cat', 'dog'] }, rand);
    assert.ok(word !== 'cat' && word !== 'dog');
  }
});

test('draw: a word with a shaky sound comes up more than one with only solid sounds', () => {
  const store = new ProgressStore(memory());
  for (const r of RUNES.filter((x) => x.tier === 1)) for (let i = 0; i < 4; i++) store.record('sounds', r.sound, r.sound !== 'm', r.sound === 'm' ? 1 : 0);
  // Per word carrying the sound, so the bank's spread of M and S words does not count.
  const per = (x: string) => CHARGE_WORDS.filter((w) => BANK_BY_WORD[w]!.sounds.includes(x)).length;
  let m = 0;
  let s = 0;
  const rand = seeded(5);
  for (let k = 0; k < 400; k++) {
    const { runes } = planCharge(store, { avoid: [] }, rand);
    if (runes.includes('m')) m++;
    if (runes.includes('s')) s++;
  }
  assert.ok(m / per('m') > s / per('s'), `M (missed) ${m} draws over ${per('m')} words, S (solid) ${s} over ${per('s')}`);
});

test('pool: Charge the Spell is a fetch room only; its plan spells a word', () => {
  assert.ok(MINIGAMES.includes(CHARGE_GAME));
  assert.deepEqual(CHARGE_GAME.slots, ['fetch']);
  assert.equal(MINIGAME_BY_ID.charge, CHARGE_GAME);
  const store = new ProgressStore(memory());
  const [, b, counter] = drawGames(store, seeded(3), MINIGAMES.filter((g) => g !== CHARGE_GAME));
  const plans = episodePlans(store, { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', games: [CHARGE_GAME, b, counter] }, seeded(4));
  const a = plans[0];
  assert.equal(a.kind, 'charge');
  assert.equal(a.scene, 'ChargeRoom');
  // Item 058: it spells a word, a battle item, kept off the other rooms.
  assert.ok(a.kind === 'charge' && CHARGE_WORDS.includes(a.key));
  assert.deepEqual(a.fetches, [a.key]);
  if (a.kind === 'charge') assert.equal(a.charge.word, a.key);
  assert.ok(plans[1].key && plans[2].key, 'door b and the attic still read their words');
  assert.ok(!plans[1].fetches.includes(a.key) && plans[2].key !== a.key);
  assert.throws(() => episodePlans(store, { fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' }, ally: 'ellie', gift: 'zap', rooms: ['kitchen', 'garage'], counterRoom: 'attic', games: [b, b, CHARGE_GAME] }, seeded(4)));
});
