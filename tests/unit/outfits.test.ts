/**
 * Outfits (content/battle/outfits.ts): which images a character appears as in
 * an episode. Pure data and one lookup, so no browser.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ART_BY_ID } from '../../content/art/assets';
import { OUTFITS, outfitFor } from '../../content/battle/outfits';
import { CHARACTER_BY_ID } from '../../content/battle/roster';
import { EPISODE_DEFAULTS } from '../../src/config';

test('outfits: Julia is a chef when Dada Jason is the ally, else her default images', () => {
  assert.equal(outfitFor('julia', { ally: 'dada_jason', villain: 'tiamat' })?.art, 'char_julia_chef');
  assert.equal(outfitFor('julia', { ally: 'dada_jason', villain: 'rilla' })?.face, 'face_julia_chef');
  assert.equal(outfitFor('julia', { ally: 'ellie', villain: 'tiamat' }), null);
  assert.equal(outfitFor('julia', { ally: null, villain: 'tiamat' }), null);
  assert.equal(outfitFor('ellie', { ally: 'dada_jason', villain: 'tiamat' }), null);
  // One outfit, two allies: snow gear with Elsa or Anna.
  assert.equal(outfitFor('julia', { ally: 'elsa', villain: 'tiamat' })?.id, 'snow');
  assert.equal(outfitFor('julia', { ally: 'anna', villain: 'tiamat' })?.id, 'snow');
});

test('outfits: the default episode keeps her rainbow twirl dress', () => {
  assert.equal(outfitFor(EPISODE_DEFAULTS.hero, EPISODE_DEFAULTS), null);
});

test('outfits: every outfit is for a roster character, keyed on roster characters, with its images drawn', () => {
  for (const [character, outfits] of Object.entries(OUTFITS)) {
    assert.ok(CHARACTER_BY_ID[character], `${character} is in the roster`);
    for (const o of outfits) {
      assert.ok(ART_BY_ID[o.art], `${character}/${o.id}: ${o.art} is an art asset`);
      assert.ok(ART_BY_ID[o.face], `${character}/${o.id}: ${o.face} is an art asset`);
      for (const who of [...(o.when.ally ?? []), ...(o.when.villain ?? [])]) assert.ok(CHARACTER_BY_ID[who], `${character}/${o.id}: ${who} is in the roster`);
      assert.ok(o.when.ally?.length || o.when.villain?.length, `${character}/${o.id} says when it applies`);
    }
  }
});
