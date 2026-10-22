/**
 * The bug-hunt checker's in-page probe (`?qa=1`, src/qa/), read from a test: its
 * layout now, and what it logged since a time. Kept out of the harness, since
 * checks.ts (whose types these are) imports the harness's WWState.
 */

import type { Page } from '@playwright/test';

import type { Layout, Since } from './checks';

/** The probe's layout: every image and text on screen with its box. */
export function qaLayout(page: Page): Promise<Layout> {
  return page.evaluate(() => (window as unknown as { __wwqa: { layout(): Layout } }).__wwqa.layout());
}

/** What the probe logged since `t` (its own clock; `now` is where it stands). */
export function qaSince(page: Page, t: number): Promise<Since> {
  return page.evaluate((from) => (window as unknown as { __wwqa: { since(t: number): Since } }).__wwqa.since(from), t);
}
