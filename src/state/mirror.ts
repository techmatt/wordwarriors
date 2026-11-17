/**
 * The save file, page side (item 186). When the dev server keeps one (src/state/saveFileServer.ts says so
 * with `window.__wwSaveFile`), boot asks for it before the game starts: a newer file replaces this
 * browser's copy (which is kept beside the file first), a newer browser copy goes to the file. After that
 * every write the store makes is sent on, one at a time, the latest winning. Nothing here can stop the game
 * booting: a failed or slow fetch boots from what the browser has.
 */

import { progress } from './progress';
import { STORE_KEY } from './ProgressStore';
import { chooseProgress } from './saveFile';

const URL = '/__ww/progress';
/** How long boot waits for the dev server's answer. */
const BOOT_WAIT_MS = 1500;

declare global {
  interface Window {
    __wwSaveFile?: boolean;
  }
}

let sending = false;
let pending: string | null = null;

function send(raw: string): void {
  pending = raw;
  if (sending) return;
  sending = true;
  const next = pending;
  pending = null;
  void fetch(URL, { method: 'PUT', body: next, headers: { 'Content-Type': 'application/json' }, keepalive: next.length < 60_000 })
    .catch(() => undefined)
    .finally(() => {
      sending = false;
      if (pending !== null) send(pending);
    });
}

async function timed(input: string, init?: RequestInit): Promise<Response> {
  const ctl = new AbortController();
  const t = window.setTimeout(() => ctl.abort(), BOOT_WAIT_MS);
  try {
    return await fetch(input, { ...init, signal: ctl.signal });
  } finally {
    window.clearTimeout(t);
  }
}

/** Bring the browser's copy and the save file level, then mirror every write. Resolves at once when there is no file. */
export async function syncSaveFile(): Promise<void> {
  if (!import.meta.env.DEV || typeof window === 'undefined' || !window.__wwSaveFile) return;
  try {
    let local: string | null = null;
    try {
      local = localStorage.getItem(STORE_KEY);
    } catch {
      // Blocked storage: the file still restores into this page's store.
    }
    const res = await timed(URL);
    const file = res.ok ? await res.text() : null;
    const pick = chooseProgress(local, file);
    if (pick === 'file' && file) {
      if (local) await timed(`${URL}/aside?origin=${encodeURIComponent(location.host)}`, { method: 'POST', body: local }).catch(() => undefined);
      try {
        if (local) localStorage.setItem(`${STORE_KEY}.replaced.${Date.now()}`, local);
      } catch {
        // Storage full: the copy beside the file is the one kept.
      }
      progress.replace(file);
    } else if (pick === 'local' && local) {
      // Stamped now: a copy from before item 186 has no `savedAt`, and the server keeps the later save.
      const stamped = JSON.stringify({ ...(JSON.parse(local) as object), savedAt: Date.now() });
      try {
        localStorage.setItem(STORE_KEY, stamped);
      } catch {
        // Blocked storage: the file still gets it.
      }
      send(stamped);
    }
  } catch {
    // The dev server went away mid-boot: play from the browser's copy.
  }
  progress.onWrite = send;
}
