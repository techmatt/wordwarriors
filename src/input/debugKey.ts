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

import { FONT_HEAVY } from '../config';
import { onDebugChange } from '../episode/debug';
import { CornerTag } from '../ui/cornerTag';

const tag = new CornerTag(
  'debug-tag',
  'top-left',
  {
    padding: '2px 8px',
    borderRadius: '8px',
    background: 'rgba(20, 14, 40, 0.8)',
    border: '2px solid #ff3d7a',
    color: '#ff3d7a',
    font: `bold 13px ${FONT_HEAVY}`,
  },
  'DEBUG',
);

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
  onDebugChange((on) => (on ? tag.show() : tag.hide()));
}
