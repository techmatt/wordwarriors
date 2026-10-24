/**
 * Hunt 10, M58: a villain's decal with no clear spot is not drawn (src/rules/decals.ts), in every room.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ROSTER } from '../../content/battle/roster';
import { OUTDOOR_ROOMS, PLACES } from '../../content/house/house';
import { scatterDecals, type Box } from '../../src/rules/decals';
import { seededRand } from '../../src/rules/random';

const FLOOR: Box = { x: 70, y: 430, width: 1140, height: 270 };
const hits = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const boxOf = (p: { x: number; y: number; size: number }): Box => ({ x: p.x - p.size / 2, y: p.y - p.size / 2, width: p.size, height: p.size });

test('decals: every villain, every seed, nothing lands on what the room keeps clear', () => {
  // The entry hall's kind of keep-outs: a band across the floor and a start spot.
  const avoid: Box[] = [{ x: 180, y: 280, width: 770, height: 410 }, { x: 570, y: 450, width: 140, height: 200 }];
  for (const v of ROSTER) {
    const decals = v.house?.decals;
    if (!decals?.length) continue;
    for (let seed = 1; seed <= 40; seed++) {
      for (const d of scatterDecals(decals, { floor: FLOOR, avoid, rand: seededRand(seed) })) {
        for (const r of avoid) assert.ok(!hits(boxOf(d), r), `${v.id} seed ${seed}: ${d.key} at ${Math.round(d.x)},${Math.round(d.y)}`);
      }
    }
  }
});

test('decals: with no clear spot a decal is skipped, not dropped onto a kept-clear spot', () => {
  const decals = [{ id: 'footprint', count: 3 }, { id: 'crack', count: 2 }];
  // Everything kept clear: nothing is drawn.
  const all: Box[] = [{ x: 0, y: 0, width: 1280, height: 720 }];
  assert.deepEqual(scatterDecals(decals, { floor: FLOOR, avoid: all, rand: seededRand(1) }), []);
  // Only the floor kept clear: the wall decals still go up, the floor ones are skipped.
  const placed = scatterDecals(decals, { floor: FLOOR, avoid: [{ x: 0, y: 400, width: 1280, height: 320 }], rand: seededRand(1) });
  assert.deepEqual(placed.map((p) => p.key), ['decal_crack', 'decal_crack']);
  // Nothing kept clear: all of them.
  assert.equal(scatterDecals(decals, { floor: FLOOR, rand: seededRand(1) }).length, 5);
});

test('decals (hunt 11): an open-air side room is a real room of a place, and its decals all lie on the floor', () => {
  for (const id of OUTDOOR_ROOMS) assert.ok(PLACES.some((p) => [...p.rooms, p.secret].some((r) => r.id === id)), `${id} is a room of a place`);
  for (const v of ROSTER) {
    const decals = v.house?.decals;
    if (!decals?.length) continue;
    const placed = scatterDecals(decals, { floor: FLOOR, floorOnly: true, rand: seededRand(7) });
    assert.ok(placed.every((p) => p.onFloor), `${v.id}: nothing hangs in mid-air`);
  }
});
