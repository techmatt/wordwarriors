/**
 * Boot timings (item 065): page load to the title, and to a quiet hub
 * (`?scene=house`: the hub shown, her input free, nobody talking), each from a
 * fresh browser context (an empty cache: the first load of the day). Prints
 * the median of `PERF_RUNS` runs (default 5) and the art the page fetched.
 * Clock speed `WW_SPEED` as in the suite (default 5): voice and the hub's
 * opening lines run at that speed, page loads and decoding in real time.
 */

import { test, type Browser } from '@playwright/test';

import { boot, state, until } from '../harness';

const RUNS = Number(process.env.PERF_RUNS ?? 5);

interface Run {
  shown: number;
  quiet: number;
  art: number;
  artKB: number;
}

async function once(browser: Browser, query: string, scene: string, quiet: boolean): Promise<Run> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  let art = 0;
  let artBytes = 0;
  page.on('response', (r) => {
    if (!/\/art\/[^/]+\.png/.test(r.url())) return;
    art++;
    // The size from the header: the game fetches art (item 065), and a fetch's body is not always readable here.
    void r.allHeaders().then((h) => (artBytes += Number(h['content-length'] ?? 0))).catch(() => undefined);
  });
  const t0 = Date.now();
  await boot(page, query);
  await until(page, (s) => s.scene === scene, 120_000, scene);
  const shown = Date.now() - t0;
  // Quiet: her input free and nobody talking, and still so 0.6 s later (the hub's opening lines start a beat in).
  let done = shown;
  const calm = (s: Awaited<ReturnType<typeof state>>) => s.scene === scene && Boolean(s.room) && !s.room!.locked && !s.voice.busy;
  while (quiet) {
    await until(page, calm, 120_000, `${scene} quiet`);
    done = Date.now() - t0;
    await page.waitForTimeout(600);
    if (calm(await state(page))) break;
  }
  await state(page);
  await context.close();
  return { shown, quiet: done, art, artKB: Math.round(artBytes / 1024) };
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

function line(what: string, runs: Run[]): string {
  return `${what}: shown ${(median(runs.map((r) => r.shown)) / 1000).toFixed(2)} s, quiet ${(median(runs.map((r) => r.quiet)) / 1000).toFixed(2)} s (median of ${runs.length}; each ${runs.map((r) => (r.quiet / 1000).toFixed(2)).join(' ')}), art ${median(runs.map((r) => r.art))} files ${(median(runs.map((r) => r.artKB)) / 1024).toFixed(1)} MB`;
}

test('boot to the title and to a quiet hub', async ({ browser }) => {
  const title: Run[] = [];
  const hub: Run[] = [];
  // One warm-up first: vite transforms the modules on the first load of a server's life.
  await once(browser, '', 'Title', false);
  for (let i = 0; i < RUNS; i++) title.push(await once(browser, '', 'Title', false));
  for (let i = 0; i < RUNS; i++) hub.push(await once(browser, '?scene=house', 'Hub', true));
  console.log(line('title', title));
  console.log(line('hub', hub));
});
