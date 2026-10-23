/**
 * The dev server with file watching and hot reload off (item 039, the checker's server
 * until item 092 gave it a build): the boot timings and the screenshots serve from it
 * (tests/perf/perf.config.ts, tests/shots/shots.config.ts), and the checker under
 * `QA_DEV_SERVER=1`. Editing `src/` while a long run goes neither reloads the page under
 * it nor mixes old and new code in one: a run tests the code as it was when its server
 * started.
 */

import { defineConfig, mergeConfig } from 'vite';

import base from '../vite.config';

export default mergeConfig(
  base,
  defineConfig({
    server: { watch: null, hmr: false },
  }),
);
