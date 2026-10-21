/**
 * The move choice's pad placement (item 071; src/battle/padPlace.ts): no sign
 * over the villain, nor over a contest's team at its held stations (M17, the
 * cook-off's Dada Jason); a contest's pads stay on her side even when it is
 * narrow (M7); a fighter under a sign steps clear (M6, M8).
 * `npx tsx --test tests/unit/padPlace.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bodyBox, clearSpot, coveredShare, placePads, signBox, type PlaceBody } from '../../src/battle/padPlace';
import { spread } from './seeds';

/** A fighter standing at (x, y), `w` wide and `h` tall. */
const body = (x: number, y: number, w: number, h: number): PlaceBody => ({ x, y, cx: x, cy: y - h / 2, half: w / 2, top: y - h });
const floor = { left: 70, right: 1210 };
/** Seeded luck, so a failure replays. */
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const signs = (spots: { x: number; y: number }[]) => spots.map((p) => signBox(p.x, p.y));

test('padPlace: a contest keeps every sign off a tall teammate at his station and off the villain (M17)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    // The cook-off (stages/cookoff.ts spot()): her in front at the heroes' station, Dada Jason a
    // step back and to her left, swaying; the villain at his.
    const me = body(265 + (seed % 3) * 20, 505, 120, 220);
    const jason = body(150 + ((seed % 5) - 2) * 8, 450, 150 + (seed % 4) * 20, 300);
    const villain = body(1020, 505, 200 + (seed % 3) * 40, 300);
    const spots = placePads({ n: 3, avoid: [me, jason, villain], cover: [villain, jason], contest: { meX: me.x, villain }, ...floor, rand: seeded(spread(seed)) });
    assert.equal(spots.length, 3);
    for (const b of [jason, villain]) assert.equal(coveredShare(bodyBox(b), signs(spots)), 0, `seed ${seed}: ${JSON.stringify(spots)}`);
    for (const p of spots) assert.ok(p.x < villain.x - villain.half, `seed ${seed}: on her side`);
  }
});

test('padPlace: her side wins over covering nobody when a contest has no room for both', () => {
  // A wide teammate across the middle of her side: no clear set of three there, while past the villain is open floor.
  const me = body(200, 560, 120, 220);
  const mate = body(450, 560, 300, 320);
  const villain = body(800, 560, 160, 300);
  const spots = placePads({ n: 3, avoid: [me, mate, villain], cover: [villain, mate], contest: { meX: me.x, villain }, ...floor, rand: seeded(7) });
  assert.equal(spots.length, 3);
  for (const p of spots) assert.ok(p.x < villain.x, `${p.x}: past him`);
  assert.equal(coveredShare(bodyBox(villain), signs(spots)), 0);
});

test('padPlace: the rope pull keeps three pads on her side when it is narrow, never past the serpent (M7)', () => {
  for (let seed = 1; seed <= 20; seed++) {
    // The knot on her side: the line shifted towards her, a wide serpent at the rope's end.
    const team = [body(360, 548, 110, 200), body(225, 590, 110, 200), body(90, 632, 110, 200)];
    const villain = body(895, 565, 320, 260);
    const spots = placePads({ n: 3, avoid: [...team, villain], cover: [villain, ...team.slice(1)], contest: { meX: 360, villain }, ...floor, rand: seeded(spread(seed)) });
    assert.equal(spots.length, 3);
    for (const p of spots) assert.ok(p.x + 115 < villain.x - villain.half, `seed ${seed}: ${p.x} reaches him`);
    for (let i = 1; i < spots.length; i++) assert.ok(spots[i]!.x - spots[i - 1]!.x >= 240, 'the plates never touch');
  }
});

test('padPlace: a fight keeps every sign off the villain', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const me = body(300, 560, 120, 220);
    const villain = body(500 + seed * 25, 520, 260, 340);
    const spots = placePads({ n: 3, avoid: [me, villain], cover: [villain], ...floor, rand: seeded(spread(seed)) });
    assert.equal(spots.length, 3);
    assert.equal(coveredShare(bodyBox(villain), signs(spots)), 0, `seed ${seed}`);
  }
});

test('padPlace: when nobody can be kept clear, the pads still go up, covering as little as they can', () => {
  // A giant across the whole floor.
  const giant = body(640, 640, 1100, 600);
  const spots = placePads({ n: 3, avoid: [giant], cover: [giant], ...floor, rand: seeded(3) });
  assert.equal(spots.length, 3);
});

test('clearSpot: a fighter under a sign steps clear of it and its ring; one clear stays put (M6, M8)', () => {
  const pads = [{ x: 400, y: 560 }, { x: 700, y: 560 }];
  const fl = { left: 70, right: 1210, top: 420, bottom: 670 };
  const to = clearSpot({ x: 700, y: 540, half: 80, h: 300 }, pads, [], fl);
  assert.equal(coveredShare([to.x - 80, to.y - 300, to.x + 80, to.y], signs(pads)), 0);
  assert.ok(pads.every((p) => Math.abs(to.x - p.x) >= 95 + 40 || Math.abs(to.y - p.y) >= 60), 'off the rings');
  assert.deepEqual(clearSpot({ x: 1100, y: 600, half: 60, h: 150 }, pads, [], fl), { x: 1100, y: 600 });
});
