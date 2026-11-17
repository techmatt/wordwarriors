/**
 * `art:pick`'s edits to content/art/prompts.ts (item 191): a brief becomes a
 * `PICTURES` line, and a pick note says which candidate is `current`.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { getEntry, noteWithCurrent, pictureFromBrief, setEntry } from '../../tools/art/promote';

test('art:pick: a brief loses the boilerplate `derived` adds back', () => {
  const brief =
    'A single clear picture of a ball: one standard black-and-white soccer ball, round and plain. (Note: the bedroom already shows a beach ball.) Centred, instantly recognisable to a 4-year-old as BALL. NO TEXT, LETTERS OR NUMBERS anywhere: it is the answer to a reading question. Nothing else in the picture.';
  assert.equal(pictureFromBrief(brief), 'a ball: one standard black-and-white soccer ball, round and plain. (Note: the bedroom already shows a beach ball.)');
  assert.equal(pictureFromBrief('a cat: a ginger cat, sitting.'), 'a cat: a ginger cat, sitting');
});

test('art:pick: PICTURES and PICK_NOTES entries are set in place, a trailing comment kept, a new key added', () => {
  const src = readFileSync('content/art/prompts.ts', 'utf8');
  const cat = setEntry(src, 'PICTURES', 'cat', "a cat: a cat's \"best\" pose");
  assert.equal(getEntry(cat, 'PICTURES', 'cat'), "a cat: a cat's \"best\" pose");
  assert.equal(cat.split('\n').length, src.split('\n').length);
  const splash = setEntry(src, 'PICTURES', 'splash', 'a splash');
  assert.match(splash, /^ {2}splash: "a splash", {2}\/\/ Item 126/m);
  const added = setEntry(src, 'PICTURES', 'zzz', 'a zzz');
  assert.equal(getEntry(added, 'PICTURES', 'zzz'), 'a zzz');
  assert.equal(getEntry(added, 'PICK_NOTES', 'zzz'), undefined);
});

test('art:pick: a note\'s `current` sentence is replaced, or added after the first sentence', () => {
  const now = '`current` is candidate 2 of art_alts_200, promoted by art:pick on 2026-11-17.';
  assert.equal(
    noteWithCurrent("New word TEDDY (item 188). `current` is candidate 1, promoted by item 189 (Matt's pick in art_alts_188): a golden teddy. `0` is the painted placeholder.", now),
    `New word TEDDY (item 188). ${now} \`0\` is the painted placeholder.`,
  );
  assert.equal(noteWithCurrent('New word BALL (item 188). Watch: it should read as ball.', now), `New word BALL (item 188). ${now} Watch: it should read as ball.`);
  assert.equal(noteWithCurrent(undefined, now), now);
  // A sentence after it that starts with a number stays (prop_fight_trophy's "1 was item 031's promotion").
  assert.equal(noteWithCurrent("Over the winner. `current` is candidate 3, Matt's pick. 1 was item 031's promotion.", now), `Over the winner. ${now} 1 was item 031's promotion.`);
});
