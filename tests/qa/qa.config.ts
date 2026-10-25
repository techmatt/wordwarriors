/**
 * Playwright config for the bug-hunt checker (item 039, `tests/qa/*.pw.ts`;
 * the `.pw.ts` name keeps it out of the suite). Its own port, 5195, so it
 * never meets the dev server, a test run or the screenshot tools.
 * The GPU draws, as in the suite (`WW_GPU=0` for software GL).
 *
 * It serves a production build, as the suite does (item 092; tests/vite.test.config.ts,
 * built into its own folder so a test run in the same worktree keeps its own): the dev
 * server spent its first minutes scanning the tree (the voice and art junctions too),
 * every scenario of a sweep timed out at boot behind it, and voice fetches took 4 to 9 s
 * each after. A build is also what Julia plays. `QA_DEV_SERVER=1` serves the dev server
 * instead (`tests/vite.nowatch.config.ts`: no watching, no hot reload). Either way edits during a
 * sweep wait for the next one. The build is the suite's (`tests/testBuild.ts`, item 122):
 * skipped when its stamp says nothing it is built from changed since the last sweep
 * (`WW_REBUILD=1` builds anyway), and node runs the tools directly, not `npx`.
 */

import { defineConfig } from '@playwright/test';

import { QA_PORT } from '../../src/port';
import { gpuProjects } from '../gpu';
import { buildServerCommand, devServerCommand } from '../servers';

// QA_PORT: a second run beside a sweep (a `QA_LOOK` at one scene) needs its own.
const PORT = Number(process.env.QA_PORT ?? QA_PORT);
/**
 * The checker's build, apart from the suite's (`WW_TEST_DIST`, tests/vite.test.config.ts).
 * `QA_DIST=<dir>` with its own `QA_PORT` runs a second sweep beside a long one (hunt 7: a
 * second build into the same folder would swap the files under the first sweep's pages).
 */
const QA_DIST = process.env.QA_DIST ?? 'node_modules/.ww-qa-dist';

export default defineConfig({
  testDir: '.',
  testMatch: '*.pw.ts',
  // Per tag: a second sweep's start empties its output folder, which took a running sweep's trace with it (hunt 7).
  outputDir: `../../test-results/qa${process.env.QA_TAG ? `-${process.env.QA_TAG}` : ''}`,
  // Keeps the last three hunts' runs in the scratch home and deletes the rest (item 149, `prune.ts`; `QA_PRUNE=0` skips it).
  globalSetup: './prune.ts',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  // One scenario is one or more whole episodes.
  timeout: 1_800_000,
  use: { baseURL: `http://localhost:${PORT}` },
  projects: gpuProjects({ args: ['--enable-precise-memory-info'] }),
  webServer: {
    command: process.env.QA_DEV_SERVER ? devServerCommand(PORT) : buildServerCommand(PORT),
    cwd: '../..',
    env: { WW_TEST_DIST: QA_DIST },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
