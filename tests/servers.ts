/**
 * The server commands the Playwright configs start (the suite, the bug-hunt checker, the
 * boot timings, the screenshots), each kept once here. Node runs the tools directly: each
 * `npx` cost about 2 s, `node` 0.2-0.4 s (item 105). Both configs below merge vite.config.ts,
 * whose `strictPort` makes a busy port fail loudly, so no command repeats `--strictPort`.
 */

/**
 * A production build served by `vite preview` (item 079, tests/vite.test.config.ts): the
 * build is skipped when its inputs are unchanged (tests/testBuild.ts, item 105).
 */
export function buildServerCommand(port: number): string {
  return `node --import tsx tests/testBuild.ts && node node_modules/vite/bin/vite.js preview -c tests/vite.test.config.ts --port ${port}`;
}

/** The dev server without file watching or hot reload (tests/vite.nowatch.config.ts, item 039). */
export function devServerCommand(port: number): string {
  return `node node_modules/vite/bin/vite.js --config tests/vite.nowatch.config.ts --port ${port}`;
}
