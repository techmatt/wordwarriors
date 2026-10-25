/**
 * Item 150: a whole episode with real voice for a cast (`PROBE_CAST`, default
 * `ally=jasmine`), from a fresh browser context, printing every Wait screen and
 * every line that came up before its clip was decoded (`__ww.state().waits`,
 * `voice.waits`), with the voice and art fetches' timings. Not a test: it
 * reports, it asserts nothing (tests/castVoice.spec.ts is the check).
 *
 *   npx playwright test -c tests/perf/castVoice.config.ts
 */

import { test } from '@playwright/test';

import { boot, collectErrors, playEpisode, press, state, until } from '../harness';

/** Space-separated casts, a test each: `PROBE_CAST='?ally=jasmine ?villain=jasmine'`. */
const CASTS = (process.env.PROBE_CAST ?? '?ally=jasmine').split(/\s+/).filter(Boolean);
/** Only the start of the episode (boot to the first room), for a sweep of many casts. */
const SHORT = process.env.PROBE_SHORT === '1';

for (const CAST of CASTS) test(`cast voice probe: ${CAST}`, async ({ page }) => {
  const errors = collectErrors(page, { voice: true });
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (/^(voice|art):/.test(m.text())) warnings.push(m.text());
  });
  const fetches: { kind: string; ms: number; status: number; url: string }[] = [];
  const started = new Map<object, number>();
  page.on('request', (r) => started.set(r, Date.now()));
  page.on('requestfinished', (r) => {
    const kind = r.url().includes('/voice-gen/') ? 'voice' : r.url().includes('/art/') ? 'art' : '';
    if (!kind) return;
    void r.response().then((res) => fetches.push({ kind, ms: Date.now() - (started.get(r) ?? Date.now()), status: res?.status() ?? 0, url: r.url() }));
  });
  page.on('requestfailed', (r) => warnings.push(`requestfailed ${r.url()} ${r.failure()?.errorText}`));
  // An older build has no `waits` hooks (Matt's own server): the Wait scene is also caught by polling.
  const seen: { at: number; scene: string }[] = [];
  let polling = true;
  const poll = async () => {
    while (polling) {
      const scene = await page.evaluate(() => (window as unknown as { __ww?: { state(): { scene: string } } }).__ww?.state().scene ?? '').catch(() => '');
      if (scene === 'Wait' && seen.at(-1)?.scene !== 'Wait') seen.push({ at: Date.now() - t0, scene });
      if (scene !== 'Wait' && seen.at(-1)?.scene === 'Wait') seen.push({ at: Date.now() - t0, scene });
      await page.waitForTimeout(100).catch(() => undefined);
    }
  };
  const t0 = Date.now();
  // A failed step stops the polling too, or it spins once the page is gone.
  page.on('close', () => (polling = false));
  await boot(page, CAST, undefined, { voice: 'real' });
  const polled = poll();
  await until(page, (s) => s.scene === 'Title', 180_000, 'title');
  const title = Date.now() - t0;
  await page.waitForTimeout(100);
  await press(page, 'green');
  let times = {};
  if (SHORT) await until(page, (s) => s.scene === 'Bedroom', 60_000, 'bedroom');
  else times = (await playEpisode(page)).times;
  const s = await state(page);
  polling = false;
  await polled;
  const pct = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))] : 0);
  const of = (k: string) => fetches.filter((f) => f.kind === k).map((f) => f.ms);
  const report = {
    cast: CAST,
    who: { hero: s.episode.hero, ally: s.episode.ally, villain: s.episode.villain },
    titleMs: title,
    times,
    waitScreens: s.waits ?? null,
    waitPolled: seen,
    lineWaits: s.voice.waits ?? null,
    lateLines: (s.voice.waits ?? []).filter((w) => w.outcome !== 'ready' || w.ms > 250),
    voiceFetch: { n: of('voice').length, p95: pct(of('voice'), 0.95), max: Math.max(0, ...of('voice')), bad: fetches.filter((f) => f.kind === 'voice' && f.status >= 400).length },
    artFetch: { n: of('art').length, p95: pct(of('art'), 0.95), max: Math.max(0, ...of('art')), bad: fetches.filter((f) => f.kind === 'art' && f.status >= 400).length },
    warnings: warnings.slice(0, 40),
    errors: errors.slice(0, 20),
  };
  console.log(`PROBE ${JSON.stringify(report)}`);
});
