/**
 * The dialogue box never sits over the thing its line sends her to (item 039),
 * checked with the bug-hunt checker's own probe and layout check
 * (`src/qa/probe.ts`, `tests/qa/checks.ts`): the hub's circle as "Stand in the
 * circle..." plays, the word machine's tiles as "Walk on a letter..." plays.
 * Both things pop in as their line starts, which is how the box came to cover them.
 * Untagged (`npm run test:browser`) since item 061 (5-6 s each at clock speed 5).
 */

import { test, expect } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, until } from './harness';
import { layoutIssues, type Layout } from './qa/checks';
import { qaLayout as layout } from './qa/probe';

/** The box's word texts as one rectangle: left, top, right, bottom. */
function boxOf(l: Layout): [number, number, number, number] | null {
  const words = l.texts.filter((t) => t.depth >= l.hudDepth && /[A-Z]/.test(t.text));
  if (!words.length) return null;
  return [Math.min(...words.map((t) => t.b[0])), Math.min(...words.map((t) => t.b[1])), Math.max(...words.map((t) => t.b[2])), Math.max(...words.map((t) => t.b[3]))];
}

test('hub: "stand in the circle" keeps the box off the circle', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=house&nojourney=1&qa=1');
  const s = await until(page, (st) => st.scene === 'Hub' && /_circle$/.test(st.voice.speaking ?? ''), 90_000, 'the circle line');
  await page.waitForTimeout(300);
  const l = await layout(page);
  const box = boxOf(l);
  expect(box, 'the circle line is captioned').not.toBeNull();
  // The circle stands at HUB.circle (640, 560): its middle is above its spot.
  expect(box![3] < 560 - 80 || box![1] > 560, `box ${box} clear of the circle`).toBe(true);
  expect(layoutIssues(l, s.scene, new Set()).filter((i) => i.kind === 'target-covered')).toEqual([]);
  expectNoErrors(errors);
});

test('word machine: "walk on a letter" keeps the box off the tiles', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&game=word_machine&nojourney=1&qa=1');
  await until(page, (st) => st.scene === 'WordMachine' && /_machine_go$/.test(st.voice.speaking ?? ''), 90_000, 'the go line');
  await page.waitForTimeout(300);
  const l = await layout(page);
  const box = boxOf(l);
  expect(box, 'the go line is captioned').not.toBeNull();
  // The tiles stand in a row at y 640, about 130 px tall.
  expect(box![3] < 640 - 130, `box ${box} above the tiles`).toBe(true);
  expectNoErrors(errors);
});
