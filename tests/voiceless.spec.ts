/**
 * M19 (item 082): with no voice manifest (a fresh checkout before `voice:build`,
 * a broken junction) the game runs mute but every line still shows its caption,
 * its text from `content/voice/lines.json`.
 */

import { test, expect } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, texts, until } from './harness';

test('no voice manifest: the title\'s line still shows its caption', async ({ page }) => {
  const errors = collectErrors(page);
  await page.route('**/voice-gen/manifest.json', (route) => route.fulfill({ status: 404, body: '' }));
  await boot(page);
  await until(page, (s) => s.scene === 'Title' && s.voice.speaking === 'core_title', 30_000, 'the title speaking');
  await expect.poll(async () => (await texts(page)).map((t) => t.text).join(' '), { timeout: 10_000 }).toContain('WELCOME,');
  expectNoErrors(errors);
});
