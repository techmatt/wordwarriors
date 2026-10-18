/**
 * Two whole episodes back to back, the way she will play on a good morning:
 * Victory, green, and straight into the next one. Catches anything that
 * only breaks on the second run of a scene (listeners, stale state, leaks).
 * @slow, about ten minutes.
 */

import { test, expect } from '@playwright/test';

import { boot, choose, collectErrors, expectNoErrors, playBattle, playMinigame, press, state, until } from './harness';

async function episode(page: import('@playwright/test').Page, hero: string, ally: string, villain: string): Promise<void> {
  await until(page, (s) => s.scene === 'Pick' && s.step.what === 'hero', 30_000, 'hero pick');
  await choose(page, hero);
  await until(page, (s) => s.step.what === 'ally', 30_000, 'ally pick');
  await choose(page, ally);
  await until(page, (s) => s.step.what === 'villain', 30_000, 'villain pick');
  await choose(page, villain);
  await playMinigame(page);
  await until(page, (s) => s.step.kind === 'prep' && (s.step as { index?: number }).index === 1, 60_000, 'second prep');
  await playMinigame(page);
  await until(page, (s) => s.scene === 'Battle', 60_000, 'battle 1');
  await playBattle(page, 1);
  await choose(page, 'forge');
  await playMinigame(page);
  await until(page, (s) => s.scene === 'Battle', 60_000, 'battle 2');
  await playBattle(page, 2);
  await until(page, (s) => s.scene === 'Victory', 30_000, 'victory');
}

test('two episodes back to back @slow', async ({ page }) => {
  test.setTimeout(1_500_000);
  const errors = collectErrors(page);
  await boot(page);
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(500);
  await press(page, 'green');
  await episode(page, 'julia', 'nobody', 'smaug');
  const heap1 = await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0);

  // Victory: green when the dot appears, then the title, then green again.
  await until(page, (s) => s.scene === 'Victory' && !s.voice.busy, 90_000, 'victory quiet');
  await page.waitForTimeout(600);
  await press(page, 'green');
  await until(page, (s) => s.scene === 'Title', 30_000, 'title again');
  await page.waitForTimeout(800);
  await press(page, 'green');
  await episode(page, 'anna', 'elsa', 'scar');

  const end = await state(page);
  expect(end.progress.episodes).toBe(1);
  const heap2 = await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0);
  console.log(`heap after episode 1: ${(heap1 / 1e6).toFixed(0)} MB, after episode 2: ${(heap2 / 1e6).toFixed(0)} MB`);
  expectNoErrors(errors);
});
