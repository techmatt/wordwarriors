/**
 * Minigame debug mode's key (item 086, src/episode/debug.ts): key 0 (or
 * numpad 0) toggles it in a game room, in real play as in dev builds. Like
 * dad lock it is a capture-phase window listener, so dad lock never blocks
 * it; it is consumed only where it did something.
 *
 * While debug is on a small DEBUG tag sits in the canvas's top-left corner (the
 * dad-lock badge has the bottom-left, Dad's cue the bottom-right). It is a DOM
 * element like theirs: for Matt, never game text.
 */

import { onDebugChange } from '../episode/debug';

let tag: HTMLElement | null = null;

/** Installed once, from main.ts; `toggle` answers whether the press meant anything here. */
export function installDebugKey(toggle: () => boolean): void {
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.code !== 'Digit0' && e.code !== 'Numpad0') return;
      if (e.repeat || !toggle()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );
  onDebugChange(showTag);
  // Phaser refits the canvas on its next frame, not on the event (item 080): place again after it.
  window.addEventListener('resize', () => {
    place();
    requestAnimationFrame(() => requestAnimationFrame(place));
  });
}

function showTag(on: boolean): void {
  if (!on) {
    tag?.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('div');
    tag.id = 'debug-tag';
    tag.textContent = 'DEBUG';
    Object.assign(tag.style, {
      position: 'fixed',
      zIndex: '10',
      pointerEvents: 'none',
      padding: '2px 8px',
      borderRadius: '8px',
      background: 'rgba(20, 14, 40, 0.8)',
      border: '2px solid #ff3d7a',
      color: '#ff3d7a',
      font: 'bold 13px "Arial Black", sans-serif',
    } satisfies Partial<CSSStyleDeclaration>);
  }
  document.body.appendChild(tag);
  place();
}

/** The canvas is scaled to fit and centred: sit inside its top-left corner. */
function place(): void {
  if (!tag?.isConnected) return;
  const r = document.querySelector('#game canvas')?.getBoundingClientRect();
  tag.style.left = `${(r?.left ?? 0) + 8}px`;
  tag.style.top = `${(r?.top ?? 0) + 8}px`;
}
