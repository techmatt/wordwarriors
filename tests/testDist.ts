/**
 * Where the suite's build goes (tests/vite.test.config.ts). Apart from that config so
 * tests/testBuild.ts can check its stamp without loading vite (item 105: a second or so).
 * `WW_TEST_DIST` gives a concurrent run in the same worktree a build of its own (item 085).
 */
export const TEST_DIST = process.env.WW_TEST_DIST ?? 'node_modules/.ww-test-dist';
