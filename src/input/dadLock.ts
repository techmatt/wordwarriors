/**
 * Dad lock (item 038): the backquote / tilde key (top-left, below Esc)
 * toggles it, anywhere in the game. While locked she can still walk, but no
 * press is processed: `Controls` drops every button edge except the
 * directions, and `TextEntry` drops letters, so nothing picks, reads,
 * advances, opens or fires. Timed re-prompts hold off too (RoomScene's idle
 * help, the battle's move-choice prompt). Pressing the key again unlocks and
 * play carries on where it was. Lines already playing finish.
 *
 * The badge is a DOM element over the canvas's bottom-left corner (a
 * `CornerTag`, src/ui/cornerTag.ts), so it
 * survives scene changes and never shows up as game text.
 */

import { FONT_HEAVY } from '../config';
import { CornerTag } from '../ui/cornerTag';

export const dadLock = { locked: false };

const badge = new CornerTag(
  'dad-lock',
  'bottom-left',
  {
    padding: '4px 10px',
    borderRadius: '10px',
    background: 'rgba(20, 14, 40, 0.8)',
    border: '2px solid #ffd23f',
    color: '#ffd23f',
    font: `bold 16px ${FONT_HEAVY}`,
  },
  // The padlock alone (item 126): DAD and LOCK are bank words, and the badge shows before she reads them.
  '🔒',
);

export function setDadLock(on: boolean): void {
  dadLock.locked = on;
  if (on) badge.show();
  else badge.hide();
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
}
