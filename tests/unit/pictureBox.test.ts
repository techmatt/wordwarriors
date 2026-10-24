/**
 * Hunt 10, M48: standing people (DAD, VET, MOM, MAN) and wide pictures (TUG) are fitted to a box of
 * their own shape, about the square's area; every other picture keeps its square (src/art/pictureBox.ts).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PICTURE_STRETCH, SHAPED_PICTURES, pictureBox } from '../../src/art/pictureBox';

/** What a picture of `aspect` draws as in `box`, keeping its aspect. */
const drawn = (aspect: number, box: { w: number; h: number }) => {
  const s = Math.min(box.w / aspect, box.h);
  return { w: s * aspect, h: s };
};

test('pictures: the ruled ones are shaped, the rest keep the square', () => {
  assert.deepEqual([...SHAPED_PICTURES].sort(), ['pic_dad', 'pic_man', 'pic_mom', 'pic_tug', 'pic_vet']);
  assert.deepEqual(pictureBox('pic_cat', 330 / 400, 108, 108), { w: 108, h: 108 });
  assert.deepEqual(pictureBox('pic_hat', 2, 150, 150), { w: 150, h: 150 });
});

test('pictures: DAD (159 x 400) reads about as big as the square pictures, no more than the stretch taller', () => {
  const a = 159 / 400;
  const box = pictureBox('pic_dad', a, 108, 108);
  const d = drawn(a, box);
  const square = drawn(a, { w: 108, h: 108 });
  assert.ok(d.h <= 108 * PICTURE_STRETCH + 1e-9, `height ${d.h}`);
  assert.ok(d.w * d.h > square.w * square.h * 1.8, `area ${Math.round(d.w * d.h)} against ${Math.round(square.w * square.h)}`);
  assert.ok(Math.abs(box.w / box.h - a) < 1e-9, 'the box is his own shape');
});

test('pictures: TUG (400 x 108) grows wider, within a card', () => {
  const a = 400 / 108;
  const free = pictureBox('pic_tug', a, 100, 100);
  assert.ok(Math.abs(free.w - 100 * PICTURE_STRETCH) < 1e-9, `width ${free.w}`);
  const card = pictureBox('pic_tug', a, 100, 100, { w: 120, h: 112 });
  assert.ok(card.w <= 120 + 1e-9 && card.w > 100, `card width ${card.w}`);
});

test('pictures: a max box tighter than the square never shrinks one below its square fit', () => {
  const a = 159 / 400;
  const tight = drawn(a, pictureBox('pic_dad', a, 62, 62, { w: 40, h: 40 }));
  const square = drawn(a, { w: 62, h: 62 });
  assert.ok(Math.abs(tight.h - square.h) < 1e-9 && Math.abs(tight.w - square.w) < 1e-9, JSON.stringify(tight));
  // No aspect known (a missing texture): the slot.
  assert.deepEqual(pictureBox('pic_dad', Number.NaN, 62, 62), { w: 62, h: 62 });
});
