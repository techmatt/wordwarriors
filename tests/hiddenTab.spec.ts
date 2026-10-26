/**
 * A hidden tab (item 080; moved from the hunt specs in item 159): the page is
 * told the tab switched away and back (`setHidden`, tests/harness.ts), and the
 * voice holds while it is away. THE END through a hidden tab is in
 * `tests/ending.spec.ts`; the bug-hunt checker's `hide` runs (`hidden_tab`, ...) hide one again and again.
 */

import { test, expect } from '@playwright/test';
import { boot, collectErrors, expectNoErrors, setHidden, state, until } from './harness';

test('a hidden tab holds the voice: the line playing does not end until the tab is back', async ({ page }) => {
  const errors = collectErrors(page);
  // Real voice (item 083): the test is about a playing line's audio.
  await boot(page, '?scene=bedroom', undefined, { voice: 'real' });
  const s = await until(page, (st) => st.scene === 'Bedroom' && Boolean(st.voice.speaking), 30_000, 'a bedroom line');
  const id = s.voice.speaking;
  await setHidden(page, true);
  // Longer than any bedroom line at test speed, backstop and all.
  await page.waitForTimeout(3000);
  expect((await state(page)).voice.speaking, 'the line waits while hidden').toBe(id);
  await setHidden(page, false);
  await until(page, (st) => st.voice.speaking !== id, 20_000, 'the line ends once the tab is back');
  expectNoErrors(errors);
});
