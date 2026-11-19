/**
 * The save file, page side (item 186). When the dev server keeps one (src/state/saveFileServer.ts says so
 * with `window.__wwSaveFile`), boot asks for it before the game starts: a newer file replaces this
 * browser's copy (which is kept beside the file first), a newer browser copy goes to the file. After that
 * every write the store makes is sent on, one at a time, the latest winning. Nothing here can stop the game
 * booting: a failed or slow fetch boots from what the browser has.
 *
 * A stale tab (Matt, 2026-11-17, item 194: docs/rulings.md): every save names the file's stamp this tab's copy
 * builds on (`base`), so the server refuses it (409) once another tab has saved since, however new its own
 * stamp. Refused, the tab switches to the file at once and plays on from it; its own copy is kept aside, as
 * at boot.
 */

import { progress } from './progress';
import { STORE_KEY } from './ProgressStore';
import { chooseProgress, staleReplaced } from './saveFile';

const URL = '/__ww/progress';
/** `BASE_HEADER` in src/state/saveFileServer.ts (Node only, so not imported here). */
const BASE_HEADER = 'X-WW-Base';
/** How long boot waits for the dev server's answer. */
const BOOT_WAIT_MS = 1500;

declare global {
  interface Window {
    __wwSaveFile?: boolean;
  }
}

let sending = false;
let pending: string | null = null;
/**
 * The file's stamp this tab's copy builds on: the file at boot, then each save it took, or another tab's on this
 * origin. Null while unknown (boot never heard the server): saves then go without one, judged by their own stamp.
 */
let base: number | null = null;

function stampOf(raw: string | null): number {
  if (!raw) return 0;
  try {
    return (JSON.parse(raw) as { savedAt?: number }).savedAt ?? 0;
  } catch {
    return 0;
  }
}

function send(raw: string): void {
  pending = raw;
  if (sending) return;
  sending = true;
  const next = pending;
  pending = null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(base === null ? {} : { [BASE_HEADER]: String(base) }) };
  void fetch(URL, { method: 'PUT', body: next, headers, keepalive: next.length < 60_000 })
    .then(async (res) => {
      if (res.ok && base !== null) base = Math.max(base, stampOf(next));
      // Refused: another tab has saved since this one's copy was taken. Saves made meanwhile wait in `pending`
      // (`sending` holds them) and go with the switch: they built on the stale copy, which is kept aside.
      if (res.status === 409 && (await switchToFile())) pending = null;
    })
    .catch(() => undefined)
    .finally(() => {
      sending = false;
      if (pending !== null) send(pending);
    });
}

const REPLACED_PREFIX = `${STORE_KEY}.replaced.`;

/** Drop this browser's replaced copies but the newest `keep` (`staleReplaced`). */
function pruneReplaced(keep: number): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i) ?? '');
    for (const k of staleReplaced(keys, REPLACED_PREFIX, keep)) localStorage.removeItem(k);
  } catch {
    // Blocked storage: nothing kept here to prune.
  }
}

/** Keep this browser's copy beside the file and in this browser (nothing dropped unseen), then play from `file`. */
async function adoptFile(file: string, local: string | null): Promise<boolean> {
  // In one step with reading `local` (no await between): a save made meanwhile would be in neither copy.
  if (local) {
    const key = `${REPLACED_PREFIX}${Date.now()}`;
    try {
      localStorage.setItem(key, local);
    } catch {
      // Storage full: make room and try once more; failing that, the copy beside the file is the one kept.
      pruneReplaced(0);
      try {
        localStorage.setItem(key, local);
      } catch {
        // Still full.
      }
    }
    pruneReplaced(1); // Only the latest stays.
  }
  const took = progress.replace(file);
  if (took) base = stampOf(file);
  if (local) await timed(`${URL}/aside?origin=${encodeURIComponent(location.host)}`, { method: 'POST', body: local }).catch(() => undefined);
  return took;
}

/** A save refused as stale: fetch the file and switch to it, this tab's latest copy kept aside. False (the tab as it was) when the file cannot be had. */
async function switchToFile(): Promise<boolean> {
  const res = await timed(URL);
  const file = res.ok ? await res.text() : null;
  if (!file) return false;
  let local: string | null = null;
  try {
    local = localStorage.getItem(STORE_KEY);
  } catch {
    // Blocked storage: the latest save this tab tried is the copy kept.
  }
  return adoptFile(file, local ?? pending);
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
  pruneReplaced(1); // Copies piled up before item 196.
  // Another tab on this origin saved (src/state/progress.ts re-reads it): that save went to the file too, so
  // this tab's copy builds on it now. From the start: one during boot's wait counts as well.
  let seen = 0;
  window.addEventListener('storage', (e) => {
    if (e.key !== STORE_KEY) return;
    seen = Math.max(seen, stampOf(e.newValue));
    if (base !== null) base = Math.max(base, seen);
  });
  try {
    let local: string | null = null;
    try {
      local = localStorage.getItem(STORE_KEY);
    } catch {
      // Blocked storage: the file still restores into this page's store.
    }
    const res = await timed(URL);
    const file = res.ok ? await res.text() : null;
    if (res.ok || res.status === 404) base = Math.max(stampOf(file), seen);
    const pick = chooseProgress(local, file);
    if (pick === 'file' && file) {
      await adoptFile(file, local);
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
