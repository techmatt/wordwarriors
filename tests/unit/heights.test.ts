/**
 * Item 093: Dada Matt reads 5-10% shorter than Dada Jason beside him, in every
 * pairing of their forms, good and evil. Each picture is drawn `adultHeight`
 * tall (battle, rooms, VS cards, the victory scene and the podium all fit it
 * to that height), so the person in it, head to soles, is that height times
 * `ADULT_FILL`: his own height (`ADULT_HEIGHTS`). The fills are measured by
 * eye (a hat is not his head); here they are held against the art's alpha.
 * `npx tsx --test tests/unit/heights.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import sharp from 'sharp';

import { OUTFITS } from '../../content/battle/outfits';
import { formsOf } from '../../content/battle/roster';
import { ADULT_FILL, ADULT_HEIGHTS } from '../../src/config';
import { adultHeight, isGrownUp, outfitFill, outfitTall } from '../../src/rules/heights';

/** The figure's alpha box height as a share of its picture's, and the picture's aspect (width / height). */
async function figure(art: string): Promise<{ fill: number; aspect: number }> {
  const { data, info } = await sharp(`public/art/${art}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  let top = h;
  let bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * c + 3]! > 24) {
        top = Math.min(top, y);
        bottom = y;
        break;
      }
    }
  }
  return { fill: (bottom + 1 - top) / h, aspect: w / h };
}

const ids = (person: string) => formsOf(person).flatMap((f) => [`${f.id}_good`, `${f.id}_evil`]);

test('Dada Matt reads 5-10% shorter than Dada Jason in every pairing of their forms (item 093)', async () => {
  const matt = ids('dada_matt');
  const jason = ids('dada_jason');
  assert.equal(matt.length, 8, 'builder, lifter, cyber and blade, good and evil');
  assert.equal(jason.length, 6, 'chef, warrior and warlock, good and evil');
  const person = new Map<string, number>();
  for (const id of [...matt, ...jason]) {
    const art = `char_${id}`;
    assert.ok(isGrownUp(id), id);
    const fill = ADULT_FILL[art];
    assert.ok(fill, `${art} has its head-to-soles share in ADULT_FILL`);
    const f = await figure(art);
    // Fitted by height everywhere: the boxes are at least 0.95 of the height wide.
    assert.ok(f.aspect <= 0.95, `${art} is ${f.aspect.toFixed(2)} wide: fitted by width, its height would not be its own`);
    // The person is inside the alpha box, and no more than a tall hat's worth shorter than it.
    assert.ok(fill <= f.fill + 0.005 && fill >= f.fill - 0.15, `${art}: ADULT_FILL ${fill}, alpha box ${f.fill.toFixed(3)}`);
    const drawn = adultHeight(id, art);
    assert.ok(drawn > 1.25 && drawn < 2, `${art} drawn ${drawn.toFixed(2)}: a grown-up beside her, not a giant`);
    person.set(id, drawn * fill);
  }
  for (const m of matt) {
    for (const j of jason) {
      const shorter = 1 - person.get(m)! / person.get(j)!;
      assert.ok(shorter >= 0.05 && shorter <= 0.1, `${m} beside ${j}: ${(shorter * 100).toFixed(1)}% shorter`);
    }
  }
});

test('a grown-up\'s height is his whatever the id\'s form: a fighter id, a form id, a person', () => {
  const art = 'char_dada_matt_lifter_good';
  assert.equal(adultHeight('dada_matt_lifter', art), adultHeight('dada_matt_lifter_good', art));
  assert.equal(adultHeight('dada_jason_warlock_good', 'char_dada_jason_warlock_good') * ADULT_FILL.char_dada_jason_warlock_good!, ADULT_HEIGHTS.dada_jason);
});

test('her outfits (hunt 6, M32): each picture drawn so she, head to soles, is as tall as in her dress; each fill held to the art', async () => {
  const outfits = OUTFITS.julia!.map((o) => o.art);
  assert.ok(outfits.includes('char_julia_chef') && outfits.includes('char_julia_knight'), outfits.join(' '));
  for (const art of ['char_julia_good', ...outfits]) {
    const fill = outfitFill(art);
    assert.ok(fill, `${art} has its head-to-soles share (outfits.ts fill)`);
    const f = await figure(art);
    // Her head is inside the alpha box, and no more than a hat's or a raised sword's worth shorter than it.
    assert.ok(fill <= f.fill + 0.005 && fill >= f.fill - 0.15, `${art}: fill ${fill}, alpha box ${f.fill.toFixed(3)}`);
    // Drawn `outfitTall` times her usual height: head to soles, she is her dress's height.
    assert.ok(Math.abs(outfitTall(art) * fill - outfitFill('char_julia_good')!) < 1e-9, art);
  }
  assert.equal(outfitTall('char_julia_good'), 1);
  assert.equal(outfitTall('char_dada_jason_good'), 1, 'a dad is sized by ADULT_FILL');
  assert.ok(outfitTall('char_julia_chef') > 1.1 && outfitTall('char_julia_chef') < 1.2, `${outfitTall('char_julia_chef')}`);
});
