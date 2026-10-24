/**
 * Item 137: two episodes in a row from the title, as Matt played them, draw
 * different games in every room. The first is skipped through with F2 to
 * THE END and Dad's 2; the second's plan is the title's own draw, from the
 * progress store the first left. No side room plays a game either side room
 * played (every fetch frame the one sentence game), nor the attic its frame.
 */

import { test, expect, type Page } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, press, state, until, type WWState } from './harness';

const side = (g: string) => (g.startsWith('sentence:') ? 'sentence' : g);

/** From the title into the bedroom: the episode's plan, once it is remembered. */
async function intoBedroom(page: Page): Promise<string[]> {
  await until(page, (st) => st.scene === 'Title', 30_000, 'the title');
  await page.waitForTimeout(500);
  await press(page, 'green');
  const s = await until(page, (st) => st.scene === 'Bedroom' && Boolean(st.episode.house.plan) && Boolean(st.progress.recent?.last_games), 30_000, 'the bedroom, its plan remembered');
  const games = s.episode.house.plan!.map((p) => p.game);
  expect(s.progress.recent.last_games).toEqual([games.join(' ')]);
  return games;
}

/** F2 through every step to THE END, then Dad's 2: the title again. */
async function skipToTitle(page: Page): Promise<void> {
  for (let i = 0; i < 40; i++) {
    const s: WWState = await state(page);
    if (s.scene === 'TheEnd' && s.theEnd?.dad) break;
    const at = `${s.scene}:${s.episode.stepIndex}`;
    await page.keyboard.press('F2');
    await until(page, (st) => `${st.scene}:${st.episode.stepIndex}` !== at && st.scene !== 'Wait', 30_000, `past ${at}`);
  }
  await until(page, (st) => st.scene === 'TheEnd' && Boolean(st.theEnd?.dad), 30_000, 'THE END');
  await page.keyboard.press('Digit2');
}

test('two episodes in a row from the title draw different games in every room (item 137)', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?cast=random&games=all&nojourney=1');
  const one = await intoBedroom(page);
  await skipToTitle(page);
  const two = await intoBedroom(page);
  for (const g of two.slice(0, 2)) expect(one.slice(0, 2).map(side), `${two.join(' ')} after ${one.join(' ')}`).not.toContain(side(g));
  expect(two[2]).not.toBe(one[2]);
  expectNoErrors(errors);
});
