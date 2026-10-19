/**
 * Forms (content/battle/forms.ts): which images a character appears as in an
 * episode. Pure data and one lookup, so no browser.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ART_BY_ID } from '../../content/art/assets';
import { FORMS, formFor } from '../../content/battle/forms';
import { CHARACTER_BY_ID } from '../../content/battle/roster';
import { EPISODE_DEFAULTS } from '../../src/config';

test('forms: Julia is a chef when Dada Jason is the ally, else her default images', () => {
  assert.equal(formFor('julia', { ally: 'dada_jason', villain: 'tiamat' })?.art, 'char_julia_chef');
  assert.equal(formFor('julia', { ally: 'dada_jason', villain: 'rilla' })?.face, 'face_julia_chef');
  assert.equal(formFor('julia', { ally: 'ellie', villain: 'tiamat' }), null);
  assert.equal(formFor('julia', { ally: null, villain: 'tiamat' }), null);
  assert.equal(formFor('ellie', { ally: 'dada_jason', villain: 'tiamat' }), null);
});

test('forms: the default episode keeps her rainbow twirl dress', () => {
  assert.equal(formFor(EPISODE_DEFAULTS.hero, EPISODE_DEFAULTS), null);
});

test('forms: every form is for a roster character, keyed on roster characters, with its images drawn', () => {
  for (const [character, forms] of Object.entries(FORMS)) {
    assert.ok(CHARACTER_BY_ID[character], `${character} is in the roster`);
    for (const f of forms) {
      assert.ok(ART_BY_ID[f.art], `${character}/${f.id}: ${f.art} is an art asset`);
      if (f.face) assert.ok(ART_BY_ID[f.face], `${character}/${f.id}: ${f.face} is an art asset`);
      for (const who of [f.when.ally, f.when.villain]) if (who) assert.ok(CHARACTER_BY_ID[who], `${character}/${f.id}: ${who} is in the roster`);
      assert.ok(f.when.ally !== undefined || f.when.villain !== undefined, `${character}/${f.id} says when it applies`);
    }
  }
});
