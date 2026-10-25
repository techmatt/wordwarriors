/**
 * The dev server's port, decided once.
 *
 * Read by vite (serve and preview) and by Playwright. 5174 rather than vite's
 * default 5173 because Seraphina's Secret owns 5173 on this machine, and with
 * `reuseExistingServer` a shared port means testing the wrong game. Kept in its
 * own dependency-free file so the Node-side configs can import it.
 */
export const PORT = 5174;

/**
 * The port Playwright serves the game on for its own run. Not PORT: a dev server
 * on 5174 from the main checkout (Matt's `game` run target) would otherwise be
 * reused by a test run in a worktree, testing the main branch's code.
 */
export const TEST_PORT = 5184;

/**
 * The side tools' own ports, each apart from the dev server, the suite and one another
 * (README, *Ports and servers*): screenshots (`SHOTS_PORT` overrides), the bug-hunt checker
 * (`QA_PORT`) and the boot timings (`PERF_PORT`). None falls back to `CONDUCTOR_PORT`: the
 * suite serves there in a conductor item, so a tool beside a test run passes its own.
 */
export const SHOTS_PORT = 5194;
export const QA_PORT = 5195;
export const PERF_PORT = 5196;
