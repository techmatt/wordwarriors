/**
 * The dev server's port, decided once.
 *
 * Read by vite (serve and preview) and by Playwright. 5174 rather than vite's
 * default 5173 because Seraphina's Secret owns 5173 on this machine, and with
 * `reuseExistingServer` a shared port means testing the wrong game. Kept in its
 * own dependency-free file so the Node-side configs can import it.
 */
export const PORT = 5174;
