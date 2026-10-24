/**
 * Hunt 6, M28: the battle's opening run of fetched things. With the warm-up,
 * a bridge (3) and a Shape-Shifter (4), eight things fired one by one took
 * about 34 s before battle 1's first PICK A MOVE!; a room's earlier words now
 * fly out as one volley, each room's last word its own beat
 * (src/rules/volleys.ts). Real voice, full battle beats: slow (~15 s).
 *
 * Hunt 11, M62 and M63: with Charge the Spell (two words, item 140) its words
 * fly as one volley and its runes fire back to back (`RUNE_GAP`); part 1's
 * villain floor starts high and steps down with each super and the combo
 * (`PART1_VILLAIN_FLOOR`), so her first super takes a visible bite.
 */

import { test, expect } from '@playwright/test';

import { PART1_VILLAIN_FLOOR } from '../src/config';
import { SLOW, SPEED, boot, collectErrors, expectNoErrors, pickPad, until } from './harness';

for (const seed of [1, 2]) {
  test(`battle 1 with Charge (seed ${seed}): PICK A MOVE! under 26 s, and her first super bites`, SLOW, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = collectErrors(page);
    await boot(page, `?scene=battle&part=1&room=charge&games=all&warmup=1&seed=${seed}&nojourney=1`, SPEED, { voice: 'real' });
    const s0 = await until(page, (st) => st.scene === 'Battle' && st.episode.fetched.length > 0, 60_000, 'the battle');
    expect(s0.episode.house.plan!.map((p) => p.kind)).toContain('charge');
    const first = await until(page, (st) => (st.battle?.itemsUsed ?? 0) > 0, 90_000, 'the first thing out of the bag');
    const open = await until(page, (st) => Boolean(st.battle?.choice?.open), 90_000, 'the first move choice');
    const b = open.battle!;
    const took = b.t - first.battle!.t;
    console.log(`seed ${seed}: ${b.itemsUsed} things, ${b.runesFired} runes; PICK A MOVE! ${took.toFixed(1)} s after the first thing out of the bag; villain ${b.villains[0]!.hp}%`);
    expect(b.itemsUsed).toBe(s0.episode.fetched.length);
    expect(took).toBeLessThan(26);
    // The opening rests on the start floor, never lower.
    expect(b.villains[0]!.hp).toBeGreaterThanOrEqual(Math.floor(PART1_VILLAIN_FLOOR.start * 100));
    await pickPad(page, b.choice!.right);
    const picked = await until(page, (st) => !st.battle?.choice, 30_000, 'choice closed');
    const after = await until(page, (st) => (st.battle?.t ?? 0) >= picked.battle!.t + 3, 30_000, 'three seconds on');
    console.log(`seed ${seed}: villain ${after.battle!.villains[0]!.hp}% three seconds after her super`);
    expect(after.battle!.villains[0]!.hp).toBeLessThan(b.villains[0]!.hp);
    expectNoErrors(errors);
  });
}

test('battle 1 with eight fetched things: every one used, PICK A MOVE! well under 34 s', SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  // A bridge and a Shape-Shifter, and the warm-up's word first (`warmup=1`): eight things. The warm-up
  // word is KING: drawn, a fresh store's is MAN since MOM and DAD left the hall (hunt 10, M45), and the
  // Shifter's chains, most through MAN, then fall short of four links; and seeded (`seed=1`), as about one
  // visit in seven draws a two- or three-link chain.
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&room=bridge&games=all&warmup=1&grab=king&seed=1&nojourney=1', SPEED, { voice: 'real' });
  const s0 = await until(page, (st) => st.scene === 'Battle' && st.episode.fetched.length > 0, 60_000, 'the battle');
  const plan = s0.episode.house.plan!;
  expect(plan.map((p) => p.kind).slice(0, 2).sort()).toEqual(['bridge', 'shifter']);
  const fetched = s0.episode.fetched;
  expect(fetched).toEqual([s0.episode.grab!.word, ...plan.slice(0, 2).flatMap((p) => p.fetches)]);
  expect(fetched).toHaveLength(8);
  // Hunt 6's 34 s (13 s with three things) ran from the first thing out of the bag to PICK A MOVE!.
  const first = await until(page, (st) => (st.battle?.itemsUsed ?? 0) > 0, 90_000, 'the first thing out of the bag');
  const marks: string[] = [];
  let used = 0;
  const s = await until(
    page,
    (st) => {
      if ((st.battle?.itemsUsed ?? 0) !== used) marks.push(`${(used = st.battle!.itemsUsed)}@${st.battle!.t.toFixed(1)}`);
      return Boolean(st.battle?.choice?.open);
    },
    90_000,
    'the first move choice',
  );
  console.log(`items used (count@s): ${marks.join(' ')}; choice open @${s.battle!.t.toFixed(1)}`);
  expect(s.battle!.itemsUsed).toBe(8);
  const took = s.battle!.t - first.battle!.t;
  console.log(`battle 1: PICK A MOVE! ${took.toFixed(1)} s after the first thing out of the bag (game time), eight things`);
  // Main before M28: 37.3 s on this measure (eight beats of about 4.4 s); now five beats.
  expect(took).toBeLessThan(26);
  expectNoErrors(errors);
});
