import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { ART_BY_ID } from '../../content/art/assets.js';
import { ART_PROMPTS, keyMode, NOTES, SPRITE_STYLE } from '../../content/art/prompts.js';
import { readBrief } from '../../tools/art/alts.js';
import { keyGreen } from '../../tools/art/chroma.js';
import { codexPrompt } from '../../tools/art/generate.js';

test('every art prompt is keyed to a real asset id', () => {
  for (const id of Object.keys(ART_PROMPTS)) assert.ok(ART_BY_ID[id], `${id} is not in content/art/assets.ts`);
});

test('a brief replaces only the asset prompt: the style block and NOTES stay (art:alts --brief, item 041)', () => {
  const id = 'char_dada_matt_lifter_good';
  const p = codexPrompt(id, false, 'A BRIEF FROM SCRATCH.');
  assert.ok(p.includes(`${SPRITE_STYLE} A BRIEF FROM SCRATCH.`));
  assert.ok(!p.includes(ART_PROMPTS[id]!));
  assert.ok(p.includes(NOTES[id]!));
  assert.equal(codexPrompt(id), codexPrompt(id, false, ART_PROMPTS[id]));
});

test('a brief is named by its file and its text has its whitespace collapsed', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ww-brief-'));
  try {
    await writeFile(path.join(dir, '041_cyber_netrunner.txt'), 'A dad\n  with a deck.\n');
    const b = await readBrief(path.join(dir, '041_cyber_netrunner.txt'));
    assert.equal(b.name, '041_cyber_netrunner');
    assert.equal(b.text, 'A dad with a deck.');
    await writeFile(path.join(dir, 'Bad Name.txt'), 'x');
    await assert.rejects(readBrief(path.join(dir, 'Bad Name.txt')), /slug/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
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
  keyGreen(px, 20, 20, 'noGreen');
  const o = (10 * 20 + 10) * 4;
  assert.ok(px[o + 1]! <= Math.max(px[o]!, px[o + 2]!), 'no green lean left');
  assert.ok(px[o + 3]! < 255, 'part-transparent where the screen showed through');
});

test('keyGreen with lightGreen keeps dark green and un-mixes light screen green (item 049)', () => {
  const dark = picture(20, 20, [22, 79, 49]);
  keyGreen(dark, 20, 20, 'lightGreen');
  const o = (10 * 20 + 10) * 4;
  assert.deepEqual([...dark.subarray(o, o + 4)], [22, 79, 49, 255], 'forest green stays solid');
  const light = picture(20, 20, [150, 230, 120]);
  keyGreen(light, 20, 20, 'lightGreen');
  assert.ok(light[o + 1]! <= Math.max(light[o]!, light[o + 2]!), 'no green lean left');
  assert.ok(light[o + 3]! < 255, 'part-transparent where the screen showed through');
});

test("Jason's green forms cut light-green-only, for art:gen, art:alts and art:pick alike (item 049)", () => {
  for (const c of ['dada_jason', 'dada_jason_warrior', 'dada_jason_warlock']) {
    assert.equal(keyMode(`char_${c}_good`), 'lightGreen');
    assert.equal(keyMode(`face_${c}`), 'lightGreen');
    assert.equal(keyMode(`char_${c}_evil`), 'noGreen');
  }
  assert.equal(keyMode('pic_frog'), 'keep');
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
