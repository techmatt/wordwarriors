/**
 * Playwright config for the boot timings (item 065, `tests/perf/*.pw.ts`; the
 * `.pw.ts` name keeps it out of the suite). One worker, so nothing shares the
 * machine with what is being timed. Port: `PERF_PORT`, else `CONDUCTOR_PORT`, else 5196.
 *
 * It times the production build, as the suite and the bug-hunt checker serve (item 133;
 * `tests/testBuild.ts`, skipped when nothing it is built from changed, into its own folder
 * so a test run or a sweep beside it keeps its own): a build is what Julia plays, and the
 * dev server's first boots timed its module transforms, not the game.
 * `PERF_DEV_SERVER=1` times the dev server instead (`tests/vite.nowatch.config.ts`);
 * `PERF_DIST=<dir>` builds into another folder (default `node_modules/.ww-perf-dist`).
 *
 *   npm run perf
 */

import { defineConfig } from '@playwright/test';

import { gpuProjects } from '../gpu';
import { buildServerCommand, devServerCommand } from '../servers';

const PORT = Number(process.env.PERF_PORT ?? process.env.CONDUCTOR_PORT ?? 5196);

export default defineConfig({
  testDir: '.',
  testMatch: '*.pw.ts',
  outputDir: '../../test-results/perf',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 600_000,
  use: { baseURL: `http://localhost:${PORT}` },
  projects: gpuProjects(),
  webServer: {
    command: process.env.PERF_DEV_SERVER ? devServerCommand(PORT) : buildServerCommand(PORT),
    cwd: '../..',
    env: { WW_TEST_DIST: process.env.PERF_DIST ?? 'node_modules/.ww-perf-dist' },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
