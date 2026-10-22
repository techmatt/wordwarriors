/**
 * Item 031: fight styles. Every style is well formed and staged, the active
 * villains each have their own, chef Dada Jason makes a cook-off likely,
 * nothing a style shows or says gives a move choice away or says a reading
 * word, and every style line is voiced for every narrator.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

import { ART_BY_ID } from '../../content/art/assets';
import { FIGHTS, FIGHT_BEATS, FIGHT_BY_ID, fightLineKey, fightPropArt } from '../../content/battle/fights';
import { ARENAS, CHARACTER_BY_ID, ROSTER } from '../../content/battle/roster';
import { BANK } from '../../content/phonics/bank';
import { narratorLine } from '../../content/voice/ids';
import { ACTIVE_CAST } from '../../src/config';
import { seededRand } from '../../src/rules/cast';
import { fightSpec, ownFight, pickFight } from '../../src/rules/fights';
import { composeLines } from '../../tools/voice/compose';

const KINDS = ['brawl', 'race', 'tug', 'clash', 'cookoff', 'story'];

test('fights: every style is well formed, with its arena and props drawn', () => {
  assert.ok(FIGHT_BY_ID.brawl, 'the brawl is the default style');
  assert.equal(new Set(FIGHTS.map((f) => f.id)).size, FIGHTS.length, 'ids are unique');
  for (const f of FIGHTS) {
    assert.ok(KINDS.includes(f.kind), `${f.id}: a staged kind`);
    assert.match(f.id, /^[a-z_]+$/);
    if (f.arena) {
      assert.ok(ARENAS[f.arena], `${f.id}: arena ${f.arena} is an ARENAS key`);
      assert.ok(ART_BY_ID[`arena_${f.arena}`], `${f.id}: its arena has art`);
    }
    for (const p of f.props ?? []) {
      assert.ok(ART_BY_ID[fightPropArt(p.id)], `${f.id}: prop ${p.id} is an art asset`);
      assert.ok(existsSync(`public/art/${fightPropArt(p.id)}.png`), `${f.id}: prop ${p.id} is painted`);
    }
    for (const t of [...f.banner, f.tooStrong, f.win]) assert.equal(t, t.toUpperCase(), `${f.id}: "${t}" is upper case`);
  }
});

test('fights: every roster fight and nudge names a real style', () => {
  for (const c of ROSTER) {
    if (c.fight) assert.ok(FIGHT_BY_ID[c.fight], `${c.id}: fight ${c.fight}`);
    if (c.fightNudge) {
      assert.ok(FIGHT_BY_ID[c.fightNudge.fight], `${c.id}: nudge ${c.fightNudge.fight}`);
      assert.ok(c.fightNudge.chance > 0 && c.fightNudge.chance < 1, `${c.id}: a nudge is a chance, not a rule`);
    }
  }
});

test('fights: the active villains each have their own style, and the styles differ', () => {
  const own = ACTIVE_CAST.villains.map((v) => ownFight(v));
  assert.equal(new Set(own).size, own.length, `each active villain fights differently: ${own.join(', ')}`);
  assert.equal(ownFight('tiamat'), 'brawl', 'Evil Tiamat keeps her giant battle');
  assert.equal(ownFight('nobody'), 'brawl');
  assert.equal(fightSpec('nonsense').id, 'brawl');
});

test('fights: chef Dada Jason as the ally makes a cook-off likely, against anyone', () => {
  const rand = seededRand(31);
  for (const villain of ACTIVE_CAST.villains) {
    const n = 2000;
    let cook = 0;
    for (let i = 0; i < n; i++) if (pickFight({ villain, ally: 'dada_jason' }, rand) === 'cook_off') cook++;
    const chance = CHARACTER_BY_ID.dada_jason!.fightNudge!.chance;
    assert.ok(Math.abs(cook / n - chance) < 0.05, `${villain}: cook-off ${cook / n} ≈ ${chance}`);
    // Every other ally leaves the villain's own style alone.
    for (const ally of ['ellie', 'scar', 'dada_matt', 'dada_jason_warrior']) assert.equal(pickFight({ villain, ally }, rand), ownFight(villain), `${ally} vs ${villain}`);
  }
  assert.equal(pickFight({ villain: 'smaug', ally: null }, rand), 'sky_race');
});

test('fights: nothing a style shows or says has a move word or a reading word', () => {
  // Every bank word: the move pads are its action words, the reading words its things (item 037).
  const banned = new Set<string>(BANK.map((w) => w.word));
  for (const f of FIGHTS) {
    const texts = [...f.banner, f.tooStrong, f.win, ...Object.values(f.lines).flatMap((l) => [l.text, l.say ?? ''])];
    for (const t of texts) {
      for (const w of t.toLowerCase().split(/[^a-z]+/)) assert.ok(!banned.has(w), `${f.id}: "${t}" says ${w.toUpperCase()}`);
    }
  }
});

test('fights: a style\'s lines fit any villain it may be drawn against: no he or she', () => {
  for (const f of FIGHTS) {
    for (const l of Object.values(f.lines)) {
      for (const w of `${l.text} ${l.say ?? ''}`.toLowerCase().split(/[^a-z]+/)) assert.ok(!['he', 'she', 'her', 'his', 'him'].includes(w), `${f.id}: "${l.text}"`);
    }
  }
});

test('fights: every style line is voiced for every narrator', () => {
  const ids = new Set(composeLines().map((l) => l.id));
  const narrators = new Set(composeLines().filter((l) => l.id.endsWith('_battle_start')).map((l) => l.speaker));
  assert.ok(narrators.size > 5);
  for (const f of FIGHTS) {
    for (const beat of FIGHT_BEATS) {
      for (const n of narrators) assert.ok(ids.has(narratorLine(n, fightLineKey(f, beat))), `${f.id} ${beat} for ${n}`);
    }
  }
});
