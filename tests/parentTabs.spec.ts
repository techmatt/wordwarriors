/**
 * Item 144 (M72): two tabs. A write to the store in one tab reaches the other through the `storage` event
 * (src/state/progress.ts), so the stale tab builds on it instead of writing back over it. The rule: tests/unit/storeTabs.test.ts.
 */

import { test, expect } from '@playwright/test';

import { STORE_KEY } from '../src/state/ProgressStore';
import { boot, collectErrors, expectNoErrors, press, state, texts, until } from './harness';
import { layoutIssues } from './qa/checks';
import { qaLayout } from './qa/probe';

test('a store written in another tab is re-read in this one', async ({ page, context }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=parent&qa=1');
  await until(page, (s) => s.scene === 'Parent', 30_000, 'the grown-ups page');
  const other = await context.newPage();
  // Same origin as the game's tab, without booting a second game: a stub page served by the route.
  const blank = new URL('/__other_tab__', page.url()).href;
  await other.route(blank, (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>other tab</title>' }));
  await other.goto(blank);
  await other.evaluate(([key]) => {
    const blob = JSON.parse(localStorage.getItem(key!) ?? '{"version":1}') as { episodes?: number };
    localStorage.setItem(key!, JSON.stringify({ ...blob, version: 1, episodes: 7 }));
  }, [STORE_KEY]);
  await until(page, (s) => s.progress.episodes === 7, 10_000, "the other tab's episodes");
  expect((await state(page)).progress.episodes).toBe(7);
  expectNoErrors(errors);
});

// Item 144 (M69): page 1's first sounds have one VOWEL row (no '–'), and page 2's grid has the move words before she meets them.
test('the grown-ups page on a fresh store: one VOWEL first-sound row, and the move words in the every-word grid', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=parent&qa=1');
  await until(page, (s) => s.scene === 'Parent', 30_000, 'the grown-ups page');
  await page.waitForTimeout(300);
  const one = (await texts(page)).map((t) => t.text);
  expect(one.filter((t) => /^VOWEL +\d+·0·0$/.test(t)).length).toBe(1);
  expect(one.some((t) => t.startsWith('–'))).toBe(false);
  await press(page, 'green');
  await until(page, (s) => s.scene === 'Parent', 30_000, 'page 2');
  await page.waitForTimeout(300);
  const two = (await texts(page)).map((t) => t.text);
  for (const w of ['jump', 'splash', 'zap']) expect(two.some((t) => new RegExp(`^${w}( NEW)?  0 · – · 0`).test(t)), w).toBe(true);
  const bad = layoutIssues(await qaLayout(page), 'Parent', new Set()).filter((i) => i.kind === 'text-offscreen' || i.kind === 'text-overlap');
  expect(bad.map((i) => i.detail)).toEqual([]);
  expectNoErrors(errors);
});
