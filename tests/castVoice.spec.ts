/**
 * Item 150: Matt played with Jasmine in the cast on a slow dev server and saw
 * the Wait screen, lines starting late and Jasmine's not said at all. Two checks,
 * with real voice: a whole episode with Jasmine as the helper (her ~660 narrator
 * clips) shows no Wait screen and no late line; and through a server 300 ms slow
 * a file (a proxy here), the title is up in seconds and every line still starts
 * within a server's answer or two. The cause there: the voice bank's twelve
 * background fetches held all six of the host's connections, so the art and the
 * line being said queued behind them (VoiceBank `BACKGROUND_SLOTS`), and boot
 * waited for all of core (BootScene). `__ww.state()`: `waits` (every Wait
 * screen), `voice.waits` (every line that came up before its clip was decoded).
 * Other casts' voice data: tests/unit/castVoice.test.ts. Many casts against any
 * server: tests/perf/castVoice.pw.ts.
 */

import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { test, expect } from '@playwright/test';

import { BATTLE_SPEED, SLOW, SPEED, boot, collectErrors, expectNoErrors, playEpisode, press, state, until, type WWState } from './harness';

/** A line is late past this, wall clock (Matt hears half a second). */
const LATE_MS = 500;
/** The Wait screen fades in after 150 ms of its scene's clock (WaitScene `SHOW_AFTER_MS`): one gone sooner was never seen. */
const shownWaits = (s: WWState, speed: number) => s.waits.filter((w) => w.ms < 0 || w.ms * (w.key === 'Battle' ? Math.max(speed, BATTLE_SPEED) : speed) > 150);
const lateLines = (s: WWState, ms: number) => s.voice.waits.filter((w) => w.outcome !== 'ready' || w.ms > ms);

test('Jasmine as the helper: a whole episode with real voice, no Wait screen and no late line', SLOW, async ({ page }) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page, { voice: true });
  await boot(page, '?ally=jasmine', SPEED, { voice: 'real' });
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  // She looks at the title a moment before her green, as she does: the bedroom's art loads meanwhile.
  await page.waitForTimeout(1500);
  await press(page, 'green');
  const { end } = await playEpisode(page);
  expect(end.episode.ally).toBe('jasmine');
  const s = await state(page);
  expect(shownWaits(s, SPEED)).toEqual([]);
  expect(lateLines(s, LATE_MS)).toEqual([]);
  expect(s.voice.history.some((id) => id.startsWith('nar_jasmine_'))).toBe(true);
  expectNoErrors(errors);
});

test('a slow server (300 ms a file): the title is up in seconds, lines start within a server answer or two', SLOW, async ({ browser }, info) => {
  test.setTimeout(120_000);
  const target = new URL(String(info.project.use.baseURL));
  const proxy = http.createServer((req, res) => {
    const slow = /^\/(voice-gen|art)\//.test(req.url ?? '');
    setTimeout(() => {
      const p = http.request({ host: target.hostname, port: target.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
        res.writeHead(r.statusCode ?? 502, r.headers);
        r.pipe(res);
      });
      p.on('error', () => res.writeHead(502).end());
      req.pipe(p);
    }, slow ? 300 : 0);
  });
  await new Promise<void>((resolve) => proxy.listen(0, resolve));
  const context = await browser.newContext({ baseURL: `http://localhost:${(proxy.address() as AddressInfo).port}`, viewport: { width: 1280, height: 720 } });
  try {
    const page = await context.newPage();
    const errors = collectErrors(page, { voice: true });
    const t0 = Date.now();
    await boot(page, '?ally=jasmine', SPEED, { voice: 'real' });
    await until(page, (s) => s.scene === 'Title', 60_000, 'title');
    // Measured: 17.6 s while boot waited for core's 293 clips, 3.7 s since.
    expect(Date.now() - t0).toBeLessThan(9000);
    await page.waitForTimeout(3000);
    await press(page, 'green');
    await until(page, (s) => s.scene === 'Bedroom', 60_000, 'bedroom');
    // Dad's wake-up, said while the episode's ~1,500 clips queue: each line asked ahead of them.
    await until(page, (s) => s.voice.history.filter((id) => id.startsWith('wake_')).length >= 3, 60_000, 'the wake-up said');
    const s = await state(page);
    expect(s.voice.waits.length).toBeGreaterThan(0);
    // Measured: 650-920 ms while the group's fetches held every connection, 310-580 ms since.
    expect(lateLines(s, 1500)).toEqual([]);
    expectNoErrors(errors);
  } finally {
    await context.close();
    proxy.close();
  }
});
