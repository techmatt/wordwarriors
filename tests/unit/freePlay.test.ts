/**
 * Free play's pure rules (item 060): a cast button's tap or charge, the jump's
 * arc (a hold floats higher and longer, once per jump), and the live-shot cap.
 * `npx tsx --test tests/unit/freePlay.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FREE_PLAY } from '../../src/config';
import { castPower, overCap, startJump, stepJump, type Jump } from '../../src/rules/freePlay';

const DT = 1 / 60;

/** Fly one jump to the ground; `hold(frame)` says whether green is held that frame. */
function fly(hold: (frame: number) => boolean): { peak: number; frames: number; heights: number[] } {
  let j: Jump | null = startJump();
  let peak = 0;
  let frames = 0;
  const heights: number[] = [];
  while (j) {
    j = stepJump(j, DT, hold(frames));
    frames++;
    if (j) {
      peak = Math.max(peak, j.h);
      heights.push(j.h);
    }
    assert.ok(frames < 10_000, 'the jump never landed');
  }
  return { peak, frames, heights };
}

test('castPower: a press let go before chargeMs is a tap, one plain shot', () => {
  assert.deepEqual(castPower(0), { charged: false, power: 0 });
  assert.deepEqual(castPower(FREE_PLAY.chargeMs - 1), { charged: false, power: 0 });
});

test('castPower: held past chargeMs charges, growing to full at fullChargeMs', () => {
  const at = castPower(FREE_PLAY.chargeMs);
  assert.equal(at.charged, true);
  assert.equal(at.power, 0);
  const mid = castPower((FREE_PLAY.chargeMs + FREE_PLAY.fullChargeMs) / 2);
  assert.equal(mid.charged, true);
  assert.ok(mid.power > 0.4 && mid.power < 0.6, `half way is about half power (${mid.power})`);
  assert.equal(castPower(FREE_PLAY.fullChargeMs).power, 1);
});

test('castPower: holding on past full charge clamps the power to 1', () => {
  assert.equal(castPower(FREE_PLAY.fullChargeMs * 5).power, 1);
  assert.equal(castPower(60_000).power, 1);
  const cfg = { ...FREE_PLAY, chargeMs: 100, fullChargeMs: 200 };
  assert.deepEqual(castPower(99, cfg), { charged: false, power: 0 });
  assert.equal(castPower(150, cfg).power, 0.5);
  assert.equal(castPower(1000, cfg).power, 1);
});

test('stepJump: a held jump goes higher and lasts longer than a tapped one', () => {
  const tap = fly(() => false);
  const held = fly(() => true);
  assert.ok(tap.peak > 0, 'a tap leaves the floor');
  assert.ok(held.peak > tap.peak, `held peak ${held.peak} over tapped ${tap.peak}`);
  assert.ok(held.frames > tap.frames, `held ${held.frames} frames over tapped ${tap.frames}`);
});

test('stepJump: every jump lands (null) and never dips below the floor before then', () => {
  for (const hold of [() => false, () => true, (f: number) => f % 2 === 0]) {
    const j = fly(hold);
    for (const h of j.heights) assert.ok(h > 0);
  }
  // A jump already at the floor and falling lands on the next step.
  assert.equal(stepJump({ h: 0.01, v: -100, heldMs: FREE_PLAY.jump.holdMs }, DT, false), null);
});

test('stepJump: the float ends at holdMs, however long green stays down', () => {
  let j: Jump | null = startJump();
  for (let i = 0; i < 200 && j; i++) {
    j = stepJump(j, DT, true);
    if (j) assert.ok(j.heldMs <= FREE_PLAY.jump.holdMs + DT * 1000);
  }
});

test('stepJump: let go and held again, the jump does not float a second time', () => {
  const release = 4;
  // Held for the first frames, then let go for good.
  const once = fly((f) => f < release);
  // Held, let go for one frame, then held again to the ground.
  const again = fly((f) => f !== release);
  assert.deepEqual(again.heights, once.heights);
  assert.equal(again.frames, once.frames);
  // And it is lower than a jump held all the way.
  assert.ok(again.peak < fly(() => true).peak);
});

test('overCap: room under the cap pops nothing; at or over it pops the oldest to fit one more', () => {
  assert.equal(overCap(0, 10), 0);
  assert.equal(overCap(9, 10), 0);
  assert.equal(overCap(10, 10), 1);
  assert.equal(overCap(15, 10), 6);
  assert.equal(overCap(0), 0);
  assert.equal(overCap(FREE_PLAY.maxShots), 1);
  // After popping, one more shot always fits exactly at the cap.
  for (let live = 0; live < 30; live++) assert.ok(live - overCap(live) + 1 <= FREE_PLAY.maxShots);
});
