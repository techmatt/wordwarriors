/**
 * Dad lock (item 038): the backquote / tilde key (top-left, below Esc)
 * toggles it, anywhere in the game. While locked she can still walk, but no
 * press is processed: `Controls` drops every button edge except the
 * directions, and `TextEntry` drops letters, so nothing picks, reads,
 * advances, opens or fires. Timed re-prompts hold off too (RoomScene's idle
 * help, the battle's move-choice prompt). Pressing the key again unlocks and
 * play carries on where it was. Lines already playing finish.
 *
 * The badge is a DOM element over the canvas's bottom-left corner, so it
 * survives scene changes and never shows up as game text.
 */

export const dadLock = { locked: false };

let badge: HTMLElement | null = null;

export function setDadLock(on: boolean): void {
  dadLock.locked = on;
  if (on) showBadge();
  else badge?.remove();
}

function toggleDadLock(): void {
  setDadLock(!dadLock.locked);
}

/** Installed once, from main.ts. Capture phase, so the key reaches nothing else. */
export function installDadLock(): void {
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.code !== 'Backquote') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) toggleDadLock();
    },
    true,
  );
  // Phaser refits the canvas on its next frame, not on the event (item 080): place again after it.
  window.addEventListener('resize', () => {
    place();
    requestAnimationFrame(() => requestAnimationFrame(place));
  });
}

function showBadge(): void {
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'dad-lock';
    badge.textContent = '🔒 DAD LOCK';
    Object.assign(badge.style, {
      position: 'fixed',
      zIndex: '10',
      pointerEvents: 'none',
      padding: '4px 10px',
      borderRadius: '10px',
      background: 'rgba(20, 14, 40, 0.8)',
      border: '2px solid #ffd23f',
      color: '#ffd23f',
      font: 'bold 16px "Arial Black", sans-serif',
    } satisfies Partial<CSSStyleDeclaration>);
  }
  document.body.appendChild(badge);
  place();
}

/** The canvas is scaled to fit and centred: sit inside its bottom-left corner. */
function place(): void {
  if (!badge?.isConnected) return;
  const r = document.querySelector('#game canvas')?.getBoundingClientRect();
  badge.style.left = `${(r?.left ?? 0) + 8}px`;
  badge.style.bottom = `${window.innerHeight - (r?.bottom ?? window.innerHeight) + 8}px`;
}
