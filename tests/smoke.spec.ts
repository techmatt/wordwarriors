/**
 * The fast suite: one page boot per test, many asserts each. Every scene is
 * reached directly with `?scene=`, so a failure points at one step.
 */

import { test, expect } from '@playwright/test';

import { boot, choose, collectErrors, expectNoErrors, playBattle, press, state, typeLetter, until, walkTo } from './harness';

test('title boots, green starts the hero pick, F9 opens the grown-ups page', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.keyboard.press('F9');
  await until(page, (s) => s.scene === 'Parent', 10_000, 'parent page');
  await press(page, 'red');
  await until(page, (s) => s.scene === 'Title', 10_000, 'back to title');
  await page.waitForTimeout(300);
  await press(page, 'green');
  const s = await until(page, (st) => st.scene === 'Pick' && st.step.what === 'hero', 15_000, 'hero pick');
  expect(s.room?.spots.map((x) => x.id)).toContain('julia');
  expectNoErrors(errors);
});

test('mashing green on a pick picks once, and the next room still runs', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=pick&nojourney=1');
  const s = await until(page, (st) => st.scene === 'Pick' && Boolean(st.room && !st.room.locked), 30_000, 'hero pick');
  const elsa = s.room!.spots.find((sp) => sp.id === 'elsa')!;
  await walkTo(page, elsa.x, elsa.y + 12);
  for (let i = 0; i < 4; i++) {
    await press(page, 'green');
    await page.waitForTimeout(120);
  }
  const ally = await until(page, (st) => st.step.what === 'ally' && Boolean(st.room && !st.room.locked), 30_000, 'ally pick');
  expect(ally.episode.hero).toBe('elsa');
  // The ally room must be alive: walking still moves her.
  const before = ally.room!.player.x;
  await walkTo(page, before + 150, ally.room!.player.y);
  expect(errors).toEqual([]);
});

test('F9 out of a minigame and back: the room restarts cleanly', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=sound&hero=julia&villain=smaug');
  await until(page, (s) => s.room?.round.startsWith('sound:0:') === true && !s.room.locked, 60_000, 'first item');
  await page.keyboard.press('F9');
  await until(page, (s) => s.scene === 'Parent', 10_000, 'parent');
  await press(page, 'red');
  await until(page, (s) => s.scene === 'SoundToLetter' && s.room?.round.startsWith('sound:0:') === true && !s.room.locked, 60_000, 'room again');
  await choose(page);
  await until(page, (s) => s.room?.round.startsWith('sound:1:') === true, 60_000, 'second item');
  expectNoErrors(errors);
});

test('Sound to Letter: a wrong stone costs nothing, a right one advances and is recorded', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=sound&hero=julia&ally=elsa&villain=smaug');
  const first = await until(page, (s) => s.scene === 'SoundToLetter' && s.room?.round.startsWith('sound:0:') === true && !s.room.locked, 60_000, 'first item');
  const target = first.room!.round.split(':')[2]!;

  // Wrong first: same item stays up, a funny line plays.
  const wrong = first.room!.spots.find((sp) => sp.correct === false)!;
  await walkTo(page, wrong.x, wrong.y + 12);
  await press(page, 'green');
  const after = await until(page, (s) => s.voice.history.some((id) => /_wrong_\d$/.test(id)), 20_000, 'wrong line');
  expect(after.room?.round).toBe(first.room!.round);

  await choose(page);
  const next = await until(page, (s) => s.room?.round.startsWith('sound:1:') === true, 60_000, 'second item');
  expect(next.progress.sounds[target]?.seen).toBe(1);
  expect(next.voice.history).toContain(`letter_${target}_sound`);
  expectNoErrors(errors);
});

test('Spell the Spell: ghost boxes fill only with the right letter', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=spell&hero=julia&villain=bavmorda');
  const s = await until(page, (st) => st.scene === 'Spelling' && Boolean(st.room?.spelling) && !st.room!.locked, 60_000, 'first word');
  const word = s.room!.spelling!.word;
  expect(word).toBe('sun');
  await typeLetter(page, 'z');
  await page.waitForTimeout(200);
  expect((await state(page)).room?.spelling?.filled).toBe(0);
  for (const ch of word) {
    await typeLetter(page, ch);
    await page.waitForTimeout(150);
  }
  await until(page, (st) => st.room?.spelling?.word === 'pin', 60_000, 'second word');
  expectNoErrors(errors);
});

test('Word to Picture: the word is not spoken until she answers', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=picture&hero=anna&ally=jasmine&villain=ozymandias');
  const s = await until(page, (st) => st.room?.round.startsWith('picture:0:') === true && !st.room.locked, 60_000, 'first item');
  const word = s.room!.round.split(':')[2]!;
  expect(s.voice.history).not.toContain(`word_${word}`);
  await choose(page);
  await until(page, (st) => st.voice.history.includes(`word_${word}`), 30_000, 'confirmation');
  expectNoErrors(errors);
});

test('Battle part 2: a wrong and a right move pick, counter-item, finish, victory', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=2&hero=elsa&ally=anna&villain=scar');
  await until(page, (s) => s.scene === 'Battle', 30_000, 'battle');
  await playBattle(page, 2, true);
  const end = await until(page, (s) => s.scene === 'Victory', 30_000, 'victory');
  // The wrong pick fired a plainer move and cost nothing; it is recorded as a miss.
  const missed = Object.values(end.progress.words).some((st) => st.recent.includes(false));
  expect(missed).toBe(true);
  expect(end.scene).toBe('Victory');
  expect(end.battle?.ultimates).toBe(1);
  expect(end.battle?.movePicks).toBe(2);
  expect(end.battle?.combos).toBe(1);
  expect(end.battle?.villains[0]?.hp).toBe(0);
  expect(end.battle!.abilitiesFired).toBeGreaterThan(20);
  expect(end.fx.hitstops).toBeGreaterThan(0);
  expect(end.voice.history.some((id) => id.startsWith('taunt_'))).toBe(true);
  expectNoErrors(errors);
});
