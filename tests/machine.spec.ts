/**
 * Item 026: the word machine. Untagged (`npm run test:browser`): the room opens right. Slow lane: a
 * room of it played by the virtual pad (a silly tile first, then every word),
 * checking the speech rule on the voice history; F9 out and back mid-visit;
 * its whole episode behind door a is tests/drawn.spec.ts's, shared with the
 * Stretchy Bridge (item 081). Screenshots land in tests/screenshots/ (ignored) for a look.
 */

import { test, expect } from '@playwright/test';

import { SLOW, bagged, boot, choose, collectErrors, expectNoErrors, playWordMachine, press, shotIn, state, toParentAndBack, until } from './harness';
import { letterSoundLine, rimeLine, sillyLine, wordLine } from '../content/voice/ids';

const shot = shotIn('026');

test('the word machine opens: a picture, a rime, a tile per onset, and no word said', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&game=word_machine');
  const s = await until(page, (st) => st.scene === 'WordMachine' && st.room?.machine?.phase === 'pick' && !st.room.locked, 30_000, 'first round open');
  const m = s.room!.machine!;
  expect(m.family).toContain(m.word);
  expect(s.room!.spots.map((sp) => sp.id).sort()).toEqual(m.tiles.map((t) => `tile_${t.letter}`).sort());
  expect(s.room!.spots.filter((sp) => sp.correct)).toHaveLength(1);
  // The intro and the instruction, and nothing that says a word yet.
  expect(s.voice.history.some((id) => id.endsWith('_machine_intro'))).toBe(true);
  expect(s.voice.history.filter((id) => id.startsWith('word_') || id.startsWith('silly_'))).toEqual([]);
  expectNoErrors(errors);
});

test('the word machine: tiles say their sounds, a silly tile giggles and pops out, each word is said only once built', SLOW, async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&game=word_machine');
  const open = await until(page, (s) => s.scene === 'WordMachine' && s.room?.machine?.phase === 'pick' && !s.room.locked, 60_000, 'first round open');
  const m = open.room!.machine!;
  await shot(page, 'round1');
  expect(m.mode).toBe('make');
  expect(m.rounds.length).toBeGreaterThanOrEqual(3);
  // Several rounds through one family, then another: the first two share a rime.
  expect(m.rounds[1]!.slice(1)).toBe(m.rounds[0]!.slice(1));
  expect(new Set(m.rounds.map((w) => w.slice(1))).size).toBeGreaterThan(1);
  // The tiles: the right one and silly ones, upper case letters on the floor.
  expect(m.tiles.filter((t) => t.makes === m.word)).toHaveLength(1);
  expect(m.tiles.filter((t) => !t.real).length).toBeGreaterThanOrEqual(1);
  // No built word said yet, and nothing is ever blended: no line says the word but its own.
  expect(open.voice.history.filter((id) => id.startsWith('word_'))).toEqual([]);

  // A silly tile: the two parts, then "That makes... ZAT! A silly word!", and it pops back out.
  const silly = m.tiles.find((t) => !t.real)!;
  await choose(page, `tile_${silly.letter}`);
  const giggled = await until(page, (s) => (s.room?.machine?.misses ?? 0) === 1 && s.room!.machine!.phase === 'pick' && !s.room!.locked, 60_000, 'silly word, round open again');
  const h = giggled.voice.history;
  // In order (other lines may come between): the tile's sound, the rime, "that makes...", the silly word.
  const inOrder = (want: ((id: string) => boolean)[]) => {
    let i = 0;
    for (const id of h) if (i < want.length && want[i]!(id)) i++;
    return i === want.length;
  };
  expect(inOrder([(id) => id === letterSoundLine(silly.letter), (id) => id === rimeLine(m.rime), (id) => id.endsWith('_machine_makes'), (id) => id === sillyLine(silly.makes)]), h.join(' ')).toBe(true);
  expect(h).not.toContain(wordLine(m.word));
  expect(giggled.room!.spots.map((s) => s.id)).toContain(`tile_${silly.letter}`);
  expect(giggled.episode.fetched).toEqual([]);
  await shot(page, 'silly');

  // Yellow: the word in parts, never blended.
  const before = (await state(page)).voice.history.length;
  await press(page, 'yellow');
  const hinted = await until(page, (s) => s.voice.history.slice(before).includes(rimeLine(m.rime)) && !s.room!.locked, 30_000, 'hint said');
  expect(hinted.voice.history.slice(before).slice(-2)).toEqual([letterSoundLine(m.word[0]), rimeLine(m.rime)]);

  // The right tile, then the rest of the visit.
  const right = m.tiles.find((t) => t.makes === m.word)!;
  await choose(page, `tile_${right.letter}`);
  const built = await until(page, (s) => s.episode.read.includes(m.word) && s.voice.history.includes(wordLine(m.word)), 60_000, 'first word built and said');
  const bh = built.voice.history;
  expect(bh.lastIndexOf(wordLine(m.word))).toBeGreaterThan(bh.lastIndexOf(rimeLine(m.rime)));
  expect(built.episode.fetched).toEqual(bagged([m.word]));
  const round2 = await until(page, (s) => s.room?.machine?.index === 1 && s.room.machine.phase === 'pick', 60_000, 'round 2');
  // Hunt 9: stepped up out of the new tiles' reach, she is beside the machine, not in front of its plate's word.
  const me = round2.room!.player;
  expect(Math.abs(me.x - 640) > 200 || me.y > 560, `beside the machine or down at the tiles: (${me.x}, ${me.y})`).toBe(true);
  await shot(page, 'round2');

  // Every later word: said only after it is built.
  for (let i = 1; i < m.rounds.length; i++) {
    const s = await until(page, (st) => st.room?.machine?.index === i && st.room.machine.phase === 'pick' && !st.room.locked, 60_000, `round ${i}`);
    expect(s.voice.history).not.toContain(wordLine(m.rounds[i]));
    const tile = s.room!.machine!.tiles.find((t) => t.makes === m.rounds[i])!;
    await choose(page, `tile_${tile.letter}`);
    await until(page, (st) => st.episode.read.includes(m.rounds[i]!), 60_000, `${m.rounds[i]} built`);
  }
  const back = await until(page, (s) => s.scene === 'Hub', 60_000, 'back in the hub');
  expect(back.episode.fetched).toEqual(bagged(m.rounds));
  expect(back.episode.house.done).toContain('a');
  for (const w of m.rounds) expect(back.episode.read).toContain(w);
  // Progress per rime and per first sound; the first word missed once, the rest right first time.
  expect(back.progress.rimes?.[m.rime]?.seen).toBeGreaterThanOrEqual(1);
  expect(back.progress.onsets?.[m.word[0]!]?.recent[0]).toBe(false);
  expect(back.progress.bag?.left).toContain(m.word);
  for (const w of m.rounds.slice(1)) expect(back.progress.bag?.left).not.toContain(w);
  await shot(page, 'hub_badge');
  expectNoErrors(errors);
});

test('F9 mid-visit and back: the machine goes on from the next word, nothing fetched twice', SLOW, async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&game=word_machine');
  const open = await until(page, (s) => s.room?.machine?.phase === 'pick' && !s.room.locked, 60_000, 'first round open');
  const m = open.room!.machine!;
  await choose(page, `tile_${m.tiles.find((t) => t.makes === m.word)!.letter}`);
  await until(page, (s) => s.room?.machine?.index === 1 && s.room.machine.phase === 'pick' && !s.room.locked, 60_000, 'round 2');
  await toParentAndBack(page);
  const back = await until(page, (s) => s.scene === 'WordMachine' && s.room?.machine?.phase === 'pick' && !s.room.locked, 60_000, 'back in the machine');
  expect(back.room!.machine!.index).toBe(1);
  expect(back.episode.fetched).toEqual(bagged([m.word]));
  const rest = await playWordMachine(page);
  const hub = await until(page, (s) => s.scene === 'Hub', 30_000, 'hub');
  expect(hub.episode.fetched).toEqual(bagged(rest));
  expectNoErrors(errors);
});

test('the harness plays the machine wrong-first; its door then wears the last word built', SLOW, async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&game=word_machine');
  const words = await playWordMachine(page, true);
  const hub = await until(page, (s) => s.scene === 'Hub', 30_000, 'hub');
  const a = hub.episode.house.plan!.find((p) => p.slot === 'a')!;
  expect(a.key).toBe(words.at(-1));
  expectNoErrors(errors);
});
