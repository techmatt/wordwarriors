/**
 * Item 085 (Matt's playtest): the sentence room's pass 2 is one green, not
 * one green per word. Her first green reads the whole sentence, each frame
 * word lit and said in order; the key word lights in silence and is sounded
 * out unit by unit, never said whole. Her next green takes the picture she
 * stands at: a wrong one retries gently, the right one gets the full read
 * with the key word.
 */

import { test, expect } from '@playwright/test';
import { tokenWord } from '../content/phonics/sentences';
import { boot, choose, collectErrors, expectNoErrors, press, seedSolidFrames, until } from './harness';

test('sentence room: one green reads the sentence and sounds out the key word; the next green on a picture answers', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  // Solid frames at difficulty 2 skip the listening pass: straight to her turn.
  await seedSolidFrames(page);
  await boot(page, '?scene=room&slot=a&nojourney=1&difficulty=2');
  const read = await until(page, (st) => st.room?.sentence?.pass === 'read' && !st.room.locked, 30_000, 'read pass');
  const sent = read.room!.sentence!;
  const key = sent.key;
  const keyIndex = sent.tokens.length - 1;
  expect(sent.readLit).toEqual([]);
  expect(read.room!.spots.length).toBe(0);
  const h0 = read.voice.history.length;

  // One green: the whole read, then the pedestals wake.
  await press(page, 'green');
  const find = await until(page, (st) => st.room?.sentence?.pass === 'find' && (st.room.spots.length ?? 0) === 3 && !st.room.locked, 30_000, 'find pass');
  const heard = find.voice.history.slice(h0);
  // Every token lit in order, the key word last.
  expect(find.room!.sentence!.readLit).toEqual(sent.tokens.map((_, i) => i));
  expect(find.room!.sentence!.index).toBe(keyIndex);
  // Every frame word's own line, in order, and never the key word.
  const frameLines = sent.tokens.slice(0, -1).map((t) => `word_${tokenWord(t)}`);
  expect(heard.filter((id) => id.startsWith('word_'))).toEqual(frameLines);
  expect(heard).not.toContain(`word_${key}`);
  // Then the key word's sounds, after the last frame word: letter sounds only.
  const lastWord = heard.lastIndexOf(frameLines.at(-1)!);
  const sounds = heard.slice(lastWord + 1).filter((id) => /^letter_.*_sound$/.test(id));
  expect(sounds.length).toBeGreaterThan(0);
  expect(heard.slice(0, lastWord).some((id) => /^letter_/.test(id))).toBe(false);
  expect(heard.some((id) => /^letter_.*_name$/.test(id))).toBe(false);

  // A wrong picture: the gentle retry, still finding, nothing fetched, key word unsaid.
  const wrong = find.room!.spots.find((sp) => sp.correct === false)!;
  const h1 = find.voice.history.length;
  await choose(page, wrong.id);
  const soundsSince = (h: string[]) => h.slice(h1).filter((id) => /^letter_.*_sound$/.test(id));
  const after = await until(
    page,
    (st) => st.voice.history.some((id) => /^nar_.*_wrong_\d$/.test(id)) && soundsSince(st.voice.history).length >= sounds.length && !st.room?.locked,
    30_000,
    'wrong line, sounded out again, retry open',
  );
  expect(after.room?.sentence?.pass).toBe('find');
  // The miss sounds the key word out again: the same units as the read's.
  expect(soundsSince(after.voice.history)).toEqual(sounds);
  expect(after.episode.fetched).not.toContain(key);
  expect(after.voice.history).not.toContain(`word_${key}`);

  // The right one: the whole sentence back, and only now the key word.
  await choose(page);
  const done = await until(page, (st) => st.voice.history.includes(`word_${key}`), 30_000, 'key word confirmation');
  const tail = done.voice.history;
  const at = tail.lastIndexOf(`word_${key}`);
  expect(tail.slice(0, at).some((id) => id.startsWith('sent_'))).toBe(true);
  expect(done.room?.sentence?.pass).toBe('done');
  expectNoErrors(errors);
});
