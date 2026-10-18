/**
 * One whole episode, title to victory, played through the virtual pad and the
 * spelling keyboard. Slow (several minutes of real voice), so it is @slow.
 */

import { test, expect } from '@playwright/test';

import { boot, choose, collectErrors, expectNoErrors, playBattle, playMinigame, press, state, until } from './harness';

test('a full episode plays end to end @slow', async ({ page }) => {
  test.setTimeout(900_000);
  const errors = collectErrors(page);
  await boot(page);
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(500);
  await press(page, 'green');

  await until(page, (s) => s.scene === 'Pick' && s.step.what === 'hero', 30_000, 'hero pick');
  await choose(page, 'julia');
  await until(page, (s) => s.step.what === 'ally', 30_000, 'ally pick');
  await choose(page, 'seraphina');
  await until(page, (s) => s.step.what === 'villain', 30_000, 'villain pick');
  await choose(page, 'bavmorda');

  await until(page, (s) => s.scene === 'Alarm', 30_000, 'alarm');
  const alarm = await until(page, (s) => s.scene !== 'Alarm', 60_000, 'end of alarm');
  expect(alarm.voice.history).toContain('nar_seraphina_alarm_hero_julia');
  expect(alarm.voice.history).toContain('nar_seraphina_alarm_villain_bavmorda');

  await playMinigame(page);
  await until(page, (s) => s.step.kind === 'prep' && (s.step as { index?: number }).index === 1, 30_000, 'second prep');
  await playMinigame(page);

  const b1 = await until(page, (s) => s.scene === 'Battle', 30_000, 'battle 1');
  expect(b1.battle?.part).toBe(1);
  const afterB1 = await playBattle(page, 1);
  expect(afterB1.scene).toBe('Retreat');
  expect(afterB1.battle?.heroes.every((h) => h.status === 'floored')).toBe(true);
  expect(afterB1.battle?.ultimates).toBe(1);
  expect(afterB1.battle?.movePicks).toBe(2);

  await choose(page, 'forge');
  await until(page, (s) => s.scene === 'Spelling', 30_000, 'spelling');
  await playMinigame(page);

  await until(page, (s) => s.scene === 'Battle', 30_000, 'battle 2');
  const afterB2 = await playBattle(page, 2);
  expect(afterB2.scene).toBe('Victory');
  expect(afterB2.battle?.villains[0]?.hp).toBe(0);
  expect(afterB2.episode.made).toEqual({ gem: expect.any(Boolean), ammo: expect.any(Boolean), helper: expect.any(Boolean), item: true });

  const end = await state(page);
  expect(Object.keys(end.progress.words).length).toBeGreaterThan(3);
  expectNoErrors(errors);
});

