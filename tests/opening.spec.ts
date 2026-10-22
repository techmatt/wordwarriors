/**
 * Hunt 6, M28: the battle's opening run of fetched things. With the warm-up,
 * a bridge (3) and a Shape-Shifter (4), eight things fired one by one took
 * about 34 s before battle 1's first PICK A MOVE!; a room's earlier words now
 * fly out as one volley, each room's last word its own beat
 * (src/rules/volleys.ts). Real voice, full battle beats: slow (~15 s).
 */

import { test, expect } from '@playwright/test';

import { SLOW, SPEED, boot, collectErrors, expectNoErrors, until } from './harness';

test('battle 1 with eight fetched things: every one used, PICK A MOVE! well under 34 s', SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  // A bridge and a Shape-Shifter, and the warm-up's word first (`warmup=1`): eight things.
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&room=bridge&games=all&warmup=1&nojourney=1', SPEED, { voice: 'real' });
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
