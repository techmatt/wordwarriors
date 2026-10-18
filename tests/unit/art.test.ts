import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ART_BY_ID } from '../../content/art/assets.js';
import { ART_PROMPTS } from '../../content/art/prompts.js';
import { keyGreen } from '../../tools/art/chroma.js';

test('every art prompt is keyed to a real asset id', () => {
  for (const id of Object.keys(ART_PROMPTS)) assert.ok(ART_BY_ID[id], `${id} is not in content/art/assets.ts`);
});

/** A w×h green image with a black-outlined square of `inner` in the middle. */
function picture(w: number, h: number, inner: [number, number, number]): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const ring = x >= 6 && x <= 13 && y >= 6 && y <= 13;
      const core = x >= 8 && x <= 11 && y >= 8 && y <= 11;
      const c = core ? inner : ring ? [0, 0, 0] : [3, 250, 6];
      px[o] = c[0]!;
      px[o + 1] = c[1]!;
      px[o + 2] = c[2]!;
      px[o + 3] = 255;
    }
  }
  return px;
}

test('keyGreen clears the green screen and keeps the outlined subject', () => {
  const px = picture(20, 20, [255, 0, 0]);
  const { fringe } = keyGreen(px, 20, 20);
  assert.equal(px[3], 0, 'corner is transparent');
  assert.equal(px[(10 * 20 + 10) * 4 + 3], 255, 'subject stays opaque');
  assert.equal(px[(10 * 20 + 10) * 4], 255, 'subject keeps its colour');
  assert.equal(fringe, 0);
});

test('keyGreen keeps green inside the outline (a leaf is not the screen)', () => {
  const px = picture(20, 20, [60, 200, 60]);
  keyGreen(px, 20, 20);
  const o = (10 * 20 + 10) * 4;
  assert.deepEqual([...px.subarray(o, o + 4)], [60, 200, 60, 255]);
});

test('keyGreen with noGreen un-mixes green seen through a subject', () => {
  const px = picture(20, 20, [100, 180, 100]);
  keyGreen(px, 20, 20, true);
  const o = (10 * 20 + 10) * 4;
  assert.ok(px[o + 1]! <= Math.max(px[o]!, px[o + 2]!), 'no green lean left');
  assert.ok(px[o + 3]! < 255, 'part-transparent where the screen showed through');
});

test('keyGreen removes green spill from a soft edge', () => {
  const px = picture(20, 20, [255, 0, 0]);
  // A half-mixed edge pixel just outside the outline: half black, half key.
  const o = (5 * 20 + 10) * 4;
  px.set([2, 125, 3, 255], o);
  keyGreen(px, 20, 20);
  assert.ok(px[o + 3]! < 255, 'edge pixel is part-transparent');
  assert.ok(px[o + 1]! <= Math.max(px[o]!, px[o + 2]!), 'no green left in it');
});
